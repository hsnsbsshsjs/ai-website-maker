export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    /*
     * CORS
     */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    /*
     * =====================================================
     * PUBLISHED WEBSITE
     *
     * Example:
     * https://your-worker.workers.dev/site/cyrus-cuts
     * =====================================================
     */

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/site/")
    ) {

      const slug = decodeURIComponent(
        url.pathname.replace("/site/", "")
      );

      if (!slug) {
        return new Response(
          "Website not found.",
          {
            status: 404,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      }

      try {

        const website = await env.SITES.get(slug);

        if (!website) {
          return new Response(
            "<h1>Website not found</h1><p>This website does not exist or has not been published.</p>",
            {
              status: 404,
              headers: {
                "Content-Type": "text/html; charset=UTF-8"
              }
            }
          );
        }

        return new Response(website, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "public, max-age=60"
          }
        });

      } catch (error) {

        console.error("SITE ERROR:", error);

        return new Response(
          "Unable to load website.",
          {
            status: 500,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      }
    }


    /*
     * =====================================================
     * PUBLISH WEBSITE
     *
     * POST /publish
     *
     * Body:
     * {
     *   "slug": "cyrus-cuts",
     *   "website": "<!DOCTYPE html>..."
     * }
     * =====================================================
     */

    if (
      request.method === "POST" &&
      url.pathname === "/publish"
    ) {

      try {

        const body = await request.json();

        const website = body.website || "";
        let slug = body.slug || "";

        if (!website) {
          return json({
            success: false,
            error: "No website was provided."
          }, 400);
        }

        /*
         * Create a slug if the user didn't provide one.
         */

        if (!slug) {

          slug =
            "site-" +
            crypto.randomUUID()
              .replace(/-/g, "")
              .substring(0, 8);

        }

        /*
         * Clean the slug.
         */

        slug = slug
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        if (!slug) {

          return json({
            success: false,
            error: "Invalid website name."
          }, 400);

        }

        /*
         * Limit slug length.
         */

        slug = slug.substring(0, 50);

        /*
         * Save website to KV.
         */

        await env.SITES.put(
          slug,
          website
        );

        /*
         * Build public URL.
         */

        const publicUrl =
          `${url.origin}/site/${encodeURIComponent(slug)}`;

        return json({
          success: true,
          slug: slug,
          url: publicUrl,
          message: "Website published successfully."
        });

      }

      catch (error) {

        console.error("PUBLISH ERROR:", error);

        return json({
          success: false,
          error:
            error.message ||
            "Website publishing failed."
        }, 500);
      }
    }


    /*
     * =====================================================
     * AI GENERATION / EDITING
     * =====================================================
     */

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
       * =====================================================
       * CREATE MODE
       * =====================================================
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
- Use professional typography.
- Include clear sections appropriate for the business.
- Make buttons and navigation visually attractive.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT explain anything.
- Do NOT say that you are an AI.
- Return ONLY HTML.

USER REQUEST:
${prompt}
`;

      }


      /*
       * =====================================================
       * EDIT MODE
       * =====================================================
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


      /*
       * =====================================================
       * CALL CLOUDFLARE WORKERS AI
       * =====================================================
       */

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
       * =====================================================
       * EXTRACT AI RESPONSE
       * =====================================================
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


      if (
        !website &&
        result &&
        result.response
      ) {

        website = result.response;

      }


      if (
        !website &&
        result &&
        result.output_text
      ) {

        website = result.output_text;

      }


      if (typeof website !== "string") {

        website =
          JSON.stringify(website);

      }


      /*
       * =====================================================
       * REMOVE MARKDOWN CODE FENCES
       * =====================================================
       */

      website = website
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


      /*
       * =====================================================
       * CHECK RESULT
       * =====================================================
       */

      if (
        !website ||
        website.length < 50
      ) {

        return json({
          success: false,
          error: "AI returned an empty website."
        }, 500);

      }


      /*
       * =====================================================
       * RETURN GENERATED WEBSITE
       * =====================================================
       */

      return json({
        success: true,
        website: website
      });

    }


    catch (error) {

      console.error(
        "AI ERROR:",
        error
      );

      return json({
        success: false,
        error:
          error.message ||
          "Website generation failed."
      }, 500);

    }


    /*
     * =====================================================
     * JSON RESPONSE HELPER
     * =====================================================
     */

    function json(
      data,
      status = 200
    ) {

      return new Response(
        JSON.stringify(data),
        {
          status: status,
          headers: {
            "Content-Type":
              "application/json",
            ...corsHeaders
          }
        }
      );

    }

  }
};
