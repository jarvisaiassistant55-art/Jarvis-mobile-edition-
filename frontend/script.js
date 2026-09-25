// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key') || '';
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:') || '';
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// ===== 2. MODELS =====
// Use model names currently supported by the Gemini API, with a fallback.
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest'];
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN =====
async function callGemini(promptText) {
  if (!API_KEY) {
    throw new Error('Gemini API key is missing. Reload the page and enter your key.');
  }

  let lastError = new Error('Gemini did not return a response.');

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        }
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        lastError = new Error(data.error?.message || `Request failed (${response.status})`);
        // Try the fallback model for temporary, quota, or unavailable-model errors.
        if (/high demand|temporar|quota|rate|unavailable|not found|no longer available|deprecated/i.test(lastError.message)) {
          continue;
        }
        throw lastError;
      }

      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
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
