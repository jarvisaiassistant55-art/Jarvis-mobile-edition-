// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key') || '';
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:') || '';
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// ===== 2. MODELS =====
// Use stable Gemini Flash models and fall back if one is busy or unavailable.
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite'];
const MAX_ATTEMPTS_PER_MODEL = 3;
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  return /high demand|temporar|quota|rate|overload|unavailable|not found|no longer available|deprecated|internal server error|too many requests/i.test(error.message);
}

// ===== 3. GEMINI BRAIN =====
async function callGemini(promptText) {
  if (!API_KEY) {
    throw new Error('Gemini API key is missing. Reload the page and enter your key.');
  }

  let lastError = new Error('Gemini did not return a response.');

  for (const model of MODELS) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
          }
        );

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error(`Gemini returned an invalid response (${response.status}).`);
        }

        if (!response.ok || data.error) {
          lastError = new Error(data.error?.message || `Request failed (${response.status})`);
          if (!isRetryableError(lastError)) throw lastError;

          // Back off before retrying temporary capacity/rate-limit failures.
          if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
            await sleep(1500 * 2 ** attempt);
            continue;
          }
          break;
        }

        const text = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || '')
          .join('')
          .trim();

        if (!text) {
          throw new Error('Gemini returned an empty response.');
        }
        return text;
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error)) throw error;
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await sleep(1500 * 2 ** attempt);
        }
      }
    }
  }

  throw new Error(
    'Gemini is temporarily busy. Please wait a few seconds and try again.'
  );
}

async function askGemini(promptText) {
  add('J.A.R.V.I.S: Thinking...', 'ai');
  const responseMessage = chat.lastElementChild;

  try {
    const reply = await callGemini(promptText);
    responseMessage.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (error) {
    responseMessage.innerText = 'J.A.R.V.I.S: ERROR - ' + error.message;
    console.error('Jarvis request failed:', error);
  }
}

// ===== 4. SPEECH RECOGNITION =====
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition && micBtn) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.onresult = event => {
    const text = event.results[0][0].transcript;
    add('YOU: ' + text, 'user');
    askGemini(text);
  };
  recognition.onerror = event => console.error('Speech recognition error:', event.error);
  recognition.onend = () => { micBtn.innerText = '🎙️'; };
  micBtn.onclick = () => {
    recognition.start();
    micBtn.innerText = 'LISTENING...';
  };
} else if (micBtn) {
  micBtn.disabled = true;
  micBtn.title = 'Speech recognition is not supported in this browser.';
}

// ===== 5. TEXT-TO-SPEECH =====
let voices = [];
function loadVoices() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;
  const voice = voices.find(item => item.lang?.startsWith('en'));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

// ===== 6. TEXT SEND =====
function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  add('YOU: ' + text, 'user');
  input.value = '';
  askGemini(text);
}

sendBtn?.addEventListener('click', sendMessage);
input?.addEventListener('keydown', event => {
  if (event.key === 'Enter') sendMessage();
});

function add(text, type) {
  const message = document.createElement('div');
  message.className = `msg ${type}`;
  message.innerText = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}
