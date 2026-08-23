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
      return json({
        success: false,
        error: "Please use POST."
      }, 405);
    }

    try {

      const body = await request.json();

      const mode = body.mode || "create";
      const prompt = body.prompt || "";
      const existingWebsite = body.website || "";

      if (!prompt) {
        return json({
          success: false,
          error: "Please provide a prompt."
        }, 400);
      }

      let systemPrompt;

      /*
       * CREATE MODE
       */
      if (mode === "create") {

        systemPrompt = `
You are WebCraft AI, an expert website designer and developer.

Create a complete, beautiful, responsive website based on the user's request.

RULES:

- Return ONLY the complete HTML.
- Start with <!DOCTYPE html>.
- Include CSS inside <style>.
- Include JavaScript inside <script> when useful.
- Make the website responsive on phones and computers.
- Make navigation and buttons functional where possible.
- Use beautiful modern design.
- Include realistic content.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT explain anything.

USER REQUEST:
${prompt}
`;

      }

      /*
       * EDIT MODE
       */
      else if (mode === "edit") {

        if (!existingWebsite) {
          return json({
            success: false,
            error: "No existing website was provided."
          }, 400);
        }

        systemPrompt = `
You are WebCraft AI, an expert website editor.

The user already has a website.

Modify the existing website according to the user's instructions.

IMPORTANT RULES:

- Return the COMPLETE modified HTML.
- Do not return only the changed section.
- Start with <!DOCTYPE html>.
- Preserve existing features unless the user asks to remove them.
- Preserve existing content unless the user asks to change it.
- Make the requested changes accurately.
- Keep the website responsive.
- Keep the design professional.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT explain anything.
- Return ONLY HTML.

USER'S REQUEST:
${prompt}

EXISTING WEBSITE:
${existingWebsite}
`;

      }

      else {

        return json({
          success: false,
          error: "Unknown mode."
        }, 400);

      }


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
              content: prompt
            }
          ],
          max_tokens: 8000,
          temperature: 0.6
        }
      );


      /*
       * Extract AI response
       */

      let website = "";

      if (
        result &&
        result.choices &&
        result.choices[0] &&
        result.choices[0].message
      ) {
        website =
          result.choices[0].message.content || "";
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


      /*
       * Remove accidental Markdown
       */

      website = website
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


      if (!website || website.length < 50) {

        return json({
          success: false,
          error: "AI returned an empty website."
        }, 500);

      }


      return json({
        success: true,
        website: website
      });

    }

    catch (error) {

      console.error("AI ERROR:", error);

      return json({
        success: false,
        error: error.message ||
          "Website generation failed."
      }, 500);

    }


    function json(data, status = 200) {

      return new Response(
        JSON.stringify(data),
        {
          status: status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    }
  }
};
