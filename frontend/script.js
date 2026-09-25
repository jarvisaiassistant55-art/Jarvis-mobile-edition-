// ===== 1. API KEY SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// ===== 2. SMART MODELS =====
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. HISTORY STORAGE =====
function getStoredHistory() {
  try {
    return JSON.parse(localStorage.getItem('jarvis_history') || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem('jarvis_history', JSON.stringify(history));
}

function loadHistory() {
  const history = getStoredHistory();
  if (!history.length) return;

  history.forEach((item) => {
    const d = document.createElement('div');
    d.className = 'msg ' + (item.type || 'ai');
    d.innerText = item.text;
    chat.appendChild(d);
  });

  chat.scrollTop = chat.scrollHeight;
}

// ===== 4. GEMINI BRAIN =====
async function callGemini(promptText) {
  if (!API_KEY) {
    throw new Error('Missing Gemini API key. Please reload and enter a valid key.');
  }

  const errors = [];

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        const message = data?.error?.message || `Model ${model} failed.`;
        errors.push(message);

        if (/high demand|temporary|quota|rate|unavailable|not found|deprecated|unsupported|invalid|not allowed/i.test(message)) {
          continue;
        }

        throw new Error(message);
      }

      const reply = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text)
        .join('')
        .trim();

      if (!reply) {
        throw new Error('No response received from Gemini.');
      }

      return reply;
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }

  throw new Error(errors.join(' | ') || 'Unable to reach Gemini right now.');
}

async function askGemini(promptText) {
  add('J.A.R.V.I.S: Thinking...', 'ai', true);

  try {
    const reply = await callGemini(promptText);
    const updatedText = 'J.A.R.V.I.S: ' + reply;

    if (chat.lastChild) {
      chat.lastChild.innerText = updatedText;
    }

    const history = getStoredHistory();
    if (history.length > 0) {
      history[history.length - 1].text = updatedText;
      saveHistory(history);
    }

    speak(reply);
  } catch (error) {
    const errText = 'J.A.R.V.I.S: ERROR - ' + (error?.message || 'Something went wrong');

    if (chat.lastChild) {
      chat.lastChild.innerText = errText;
    }

    const history = getStoredHistory();
    if (history.length > 0) {
      history[history.length - 1].text = errText;
      saveHistory(history);
    }
  }
}

// ===== 5. SPEECH RECOGNITION =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const rec = new SR();
  rec.lang = 'en-US';

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    add('YOU: ' + transcript, 'user', true);
    askGemini(transcript);
  };

  micBtn.onclick = () => {
    try {
      rec.start();
      micBtn.innerText = 'LISTENING...';
    } catch (error) {
      console.warn('Speech recognition is already active.');
    }
  };

  rec.onend = () => {
    micBtn.innerText = '🎙️';
  };
} else {
  micBtn.disabled = true;
  micBtn.innerText = '🚫';
}

// ===== 6. TEXT-TO-SPEECH (TTS) =====
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;

  const voice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
  if (voice) utterance.voice = voice;

  speechSynthesis.speak(utterance);
}

// ===== 7. DOM HELPERS & EVENT LISTENERS =====
function add(text, type, shouldSave = true) {
  const d = document.createElement('div');
  d.className = 'msg ' + type;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;

  if (shouldSave) {
    const history = getStoredHistory();
    history.push({ text, type });
    saveHistory(history);
  }
}

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  add('YOU: ' + text, 'user', true);
  input.value = '';
  askGemini(text);
}

document.getElementById('send').onclick = sendMessage;
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

// Initialize history load when page opens
loadHistory();
