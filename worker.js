export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // Serve published site
    if (path.startsWith("/site/")) {
      const slug = path.replace("/site/", "").replace(/\/$/, "");
      if (!slug) return new Response("Not found", { status: 404 });
      const html = await env.SITES.get(slug);
      if (!html) return new Response("Site not found", { status: 404 });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...cors },
      });
    }

    // Publish endpoint
    if (path === "/publish") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: cors });
      }
      try {
        const { slug, website } = await request.json();
        if (!slug || !website) {
          return jsonResponse({ success: false, error: "Missing slug or website" }, 400, cors);
        }
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (!cleanSlug || cleanSlug.length < 2) {
          return jsonResponse({ success: false, error: "Invalid slug" }, 400, cors);
        }
        await env.SITES.put(cleanSlug, website);
        return jsonResponse({ success: true, slug: cleanSlug }, 200, cors);
      } catch (e) {
        return jsonResponse({ success: false, error: e.message }, 500, cors);
      }
    }

    // Generate / Edit
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    try {
      const body = await request.json();
      const { mode, prompt, website } = body;

      const systemPrompt = `You are an expert web developer creating COMPLETE, beautiful, responsive single-page websites.

STRICT RULES:
1. Output ONLY raw HTML. NO markdown code blocks. NO \`\`\`html. NO explanations before or after.
2. The HTML MUST be complete with: <!DOCTYPE html>, <html>, <head>, <body>.
3. Include ALL sections the user requests. Do not skip any.
4. Use inline CSS in <style> tags. No external CSS files.
5. For images use: https://picsum.photos/seed/{word}/800/600 (replace {word} with relevant keyword)
6. Use modern professional design with good spacing, colors, and fonts.
7. Make it mobile-responsive with @media queries.
8. NEVER use height:100vh on html or body. Use min-height instead.
9. Include navigation, hero section, and footer at minimum.
10. Return ONLY the HTML code. Nothing else.`;

      let userPrompt;
      if (mode === "edit" && website) {
        userPrompt = `Current website HTML:\n\n${website}\n\nUser wants: ${prompt}\n\nReturn the COMPLETE updated HTML following all rules above.`;
      } else {
        userPrompt = `Create a complete professional website for: ${prompt}\n\nReturn COMPLETE HTML following all rules above.`;
      }

      const aiResponse = await env.AI.run("@cf/qwen/qwen2.5-14b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      });

      let generated = aiResponse.response || "";

      // Clean any markdown wrapping
      generated = generated.replace(/```html\s*/gi, "");
      generated = generated.replace(/```\s*$/gi, "");
      generated = generated.replace(/^\s*html\s*/i, "");
      generated = generated.trim();

      // Validate
      if (!generated.includes("<html") && !generated.includes("<!DOCTYPE")) {
        return jsonResponse({ success: false, error: "AI returned invalid response. Please try again." }, 500, cors);
      }

      // Reject if it looks like code
      if (generated.includes("export default") || generated.includes("async fetch")) {
        return jsonResponse({ success: false, error: "AI returned code instead of HTML. Please try again." }, 500, cors);
      }

      return jsonResponse({ success: true, website: generated }, 200, cors);

    } catch (error) {
      console.error(error);
      return jsonResponse({ success: false, error: error.message }, 500, cors);
    }
  },
};

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
                            }
        
