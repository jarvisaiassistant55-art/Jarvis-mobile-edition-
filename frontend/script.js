const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");

const API_KEY = localStorage.getItem("jarvis_key") || prompt("Enter Gemini API Key:");

if (API_KEY) {
    localStorage.setItem("jarvis_key", API_KEY);
}

function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
}

async function askJarvis(message) {
    const aiMsg = addMessage("J.A.R.V.I.S: Thinking...", "ai");

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are J.A.R.V.I.S from Iron Man. Reply professionally.\n\nUser: ${message}`
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Unable to process request.";

        aiMsg.textContent = "J.A.R.V.I.S: " + reply;
    } catch (err) {
        aiMsg.textContent = "J.A.R.V.I.S ERROR: " + err.message;
    }
}

sendBtn.onclick = () => {
    const text = input.value.trim();

    if (!text) return;

    addMessage("YOU: " + text, "user");
    input.value = "";

    askJarvis(text);
};

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
});
