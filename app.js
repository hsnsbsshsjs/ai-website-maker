const promptBox = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const status = document.getElementById("status");

const AI_URL = "https://ai-website-maker.lutaayacyrus76.workers.dev/";

function useExample(text) {
    promptBox.value = text;
    promptBox.focus();
}

generateBtn.addEventListener("click", async function () {

    const prompt = promptBox.value.trim();

    if (!prompt) {
        status.textContent = "⚠️ Please describe the website you want.";
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "✨ Creating...";
    status.textContent = "🧠 AI is designing your website...";

    try {

        const response = await fetch(AI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Website generation failed."
            );
        }

        localStorage.setItem(
            "generatedWebsite",
            data.website
        );

        localStorage.setItem(
            "websitePrompt",
            prompt
        );

        status.textContent = "✅ Website created!";

        window.location.href = "preview.html";

    } catch (error) {

        console.error(error);

        status.textContent =
            "❌ " + error.message;

    } finally {

        generateBtn.disabled = false;
        generateBtn.textContent = "✨ Generate Website";
    }
});
