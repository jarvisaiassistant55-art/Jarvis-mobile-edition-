// ===== 1. API KEY =====
const STORAGE_KEY = 'jarvis_key';
let API_KEY = localStorage.getItem(STORAGE_KEY) || '';

if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:') || '';
  if (API_KEY) {
    localStorage.setItem(STORAGE_KEY, API_KEY);
  }
}

// ===== 2. MODEL FALLBACKS =====
const MODELS = [
  "gemini-3.6-flash",
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

function add(text, type) {
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ===== GEMINI API CALL (FIXED) =====
async function callGemini(promptText) {

  if (!API_KEY) {
    throw new Error("No Gemini API key found.");
  }

  const MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ];

  let lastError = null;

  for (const model of MODELS) {

    for (let retry = 0; retry < 3; retry++) {

      try {

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText }
                  ]
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (!response.ok || data.error) {

          const message =
            data?.error?.message ||
            `HTTP ${response.status}`;

          if (
            message.toLowerCase().includes("high demand") ||
            message.toLowerCase().includes("quota") ||
            message.toLowerCase().includes("rate") ||
            message.toLowerCase().includes("unavailable")
          ) {

            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          throw new Error(message);
        }

        return data?.candidates?.[0]?.content?.parts?.[0]?.text
          || "No response generated.";

      } catch (err) {

        lastError = err;

        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  throw lastError || new Error("All Gemini models are unavailable.");
}

// ===== 4. SPEECH RECOGNITION =====
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognitionAPI) {
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    add('YOU: ' + transcript, 'user');
    askGemini(transcript);
  };

  recognition.onerror = () => {
    add('J.A.R.V.I.S: Voice input failed.', 'ai');
  };

  micBtn.onclick = () => {
    recognition.start();
    micBtn.innerText = 'LISTENING...';
  };

  recognition.onend = () => {
    micBtn.innerText = '🎙️';
  };
} else {
  micBtn.disabled = true;
  micBtn.title = 'Speech recognition not supported in this browser';
}

// ===== 5. TEXT-TO-SPEECH =====
let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;

  const preferredVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith('en'));
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  speechSynthesis.speak(utterance);
}

// ===== 6. TEXT SEND BUTTON / ENTER KEY =====
document.getElementById('send').onclick = sendMessage;
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

// ===== 7. OPTIONAL WELCOME MESSAGE =====
add('J.A.R.V.I.S: Online. Ready for command.', 'ai');
