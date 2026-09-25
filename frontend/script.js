// ============================================================
// J.A.R.V.I.S — SEND + MIC + GEMINI + VOICE
// ============================================================

const STORAGE_KEY = "jarvis_key";

let API_KEY = localStorage.getItem(STORAGE_KEY) || "";

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:") || "";

  if (API_KEY) {
    localStorage.setItem(STORAGE_KEY, API_KEY);
  }
}


// ============================================================
// DOM
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");


// ============================================================
// CHAT
// ============================================================

function add(text, type = "ai") {

  if (!chat) {
    console.error("Chat element not found");
    return null;
  }

  const div = document.createElement("div");

  div.className = "msg " + type;

  div.textContent = text;

  chat.appendChild(div);

  chat.scrollTop = chat.scrollHeight;

  return div;
}


// ============================================================
// GEMINI
// ============================================================

async function askGemini(promptText) {

  if (!API_KEY) {
    add(
      "J.A.R.V.I.S: API key missing.",
      "ai"
    );
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
                text:
`You are J.A.R.V.I.S, a futuristic personal AI assistant.

Be helpful, intelligent and concise.

User:
${promptText}`
              }
            ]
          }
        ]

      })

    });


    const data = await response.json();

    console.log("Gemini:", data);


    if (!response.ok) {

      message.textContent =
        "J.A.R.V.I.S: ERROR - " +
        (data?.error?.message ||
          "Gemini request failed");

      return;
    }


    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();


    if (!reply) {

      message.textContent =
        "J.A.R.V.I.S: Gemini returned no response.";

      return;
    }


    message.textContent =
      "J.A.R.V.I.S: " + reply;


    speak(reply);

  } catch (error) {

    console.error(
      "Gemini error:",
      error
    );

    message.textContent =
      "J.A.R.V.I.S: ERROR - " +
      error.message;
  }
}


// ============================================================
// SEND BUTTON
// ============================================================

function sendMessage() {

  if (!input) {
    console.error("Input element #msg not found");
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  add(
    "YOU: " + text,
    "user"
  );


  input.value = "";


  askGemini(text);
}


if (sendBtn) {

  sendBtn.addEventListener(
    "click",
    sendMessage
  );

} else {

  console.error(
    "SEND button #send not found"
  );
}


// ============================================================
// ENTER KEY
// ============================================================

if (input) {

  input.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();
      }

    }
  );
}


// ============================================================
// MICROPHONE
// ============================================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


let recognition = null;

let listening = false;


if (SpeechRecognition && micBtn) {

  recognition =
    new SpeechRecognition();


  // Important settings

  recognition.lang = "en-US";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.maxAlternatives = 1;


  // ------------------------------------------
  // MIC START
  // ------------------------------------------

  recognition.onstart = () => {

    listening = true;

    micBtn.textContent =
      "🔴 LISTENING...";

    micBtn.classList.add(
      "listening"
    );

    console.log(
      "J.A.R.V.I.S microphone started"
    );
  };


  // ------------------------------------------
  // MIC RESULT
  // ------------------------------------------

  recognition.onresult = event => {

    const transcript =
      event.results[0][0].transcript.trim();


    console.log(
      "Voice:",
      transcript
    );


    if (!transcript) {
      return;
    }


    // Put recognized text into input

    if (input) {
      input.value = transcript;
    }


    add(
      "YOU: " + transcript,
      "user"
    );


    // Send directly to Gemini

    askGemini(
      transcript
    );
  };


  // ------------------------------------------
  // MIC ERROR
  // ------------------------------------------

  recognition.onerror = event => {

    console.error(
      "Microphone error:",
      event.error
    );


    listening = false;


    micBtn.textContent =
      "🎙️";


    micBtn.classList.remove(
      "listening"
    );


    let errorText = "";


    switch (event.error) {

      case "not-allowed":
        errorText =
          "Microphone permission denied.";
        break;

      case "audio-capture":
        errorText =
          "No microphone was found.";
        break;

      case "no-speech":
        errorText =
          "No speech detected.";
        break;

      case "network":
        errorText =
          "Speech recognition network error.";
        break;

      default:
        errorText =
          "Microphone error: " +
          event.error;
    }


    add(
      "J.A.R.V.I.S: " + errorText,
      "ai"
    );
  };


  // ------------------------------------------
  // MIC END
  // ------------------------------------------

  recognition.onend = () => {

    listening = false;


    micBtn.textContent =
      "🎙️";


    micBtn.classList.remove(
      "listening"
    );


    console.log(
      "J.A.R.V.I.S microphone stopped"
    );
  };


  // ------------------------------------------
  // MIC BUTTON
  // ------------------------------------------

  micBtn.addEventListener(
    "click",
    () => {

      if (listening) {

        recognition.stop();

        return;
      }


      try {

        recognition.start();

      } catch (error) {

        console.error(
          "Could not start microphone:",
          error
        );
      }

    }
  );


} else {

  console.error(
    "SpeechRecognition is not supported in this browser."
  );


  if (micBtn) {

    micBtn.textContent =
      "MIC UNAVAILABLE";

    micBtn.disabled = true;

    micBtn.title =
      "Speech recognition is not supported in this browser.";
  }
}


// ============================================================
// TEXT TO SPEECH
// ============================================================

function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    "en-US";

  utterance.rate =
    1.0;

  utterance.pitch =
    0.9;


  speechSynthesis.speak(
    utterance
  );
}


// ============================================================
// STARTUP
// ============================================================

add(
  "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
  "ai"
);
