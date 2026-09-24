const STORAGE_KEY = 'jarvis_key';
let API_KEY = localStorage.getItem(STORAGE_KEY) || '';

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash'
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendButton = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');

function add(text, type) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function getApiKey() {
  if (!API_KEY) {
    API_KEY = window.prompt('Enter your Gemini API Key:') || '';
    if (API_KEY) localStorage.setItem(STORAGE_KEY, API_KEY);
  }
  return API_KEY;
}

async function callGemini(promptText) {
  const key = getApiKey();
  if (!key) throw new Error('No Gemini API key found.');

  let lastError = null;
  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        }
      );
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
      }
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (error) {
      lastError = error;
      console.error(`${model} failed:`, error);
    }
  }
  throw lastError || new Error('All Gemini models are unavailable.');
}

async function askGemini(text) {
  try {
    sendButton.disabled = true;
    const reply = await callGemini(text);
    add(`J.A.R.V.I.S: ${reply}`, 'ai');
    speak(reply);
  } catch (error) {
    add(`J.A.R.V.I.S: ${error.message}`, 'ai');
  } finally {
    sendButton.disabled = false;
  }
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text || sendButton.disabled) return;
  add(`YOU: ${text}`, 'user');
  input.value = '';
  await askGemini(text);
}

sendButton.addEventListener('click', sendMessage);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendMessage();
});

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognitionAPI) {
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    add(`YOU: ${transcript}`, 'user');
    askGemini(transcript);
  };
  recognition.onerror = () => add('J.A.R.V.I.S: Voice input failed.', 'ai');
  micBtn.onclick = () => {
    recognition.start();
    micBtn.innerText = 'LISTENING...';
  };
  recognition.onend = () => { micBtn.innerText = '🎙️'; };
} else {
  micBtn.disabled = true;
  micBtn.title = 'Speech recognition not supported in this browser';
}

let voices = [];
function loadVoices() { voices = window.speechSynthesis?.getVoices() || []; }
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;
  const voice = voices.find((item) => item.lang?.toLowerCase().startsWith('en'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
loadVoices();
if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = loadVoices;

add('J.A.R.V.I.S: Online. Ready for command.', 'ai');
