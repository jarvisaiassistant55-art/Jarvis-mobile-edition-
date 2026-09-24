// ============================================================
// J.A.R.V.I.S — Gemini Brain + Voice Assistant
// ============================================================

// ===== 1. GEMINI API KEY =====
// The key is stored locally in this browser only.
// DO NOT publish this key in a public GitHub repository.

let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
    API_KEY = prompt("AQ.Ab8RN6J-JNcAQKJXTM9CndBkpKLDLa9lMdQbcMrTuJRHCKE5DA":);

    if (API_KEY && API_KEY.trim()) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

// ===== 2. ELEMENTS =====

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const micBtn = document.getElementById("mic-btn");
const sendBtn = document.getElementById("send");

// ===== 3. GEMINI MODELS =====

const MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest"
];

// ===== 4. ADD CHAT MESSAGE =====

function add(text, type) {
    const d = document.createElement("div");

    d.className = "msg " + type;
    d.innerText = text;

    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;

    return d;
}

// ===== 5. GEMINI BRAIN =====

async function callGemini(promptText) {

    if (!API_KEY) {
        throw new Error("Gemini API key is missing.");
    }

    let lastErr = null;

    for (const model of MODELS) {

        try {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY);

            const response = await fetch(url, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text:
                                        "You are J.A.R.V.I.S, a helpful personal AI assistant. " +
                                        "Address the user as Boss when appropriate. " +
                                        "Be concise, intelligent and natural.\n\n" +
                                        "USER:\n" +
                                        promptText
                                }
                            ]
                        }
                    ]
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {

                const message =
                    data?.error?.message ||
                    `HTTP ${response.status}`;

                lastErr = new Error(message);

                // Try the next model for temporary/model availability errors.
                if (
                    /high demand|temporar|quota|rate|unavailable|no longer available|deprecated|not found/i
                        .test(message)
                ) {
                    continue;
                }

                throw lastErr;
            }

            const reply =
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!reply) {
                throw new Error("Gemini returned an empty response.");
            }

            return reply;

        } catch (error) {

            lastErr = error;

            console.error(
                "J.A.R.V.I.S model error:",
                model,
                error
            );
        }
    }

    throw lastErr || new Error("All Gemini models failed.");
}

// ===== 6. ASK J.A.R.V.I.S =====

async function askGemini(promptText) {

    const thinking = add(
        "J.A.R.V.I.S: Thinking...",
        "ai"
    );

    try {

        const reply = await callGemini(promptText);

        thinking.innerText =
            "J.A.R.V.I.S: " + reply;

        speak(reply);

    } catch (error) {

        console.error(error);

        thinking.innerText =
            "J.A.R.V.I.S: ERROR - " +
            error.message;

    }
}

// ===== 7. SPEECH RECOGNITION =====

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let rec = null;

if (SpeechRecognition) {

    rec = new SpeechRecognition();

    rec.lang = "en-US";

    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
        if (micBtn) {
            micBtn.innerText = "LISTENING...";
        }
    };

    rec.onresult = (event) => {

        const text =
            event.results[0][0].transcript;

        if (!text.trim()) return;

        add(
            "YOU: " + text,
            "user"
        );

        askGemini(text);
    };

    rec.onerror = (event) => {

        console.error(
            "Speech recognition error:",
            event.error
        );

        if (micBtn) {
            micBtn.innerText = "🎙️";
        }
    };

    rec.onend = () => {

        if (micBtn) {
            micBtn.innerText = "🎙️";
        }
    };

    if (micBtn) {

        micBtn.onclick = () => {

            try {
                rec.start();
            } catch (error) {
                console.log(
                    "Recognition already running."
                );
            }

        };
    }

} else {

    if (micBtn) {

        micBtn.innerText = "MIC N/A";

        micBtn.onclick = () => {
            add(
                "J.A.R.V.I.S: Speech recognition is not supported in this browser.",
                "ai"
            );
        };
    }
}

// ===== 8. TEXT TO SPEECH =====

let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

loadVoices();

speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1.0;

    const voice =
        voices.find(v =>
            v.lang &&
            v.lang.toLowerCase().startsWith("en")
        );

    if (voice) {
        utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
}

// ===== 9. SEND BUTTON =====

if (sendBtn) {

    sendBtn.onclick = () => {

        const text =
            input.value.trim();

        if (!text) return;

        add(
            "YOU: " + text,
            "user"
        );

        input.value = "";

        askGemini(text);
    };
}

// ===== 10. ENTER KEY =====

if (input) {

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                if (sendBtn) {
                    sendBtn.click();
                }
            }
        }
    );
}

// ===== 11. CLEAR STORED API KEY =====
// Run this from browser console if you ever need to remove it:
//
// localStorage.removeItem("jarvis_key");

// ===== 12. READY =====

console.log(
    "J.A.R.V.I.S frontend initialized."
);
