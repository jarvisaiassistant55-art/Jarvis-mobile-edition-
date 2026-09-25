<script>
// ===== 1. API KEY SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY.trim());
}

// ===== 2. ACTIVE STABLE ENDPOINTS =====
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash"
];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI API CALL =====
async function callGemini(p) {
  let lastErr;
  for (const m of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
      });

      const data = await res.json();
      
      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand|quota|rate|not found|unavailable|deprecated/i.test(data.error.message)) {
          continue;
        }
        throw lastErr;
      }

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No text candidates returned");
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function askGemini(p) {
  add('J.A.R.V.I.S: Thinking...', 'ai');
  try {
    const reply = await callGemini(p);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. SPEECH RECOGNITION =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const rec = new SR();
  rec.lang = 'en-US';

  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
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

// ===== 5. TEXT-TO-SPEECH =====
let voices = [];
function loadVoices() {
  if ('speechSynthesis' in window) {
    voices = speechSynthesis.getVoices();
  }
}
loadVoices();
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
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

// ===== 6. EVENT LISTENERS =====
document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;
  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
};

function add(t, w) {
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}
</script>
</body>
</html>
