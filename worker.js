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

      if (!userPrompt || typeof userPrompt !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Please provide a website description."
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

Create a complete, beautiful, responsive website based on the user's request.

IMPORTANT:
- Return ONLY HTML.
- Start with <!DOCTYPE html>.
- Include CSS inside <style>.
- Include JavaScript inside <script> when useful.
- Make it mobile responsive.
- Make navigation and buttons functional where possible.
- Include realistic content.
- Do not use Markdown.
- Do not use code fences.
- Do not explain anything.

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

      console.log("AI RESULT:", JSON.stringify(result));

      let website = result.response || "";

      if (typeof website !== "string") {
        website = JSON.stringify(website);
      }

      website = website
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      if (!website || website.length < 50) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AI returned an empty website."
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
          error: error.message || "AI generation failed."
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
