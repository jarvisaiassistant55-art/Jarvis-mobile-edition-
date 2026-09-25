const API_KEY =
  localStorage.getItem("jarvis_key") ||
  prompt("Enter Gemini API Key:");

if (API_KEY) {
  localStorage.setItem("jarvis_key", API_KEY);
}

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const send = document.getElementById("send");

function add(text, type = "ai") {
  const div = document.createElement("div");

  div.className = "msg " + type;
  div.textContent = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  return div;
}

async function askGemini(prompt) {

  if (!API_KEY) {
    add("J.A.R.V.I.S: API KEY MISSING", "ai");
    return;
  }

  const message = add(
    "J.A.R.V.I.S: Thinking...",
    "ai"
  );

  try {

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
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
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    console.log("STATUS:", response.status);
    console.log("GEMINI:", data);

    if (!response.ok) {

      message.textContent =
        "J.A.R.V.I.S: ERROR - " +
        (data?.error?.message ||
          "Gemini request failed");

      return;
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("")
        .trim();

    if (!reply) {

      message.textContent =
        "J.A.R.V.I.S: Gemini returned no text.";

      return;
    }

    message.textContent =
      "J.A.R.V.I.S: " + reply;

    speak(reply);

  } catch (error) {

    console.error(error);

    message.textContent =
      "J.A.R.V.I.S: ERROR - " +
      error.message;
  }
}

function sendMessage() {

  const text = input.value.trim();

  if (!text) return;

  add("YOU: " + text, "user");

  input.value = "";

  askGemini(text);
}

send?.addEventListener(
  "click",
  sendMessage
);

input?.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }

  }
);


// ================================
// VOICE OUTPUT
// ================================

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }

  speechSynthesis.cancel();

  const voice =
    new SpeechSynthesisUtterance(text);

  voice.rate = 1.0;
  voice.pitch = 0.9;

  speechSynthesis.speak(voice);
}


// ================================
// START
// ================================

add(
  "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
  "ai"
);
