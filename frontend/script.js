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

// ===== 3. GEMINI API CALL =====
async function callGemini(promptText) {
  if (!API_KEY) {
    throw new Error('No Gemini API key found. Please enter your key in the popup.');
  }

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        const message = data?.error?.message || 'Unknown API error';
        lastError = new Error(message);

        const shouldRetry = /high demand|temporar|quota|rate|unavailable|no longer available|deprecated|not found|model/i.test(message);
        if (shouldRetry) {
          continue;
        }

        throw lastError;
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts?.length) {
        throw new Error('Gemini returned no response.');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to get a response from Gemini.');
}

async function askGemini(promptText) {
  add('J.A.R.V.I.S: Thinking...', 'ai');

  try {
    const reply = await callGemini(promptText);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (error) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + error.message;
  }
}

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  add('YOU: ' + text, 'user');
  input.value = '';
  askGemini(text);
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
