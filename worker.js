export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please use POST."
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    try {

      const body = await request.json();
      const userPrompt = body.prompt;

      if (!userPrompt) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No website prompt was provided."
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      const systemPrompt = `
You are WebCraft AI, an expert website designer and developer.

Create a complete website based on the user's request.

RULES:
- Return ONLY the complete HTML.
- Start with <!DOCTYPE html>
- Include all CSS inside <style>.
- Include JavaScript inside <script>.
- Make the website responsive on phones and computers.
- Make navigation buttons functional.
- Use beautiful modern design.
- Include realistic content.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT explain anything.

USER REQUEST:
${userPrompt}
`;

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          max_tokens: 6000,
          temperature: 0.7
        }
      );

      console.log("FULL AI RESULT:", JSON.stringify(result));

      // Handle different Workers AI response formats
      let website = "";

      if (
        result &&
        result.choices &&
        result.choices[0] &&
        result.choices[0].message
      ) {
        website = result.choices[0].message.content || "";
      }

      if (!website && result && result.response) {
        website = result.response;
      }

      if (!website && result && result.output_text) {
        website = result.output_text;
      }

      if (typeof website !== "string") {
        website = JSON.stringify(website);
      }

      // Remove Markdown code fences if the AI added them
      website = website
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      console.log("GENERATED WEBSITE LENGTH:", website.length);

      if (!website || website.length < 50) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AI returned an empty website.",
            debug: result
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          website: website
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    } catch (error) {

      console.error("AI ERROR:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Website generation failed."
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  }
};
