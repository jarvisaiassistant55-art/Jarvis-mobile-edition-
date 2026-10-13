
"use strict";

/* =========================================================
   J.A.R.V.I.S MOBILE EDITION
   Chat • Gemini AI • Memory • Microphone • Voice
   Camera/Image Analysis • Themes • Chat History
   ========================================================= */

const $ = (id) => document.getElementById(id);

const el = {
  sidebar: $("sidebar"),
  sidebarToggle: $("sidebar-toggle"),
  menuBtn: $("menu-btn"),
  backdrop: $("sidebar-backdrop"),

  newChat: $("new-chat"),
  historyList: $("history-list"),
  historyCount: $("history-count"),

  settingsOpen: $("settings-open"),
  settingsClose: $("settings-close"),
  settingsPanel: $("settings-panel"),
  settingsScrim: $("settings-scrim"),
  themeSelect: $("theme-select"),
  clearMemorySetting: $("clear-memory-setting"),

  welcome: $("welcome"),
  core: $("jarvis-core-container"),
  chat: $("chat"),
  thinkingStatus: $("thinking-status"),
  thinkingLabel: $("thinking-label"),

  camera: $("cam-btn"),
  imageInput: $("img-input"),
  message: $("msg"),
  mic: $("mic-btn"),
  send: $("send"),

  wake: $("wake-btn"),
  wakeStatus: $("wake-status"),
  clear: $("clear-btn"),

  apiKeyInput: $("api-key-input"),
  saveKey: $("save-key-btn"),
  removeKey: $("remove-key-btn")
};

const STORAGE = {
  key: "jarvis_key",
  chats: "jarvis_chats",
  active: "jarvis_active_chat",
  theme: "jarvis_theme"
};

// Change this model if your Gemini API account does not support it.
const GEMINI_MODEL = "gemini-2.5-flash";

const API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/";

let chats = loadJSON(STORAGE.chats, []);
let activeChatId = localStorage.getItem(STORAGE.active);
let selectedImage = null;
let recognition = null;
let micActive = false;
let wakeMode = false;
let isSending = false;
let speechEnabled = true;
let requestController = null;

/* =========================
   CHAT DATA AND STORAGE
   ========================= */

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    console.warn("Could not read saved data:", key, error);
    return fallback;
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE.chats, JSON.stringify(chats));
    localStorage.setItem(STORAGE.active, activeChatId || "");
  } catch (error) {
    console.error("Could not save chat history:", error);
    showNotice("Storage is full. Clear some old chats or browser data.");
  }
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId);
}

function makeChat() {
  const chat = {
    id: makeId(),
    title: "New Chat",
    messages: [],
    updatedAt: Date.now()
  };

  chats.unshift(chat);
  activeChatId = chat.id;

  saveChats();
  renderHistory();
  renderChat();
  closeSidebar();

  return chat;
}

function ensureActiveChat() {
  let chat = getActiveChat();

  if (!chat) {
    chat = makeChat();
  }

  return chat;
}

function updateChatTitle(chat) {
  if (chat.title !== "New Chat") return;

  const firstUserMessage = chat.messages.find(
    (message) => message.role === "user"
  );

  if (firstUserMessage) {
    chat.title = firstUserMessage.text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 35) || "New Chat";
  }
}

function saveMessage(role, text) {
  const chat = ensureActiveChat();

  chat.messages.push({
    role,
    text: String(text),
    time: Date.now()
  });

  chat.updatedAt = Date.now();
  updateChatTitle(chat);

  saveChats();
  renderHistory();

  return chat;
}

/* =========================
   CHAT DISPLAY
   ========================= */

function addMessage(role, text, options = {}) {
  if (!el.chat) return null;

  const wrapper = document.createElement("div");
  wrapper.className = role === "user" ? "msg user" : "msg ai";

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = role === "user" ? "YOU" : "J.A.R.V.I.S";

  const body = document.createElement("div");
  body.className = "msg-text";
  body.textContent = String(text);

  wrapper.append(label, body);

  if (options.image) {
    const image = document.createElement("img");
    image.src = options.image;
    image.alt = "Attached image";
    image.className = "message-image";
    image.style.maxWidth = "100%";
    image.style.maxHeight = "260px";
    image.style.borderRadius = "12px";
    image.style.marginTop = "8px";
    wrapper.appendChild(image);
  }

  el.chat.appendChild(wrapper);
  scrollToBottom();

  return wrapper;
}

function renderChat() {
  if (!el.chat) return;

  el.chat.replaceChildren();

  const chat = getActiveChat();
  const hasMessages = !!chat && chat.messages.length > 0;

  if (el.welcome) {
    el.welcome.hidden = hasMessages;
  }

  if (el.core) {
    el.core.hidden = hasMessages;
  }

  if (chat) {
    chat.messages.forEach((message) => {
      addMessage(message.role, message.text);
    });
  }

  scrollToBottom();
}

function renderHistory() {
  if (!el.historyList) return;

  el.historyList.replaceChildren();

  chats.sort((a, b) => b.updatedAt - a.updatedAt);

  chats.forEach((chat) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";

    if (chat.id === activeChatId) {
      item.classList.add("active");
    }

    item.textContent = chat.title || "New Chat";
    item.title = chat.title || "New Chat";

    item.addEventListener("click", () => {
      activeChatId = chat.id;
      saveChats();
      renderHistory();
      renderChat();
      closeSidebar();
    });

    el.historyList.appendChild(item);
  });

  if (el.historyCount) {
    el.historyCount.textContent = String(chats.length);
  }
}

function scrollToBottom() {
  if (!el.chat) return;

  requestAnimationFrame(() => {
    el.chat.scrollTop = el.chat.scrollHeight;
  });
}

function showNotice(text) {
  addMessage("ai", text);
}

function setThinking(active, label = "J.A.R.V.I.S is thinking...") {
  if (el.thinkingStatus) {
    el.thinkingStatus.hidden = !active;
  }

  if (el.thinkingLabel) {
    el.thinkingLabel.textContent = label;
  }

  if (el.send) {
    el.send.disabled = active;
  }

  isSending = active;
}

/* =========================
   GEMINI API KEY
   ========================= */

function getApiKey() {
  let key = "";

  try {
    key = localStorage.getItem(STORAGE.key) || "";
  } catch (error) {
    console.warn("Could not access saved API key.", error);
  }

  if (!key && el.apiKeyInput) {
    key = el.apiKeyInput.value.trim();
  }

  if (!key) {
    key = (prompt("Enter your Gemini API key:") || "").trim();

    if (key) {
      try {
        localStorage.setItem(STORAGE.key, key);
      } catch (error) {
        console.warn("Could not save API key.", error);
      }

      if (el.apiKeyInput) {
        el.apiKeyInput.value = key;
      }
    }
  }

  return key;
}

function saveApiKey() {
  const key = el.apiKeyInput?.value.trim();

  if (!key) {
    showNotice("Please enter your Gemini API key in Settings.");
    return;
  }

  try {
    localStorage.setItem(STORAGE.key, key);
    showNotice("Gemini API key saved on this device.");
  } catch (error) {
    showNotice("Could not save the API key in browser storage.");
  }
}

function removeApiKey() {
  try {
    localStorage.removeItem(STORAGE.key);
  } catch (error) {
    console.warn(error);
  }

  if (el.apiKeyInput) {
    el.apiKeyInput.value = "";
  }

  showNotice("Saved API key removed.");
}

function getApiError(data, status) {
  const message = data?.error?.message || "Unknown API error";

  if (status === 400 || status === 401 || status === 403) {
    return "Gemini rejected the request. Check your API key, " +
      "API access, and key restrictions. Details: " + message;
  }

  if (status === 404) {
    return "The Gemini model may be unavailable. Check the model " +
      "name and API access. Details: " + message;
  }

  if (status === 429) {
    return "Gemini rate limit or quota reached. Please wait and retry. " +
      "Details: " + message;
  }

  return "Gemini API error (" + status + "): " + message;
}

/* =========================
   GEMINI CONVERSATION
   ========================= */

function imageToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");

      if (comma < 0) {
        reject(new Error("Could not read the selected image."));
        return;
      }

      resolve({
        mimeType: file.type || "image/jpeg",
        data: result.slice(comma + 1),
        dataUrl: result
      });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the selected image."));
    };

    reader.readAsDataURL(file);
  });
}

async function askGemini(userText, imageData) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is required. Open Settings and add your key."
    );
  }

  const chat = ensureActiveChat();

  // The current user message is already saved, so exclude it here.
  const previousMessages = chat.messages
    .slice(0, -1)
    .filter((message) =>
      message.role === "user" || message.role === "model"
    )
    .slice(-20);

  const contents = previousMessages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }]
  }));

  const currentParts = [];

  if (userText) {
    currentParts.push({ text: userText });
  } else if (imageData) {
    currentParts.push({
      text: "Please examine this image and describe what you can identify."
    });
  }

  if (imageData) {
    currentParts.push({
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.data
      }
    });
  }

  contents.push({
    role: "user",
    parts: currentParts
  });

  const response = await fetch(
    API_BASE + encodeURIComponent(GEMINI_MODEL) +
      ":generateContent?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text:
              "You are J.A.R.V.I.S, a helpful personal AI assistant. " +
              "Be clear, intelligent, friendly, and concise. " +
              "Address the user respectfully. Reply in the language " +
              "the user uses, including Telugu when appropriate. " +
              "Never claim to have performed device actions unless " +
              "they were actually completed."
          }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      }),
      signal: requestController?.signal
    }
  );

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Gemini returned an unreadable response.");
  }

  if (!response.ok) {
    throw new Error(getApiError(data, response.status));
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    const reason = data?.candidates?.[0]?.finishReason;

    throw new Error(
      "Gemini returned no text. " +
      (reason ? "Finish reason: " + reason : "Please try again.")
    );
  }

  return answer;
}

/* =========================
   SEND A MESSAGE
   ========================= */

async function sendMessage(overrideText = null) {
  if (isSending) return;

  const text = String(
    overrideText !== null ? overrideText : (el.message?.value || "")
  ).trim();

  const file = selectedImage;

  if (!text && !file) return;

  if (el.message && overrideText === null) {
    el.message.value = "";
    el.message.style.height = "";
  }

  selectedImage = null;

  if (el.imageInput) {
    el.imageInput.value = "";
  }

  let imageData = null;
  let imagePreview = null;

  try {
    if (file) {
      imageData = await imageToInlineData(file);
      imagePreview = imageData.dataUrl;
    }
  } catch (error) {
    showNotice(error.message || "Could not load the image.");
    return;
  }

  ensureActiveChat();

  addMessage("user", text || "Analyze this image.", {
    image: imagePreview
  });

  saveMessage("user", text || "Analyze this image.");

  if (el.welcome) el.welcome.hidden = true;
  if (el.core) el.core.hidden = true;

  setThinking(true);

  requestController = new AbortController();

  try {
    const answer = await askGemini(
      text || "Analyze this image.",
      imageData
    );

    addMessage("ai", answer);
    saveMessage("model", answer);

    speak(answer);
  } catch (error) {
    console.error("J.A.R.V.I.S request failed:", error);

    let message = error?.message || "An unexpected error occurred.";

    if (error?.name === "AbortError") {
      message = "Request cancelled.";
    } else if (message.includes("Failed to fetch")) {
      message =
        "Could not connect to Gemini. Check your internet connection, " +
        "API key, and whether the site is running over HTTPS.";
    }

    showNotice("ERROR: " + message);
  } finally {
    requestController = null;
    setThinking(false);
    if (el.message) el.message.focus();
  }
}

/* =========================
   CLEAR AND DELETE CHATS
   ========================= */

function clearCurrentChat() {
  const chat = getActiveChat();

  if (chat) {
    chat.messages = [];
    chat.title = "New Chat";
    chat.updatedAt = Date.now();
  }

  stopSpeaking();
  saveChats();
  renderHistory();
  renderChat();
}

function clearAllMemory() {
  const confirmed = confirm(
    "Delete all saved J.A.R.V.I.S conversations from this browser?"
  );

  if (!confirmed) return;

  chats = [];
  activeChatId = null;

  try {
    localStorage.removeItem(STORAGE.chats);
    localStorage.removeItem(STORAGE.active);
  } catch (error) {
    console.warn(error);
  }

  stopSpeaking();
  makeChat();
  renderHistory();
  renderChat();
  closeSettings();
}

/* =========================
   VOICE OUTPUT
   ========================= */

function speak(text) {
  if (!speechEnabled || !("speechSynthesis" in window)) return;

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) =>
    /en-IN|en-US|en-GB|te-IN/i.test(voice.lang)
  );

  if (preferred) {
    utterance.voice = preferred;
  }

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/* =========================
   MICROPHONE AND WAKE WORD
   ========================= */

function createRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showNotice(
      "Speech recognition is not supported in this browser. " +
      "Try Chrome and allow microphone access."
    );
    return null;
  }

  const instance = new SpeechRecognition();
  instance.lang = "en-IN";
  instance.continuous = false;
  instance.interimResults = false;
  instance.maxAlternatives = 1;

  instance.onstart = () => {
    micActive = true;

    if (el.mic) {
      el.mic.classList.add("active");
      el.mic.setAttribute("aria-label", "Stop microphone");
    }

    if (wakeMode && el.wakeStatus) {
      el.wakeStatus.textContent = "Listening for Jarvis...";
    }
  };

  instance.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();

    if (!transcript) return;

    if (wakeMode) {
      const match = transcript.match(/\bhey[\s,]+jarvis\b|\bjarvis\b/i);

      if (match) {
        const command = transcript
          .slice(match.index + match[0].length)
          .replace(/^[\s,.:;-]+/, "")
          .trim();

        if (command) {
          wakeMode = false;

          if (el.wakeStatus) {
            el.wakeStatus.textContent = "Wake word detected";
          }

          sendMessage(command);
        } else {
          if (el.wakeStatus) {
            el.wakeStatus.textContent = "Jarvis activated";
          }

          if (el.message) {
            el.message.value = "";
            el.message.placeholder = "Yes, how can I help?";
            el.message.focus();
          }

          speak("Yes, how can I help?");
        }
      }

      return;
    }

    if (el.message) {
      el.message.value = transcript;
    }

    sendMessage(transcript);
  };

  instance.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);

    if (event.error === "not-allowed") {
      showNotice(
        "Microphone permission denied. Allow microphone access " +
        "in your browser settings."
      );
    } else if (event.error !== "no-speech" &&
               event.error !== "aborted") {
      showNotice("Microphone error: " + event.error);
    }
  };

  instance.onend = () => {
    micActive = false;

    if (el.mic) {
      el.mic.classList.remove("active");
      el.mic.setAttribute("aria-label", "Start microphone");
    }

    if (wakeMode) {
      // Restart wake-word listening after the previous session ends.
      setTimeout(() => {
        if (wakeMode && recognition) {
          try {
            recognition.start();
          } catch (error) {
            console.warn("Could not restart wake listening:", error);
          }
        }
      }, 500);
    }
  };

  return instance;
}

function startMicrophone() {
  if (!recognition) {
    recognition = createRecognition();
  }

  if (!recognition) return;

  wakeMode = false;
  stopSpeaking();

  try {
    recognition.start();
  } catch (error) {
    console.warn("Microphone could not start:", error);
    showNotice("Microphone is already active or unavailable.");
  }
}

function toggleWakeWord() {
  if (!recognition) {
    recognition = createRecognition();
  }

  if (!recognition) return;

  if (wakeMode) {
    wakeMode = false;

    try {
      recognition.stop();
    } catch (error) {
      console.warn(error);
    }

    if (el.wakeStatus) {
      el.wakeStatus.textContent = "Wake word disabled";
    }

    if (el.wake) {
      el.wake.classList.remove("active");
    }

    return;
  }

  wakeMode = true;

  if (el.wakeStatus) {
    el.wakeStatus.textContent = 'Say "Hey Jarvis"';
  }

  if (el.wake) {
    el.wake.classList.add("active");
  }

  stopSpeaking();

  try {
    recognition.start();
  } catch (error) {
    console.warn(error);
    showNotice(
      "Could not start wake-word listening. Try again and " +
      "allow microphone access."
    );
  }
}

/* =========================
   CAMERA / IMAGE PICKER
   ========================= */

function openImagePicker() {
  if (!el.imageInput) {
    showNotice("Image input was not found in index.html.");
    return;
  }

  el.imageInput.click();
}

function handleImageSelection(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showNotice("Please select an image file.");
    el.imageInput.value = "";
    return;
  }

  const maxBytes = 10 * 1024 * 1024;

  if (file.size > maxBytes) {
    showNotice("Please choose an image smaller than 10 MB.");
    el.imageInput.value = "";
    return;
  }

  selectedImage = file;

  if (el.message && !el.message.value.trim()) {
    el.message.placeholder = "Image selected. Add a question or send it.";
    el.message.focus();
  }
}

/* =========================
   THEME
   ========================= */

function applyTheme(theme) {
  const chosen = theme === "light" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", chosen);

  try {
    localStorage.setItem(STORAGE.theme, chosen);
  } catch (error) {
    console.warn(error);
  }

  i
