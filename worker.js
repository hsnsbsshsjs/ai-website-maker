export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // Allow the browser to communicate with the Worker
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Only accept POST requests
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
            error: "Please describe the website you want."
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

- Return ONLY the complete HTML document.
- Start with <!DOCTYPE html>.
- Include CSS inside a <style> tag.
- Include JavaScript inside a <script> tag when useful.
- Make the website responsive on phones, tablets and computers.
- Make the design modern and professional.
- Use attractive typography, spacing, colors, buttons and sections.
- Create realistic content based on the user's request.
- Include navigation when appropriate.
- Include a hero section when appropriate.
- Include appropriate sections such as About, Services,
  Features, Gallery, Pricing and Contact when appropriate.
- Make buttons functional when possible.
- Do not explain the code.
- Do not use Markdown.
- Do not use code fences.
- Return ONLY HTML.

USER REQUEST:
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

      let website = result.response || "";

      // Remove accidental Markdown code fences
      website = website
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

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

      console.error(error);

      return new Response(
        JSON.stringify({
          success: false,
          error: "AI generation failed."
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
