// ===== 1. API KEY SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// ===== 2. SMART MODELS (Updated active identifiers) =====
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN =====
async function callGemini(p) {
  let lastErr;
  for (const m of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        }
      );
      const data = await res.json();
      if (data.error) {
        lastErr = new Error(data.error.message);
        // Fallback retry trigger for rate limits, high demand, or unavailable models
        if (/high demand|temporary|quota|rate|unavailable|not found|deprecated/i.test(data.error.message)) {
          continue;
        }
        throw lastErr;
      }
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}


// ===== 4. GEMINI API CALL =====
async function callGemini(p) {
  let lastErr;
  for (const m of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        }
      );
      const data = await res.json();
      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand|temporary|quota|rate|unavailable|no longer available|deprecated/i.test(data.error.message)) {
          continue;
        }
        throw lastErr;
      }
      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function askGemini(p) {
  add('J.A.R.V.I.S: Thinking...', 'ai', true);
  try {
    const reply = await callGemini(p);
    const updatedText = 'J.A.R.V.I.S: ' + reply;
    
    // Update DOM element
    chat.lastChild.innerText = updatedText;
    
    // Update last item in localStorage history
    const history = getStoredHistory();
    if (history.length > 0) {
      history[history.length - 1].text = updatedText;
      saveHistory(history);
    }

    speak(reply);
  } catch (e) {
    const errText = 'J.A.R.V.I.S: ERROR - ' + e.message;
    chat.lastChild.innerText = errText;
    
    // Update last item in localStorage history on error
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

  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user', true);
    askGemini(t);
  };

  micBtn.onclick = () => {
    try {
      rec.start();
      micBtn.innerText = 'LISTENING...';
    } catch (e) {
      console.warn('Speech recognition active');
    }
  };

  rec.onend = () => { micBtn.innerText = '🎙️'; };
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

function speak(t) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.05;
  u.pitch = 0.85;
  const v = voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

// ===== 7. DOM HELPERS & EVENT LISTENERS =====
document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;
  add('YOU: ' + t, 'user', true);
  input.value = '';
  askGemini(t);
};

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

// Initialize history load when page opens
loadHistory();
