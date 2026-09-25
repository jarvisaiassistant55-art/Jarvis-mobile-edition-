// ============================================================
// J.A.R.V.I.S — GEMINI BRAIN + VOICE
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
// GEMINI MODELS
// ============================================================

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite"
];

const MAX_ATTEMPTS = 3;


// ============================================================
// DOM
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");


// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function add(text, type) {
  if (!chat) return;

  const message = document.createElement("div");

  message.className = `msg ${type}`;

  message.innerText = text;

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}


// ============================================================
// GEMINI BRAIN
// ============================================================

async function callGemini(promptText) {

  if (!API_KEY) {
    throw new Error(
      "Gemini API key is missing."
    );
  }

  let lastError = null;


  for (const model of MODELS) {

    console.log(
      "J.A.R.V.I.S trying:",
      model
    );


    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

      try {

        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;


        const response = await fetch(url, {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            contents: [
              {
                role: "user",

                parts: [
                  {
                    text:
`You are J.A.R.V.I.S, a futuristic personal AI assistant.

Be intelligent, helpful and concise.

Call the user Boss when appropriate.

Never claim that you performed a real-world action unless the application actually performed it.

User:
${promptText}`
                  }
                ]
              }
            ],

            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }

          })

        });


        let data;

        try {
          data = await response.json();
        } catch {

          throw new Error(
            `Invalid Gemini response (${response.status})`
          );
        }


        // ======================================================
        // SUCCESS
        // ======================================================

        if (response.ok && !data.error) {

          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map(part => part.text || "")
              .join("")
              .trim();


          if (text) {

            console.log(
              "J.A.R.V.I.S response received."
            );

            return text;
          }


          throw new Error(
            "Gemini returned an empty response."
          );
        }


        const errorMessage =
          data?.error?.message ||
          `Gemini HTTP ${response.status}`;


        lastError =
          new Error(errorMessage);


        console.error(
          "Gemini error:",
          errorMessage
        );


        // ======================================================
        // AUTH ERROR
        // ======================================================

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          localStorage.removeItem(
            STORAGE_KEY
          );

          throw new Error(
            "Invalid Gemini API key. Reload the page and enter a valid key."
          );
        }


        // ======================================================
        // MODEL UNAVAILABLE
        // ======================================================

        if (
          /not found|no longer available|deprecated|unsupported/i
            .test(errorMessage)
        ) {

          console.log(
            model,
            "is unavailable. Trying next model..."
          );

          break;
        }


        // ======================================================
        // TEMPORARY ERROR / RATE LIMIT
        // ======================================================

        if (
          response.status === 408 ||
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {

          if (attempt < MAX_ATTEMPTS) {

            const delay =
              Math.min(
                1500 * Math.pow(2, attempt - 1),
                10000
              );


            console.log(
              `Retry ${attempt}/${MAX_ATTEMPTS} in ${delay}ms`
            );


            await sleep(delay);

            continue;
          }


          break;
        }


        // Other errors should stop immediately.

        throw new Error(
          errorMessage
        );

      } catch (error) {

        lastError = error;

        console.error(
          "J.A.R.V.I.S request error:",
          error
        );


        // Authentication errors should not retry.

        if (
          /API key|authentication|unauthorized|forbidden/i
            .test(error.message)
        ) {

          throw error;
        }


        // Model unavailable → next model.

        if (
          /not found|no longer available|deprecated|unsupported/i
            .test(error.message)
        ) {

          break;
        }


        // Retry network errors.

        if (attempt < MAX_ATTEMPTS) {

          const delay =
            Math.min(
              1500 * Math.pow(2, attempt - 1),
              10000
            );


          await sleep(delay);

          continue;
        }
      }
    }
  }


  // ============================================================
  // FINAL ERROR
  // ============================================================

  if (lastError) {

    const message =
      lastError.message;


    if (
      /429|quota|rate limit|too many requests/i
        .test(message)
    ) {

      throw new Error(
        "Gemini rate limit reached. Please wait a little and try again."
      );
    }


    if (
      /503|unavailable|overloaded|high demand|busy/i
        .test(message)
    ) {

      throw new Error(
        "Gemini is temporarily busy. Please try again in a few seconds."
      );
    }


    if (
      /failed to fetch|network/i
        .test(message)
    ) {

      throw new Error(
        "Network error. Check your internet connection."
      );
    }


    throw lastError;
  }


  throw new Error(
    "J.A.R.V.I.S could not connect to Gemini."
  );
}


// ============================================================
// ASK JARVIS
// ============================================================

async function askGemini(promptText) {

  const responseMessage =
    add(
      "J.A.R.V.I.S: Thinking...",
      "ai"
    );


  try {

    const reply =
      await callGemini(promptText);


    responseMessage.innerText =
      "J.A.R.V.I.S: " + reply;


    speak(reply);

  } catch (error) {

    responseMessage.innerText =
      "J.A.R.V.I.S: ERROR - " +
      error.message;


    console.error(
      "J.A.R.V.I.S:",
      error
    );
  }
}


// ============================================================
// SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition && micBtn) {

  const recognition =
    new SpeechRecognition();


  recognition.lang = "en-US";

  recognition.continuous = false;

  recognition.interimResults = false;


  recognition.onstart = () => {

    micBtn.innerText =
      "LISTENING...";
  };


  recognition.onresult = event => {

    const text =
      event.results[0][0].transcript;


    add(
      "YOU: " + text,
      "user"
    );


    askGemini(text);
  };


  recognition.onerror = event => {

    console.error(
      "Speech error:",
      event.error
    );


    micBtn.innerText =
      "🎙️";
  };


  recognition.onend = () => {

    micBtn.innerText =
      "🎙️";
  };


  micBtn.onclick = () => {

    try {

      recognition.start();

    } catch (error) {

      console.log(
        "Microphone already active."
      );
    }
  };

} else if (micBtn) {

  micBtn.disabled = true;

  micBtn.title =
    "Speech recognition is not supported.";
}


// ============================================================
// TEXT TO SPEECH
// ============================================================

let voices = [];


function loadVoices() {

  if ("speechSynthesis" in window) {

    voices =
      speechSynthesis.getVoices();
  }
}


if ("speechSynthesis" in window) {

  loadVoices();

  speechSynthesis.onvoiceschanged =
    loadVoices;
}


function speak(text) {

  if (!("speechSynthesis" in window)) {
    return;
  }


  speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(text);


  utterance.rate = 1.05;

  utterance.pitch = 0.85;


  const voice =
    voices.find(
      voice =>
        voice.lang &&
        voice.lang
          .toLowerCase()
          .startsWith("en")
    );


  if (voice) {
    utterance.voice = voice;
  }


  speechSynthesis.speak(
    utterance
  );
}


// ============================================================
// SEND MESSAGE
// ============================================================

function sendMessage() {

  if (!input) return;


  const text =
    input.value.trim();


  if (!text) return;


  add(
    "YOU: " + text,
    "user"
  );


  input.value = "";


  askGemini(text);
}


sendBtn?.addEventListener(
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


// ============================================================
// STARTUP MESSAGE
// ============================================================

if (chat && chat.children.length === 0) {

  add(
    "J.A.R.V.I.S: Systems online. How may I assist you, Boss?",
    "ai"
  );
