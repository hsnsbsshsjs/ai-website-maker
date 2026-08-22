const promptBox = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const status = document.getElementById("status");

function useExample(text) {
    promptBox.value = text;
    promptBox.focus();
}

generateBtn.addEventListener("click", function () {

    const prompt = promptBox.value.trim();

    if (!prompt) {
        status.textContent = "Please describe the website you want.";
        return;
    }

    status.textContent = "🚀 Your website generator is working...";

    setTimeout(() => {
        status.textContent =
            "✅ Prompt received! AI generation will be connected next.";
    }, 1500);

});
