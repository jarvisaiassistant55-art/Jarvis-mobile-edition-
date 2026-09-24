// ===== 2. SMART MODELS (ఒకటిfail అయితేnext auto try) =====
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
const MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const sendBtn = document.getElementById('send');

function appendMessage(text, type) {
  const d = document.createElement('div');
  d.className = 'msg ' + type;
  d.innerText = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// ===== 3. GEMINI BRAIN (auto-fallback) =====
async function callGemini(p) {
  if (!API_KEY || API_KEY === 'AQ.Ab8RN6K2K2M65AEmxIQJ6YTPceHWg2kHBB0dEGtyCLS5lgI-Hw') {
    throw new Error('Add your Gemini API key in frontend/script.js before using the assistant.');
  }

  let lastErr;
  for (const m of MODELS) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
        }
      );

      const data = await res.json();

      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand|temporar|quota|rate|unavailable|no longer available|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }

      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
        throw new Error('No response returned by Gemini.');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function askGemini(p) {
  appendMessage('J.A.R.V.I.S: Thinking...', 'ai');

  try {
    const reply = await callGemini(p);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. SPEECH RECOGNITION (వినడం) =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SR) {
  if (micBtn) {
    micBtn.disabled = true;
    micBtn.title = 'Speech recognition is not supported in this browser';
    micBtn.innerText = '🎙️';
  }
} else {
  const rec = new SR();
  rec.lang = 'en-US';

  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    appendMessage('YOU: ' + t, 'user');
    askGemini(t);
  };

  if (micBtn) {
    micBtn.onclick = () => {
      rec.start();
      micBtn.innerText = 'LISTENING...';
    };
  }

  rec.onend = () => {
    if (micBtn) micBtn.innerText = '🎙️';
  };
}

// ===== 5. TEXT-TO-SPEECH (మాట్లాడటం) =====
let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(t) {
  if (!('speechSynthesis' in window)) return;

  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.05;
  u.pitch = 0.85;

  const v = voices.find(v => v.lang && v.lang.startsWith('en'));
  if (v) u.voice = v;

  speechSynthesis.speak(u);
}

// ===== 6. TEXT SEND BUTTON =====
if (sendBtn) {
  sendBtn.onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    appendMessage('YOU: ' + t, 'user');
    input.value = '';
    askGemini(t);
  };
}

// Legacy compatibility for the original app layout
if (!chat) {
  console.warn('Chat container not found.');
}
