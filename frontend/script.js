
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);

  const el = {
    sidebar: $("sidebar"),
    sidebarToggle: $("sidebar-toggle"),
    menu: $("menu-btn"),
    backdrop: $("sidebar-backdrop"),
    newChat: $("new-chat"),
    history: $("history-list"),
    historyCount: $("history-count"),
    stage: $("conversation-stage"),
    welcome: $("welcome"),
    chat: $("chat"),
    msg: $("msg"),
    send: $("send"),
    clear: $("clear-btn"),
    cam: $("cam-btn"),
    image: $("img-input"),
    mic: $("mic-btn"),
    wake: $("wake-btn"),
    wakeStatus: $("wake-status"),
    thinking: $("thinking-status"),
    thinkingLabel: $("thinking-label"),
    settingsOpen: $("settings-open"),
    settingsClose: $("settings-close"),
    settings: $("settings-panel"),
    settingsScrim: $("settings-scrim"),
    theme: $("theme-select"),
    apiKey: $("api-key-input"),
    saveKey: $("save-key-btn"),
    removeKey: $("remove-key-btn"),
    clearSetting: $("clear-memory-setting")
  };

  // ---------- Storage ----------
  const STORAGE_CHATS = "jarvis_chats_v1";
  const STORAGE_CURRENT = "jarvis_current_chat_v1";
  const STORAGE_THEME = "jarvis_theme_v1";
  const STORAGE_KEY = "jarvis_key";

  const MODEL = "gemini-2.5-flash";
  const API_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/models/";

  let chats = loadJSON(STORAGE_CHATS, []);
  if (!Array.isArray(chats)) chats = [];
  chats = chats.filter(c =>
    c && typeof c.id === "string" && Array.isArray(c.messages)
  );

  let currentId = localStorage.getItem(STORAGE_CURRENT);
  let busy = false;
  let pendingImage = null;
  let recognition = null;
  let wakeRecognition = null;
  let wakeEnabled = false;
  let manualMic = false;
  let wakeRestartTimer = null;
  let speakReplies = true;

  function loadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveChats() {
    try {
      localStorage.setItem(STORAGE_CHATS, JSON.stringify(chats));
      localStorage.setItem(STORAGE_CURRENT, currentId || "");
      renderHistory();
    } catch (error) {
      showNotice("Browser storage is full. Clear old conversations.");
    }
  }

  function makeChat() {
    const chat = {
      id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
      title: "New conversation",
      messages: [],
      updatedAt: Date.now()
    };
    chats.unshift(chat);
    currentId = chat.id;
    saveChats();
    renderChat();
    return chat;
  }

  function getCurrentChat() {
    return chats.find(c => c.id === currentId) || null;
  }

  // ---------- UI ----------
  function showNotice(message) {
    addMessage("model", message, { error: true, save: false });
  }

  function addMessage(role, text, options = {}) {
    const row = document.createElement("div");
    row.className = "message-row " +
      (role === "user" ? "user" : "ai") +
      (options.error ? " error" : "");

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "Y" : "J";

    const content = document.createElement("div");
    content.className = "message-content";

    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = role === "user" ? "YOU" : "J.A.R.V.I.S";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    content.append(label, bubble);

    if (options.imageUrl) {
      const img = document.createElement("img");
      img.className = "message-image";
      img.src = options.imageUrl;
      img.alt = "Attached image";
      content.appendChild(img);
    }

    row.append(avatar, content);
    el.chat.appendChild(row);
    el.welcome.hidden = true;
    el.stage.scrollTop = el.stage.scrollHeight;
    return row;
  }

  function renderChat() {
    el.chat.replaceChildren();
    const chat = getCurrentChat();

    if (!chat || chat.messages.length === 0) {
      el.welcome.hidden = false;
      return;
    }

    el.welcome.hidden = true;
    for (const m of chat.messages) {
      addMessage(m.role, m.text, { save: false });
    }
    el.stage.scrollTop = el.stage.scrollHeight;
  }

  function renderHistory() {
    el.history.replaceChildren();
    el.historyCount.textContent = String(chats.length);

    for (const chat of chats.slice(0, 50)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item" +
        (chat.id === currentId ? " active" : "");
      button.title = chat.title;

      const icon = document.createElement("span");
      icon.textContent = "◷";
      const title = document.createElement("span");
      title.textContent = chat.title || "New conversation";
      button.append(icon, title);

      button.addEventListener("click", () => {
        currentId = chat.id;
        localStorage.setItem(STORAGE_CURRENT, currentId);
        renderHistory();
        renderChat();
        closeSidebar();
      });

      el.history.appendChild(button);
    }
  }

  function setBusy(value) {
    busy = value;
    el.send.disabled = value;
    el.send.textContent = value ? "…" : "↑";
    el.thinking.hidden = !value;
    el.thinkingLabel.textContent = "J.A.R.V.I.S is thinking";
    if (value) el.stage.scrollTop = el.stage.scrollHeight;
  }

  function saveMessage(role, text) {
    const chat = getCurrentChat() || makeChat();
    chat.messages.push({ role, text });
    chat.updatedAt = Date.now();

    if (role === "user" && chat.title === "New conversation") {
      chat.title = text.slice(0, 42) || "New conversation";
    }

    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    saveChats();
  }

  function clearCurrentChat() {
    const chat = getCurrentChat();
    if (chat) {
      chats = chats.filter(c => c.id !== chat.id);
    }
    pendingImage = null;
    el.image.value = "";
    currentId = "";
    saveChats();
    makeChat();
    closeSettings();
  }

  // ---------- Gemini API ----------
  function getApiKey() {
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
      key = window.prompt(
        "Enter your Gemini API key. You can also save it in Settings:"
      );
      if (key && key.trim()) {
        key = key.trim();
        localStorage.setItem(STORAGE_KEY, key);
        el.apiKey.value = key;
      }
    }
    return key && key.trim() ? key.trim() : null;
  }

  function getApiError(data, status) {
    const message = data?.error?.message || "Unknown API error";
    if (status === 400 || status === 401 || status === 403) {
      return "Gemini API rejected the request. Check that your API key is valid, " +
        the Generative Language API is enabled, and your key has the right restrictions. " +
        "Details: " + message;
    }
    if (status === 429) {
      return "Gemini rate limit or quota reached. Wait a little, check your quota, " +
        "or try again. Details: " + message;
    }
    if (status === 404) {
      return "The configured Gemini model may not be available to your API key. " +
        "Change MODEL in script.js to a currently supported model. Details: " + message;
    }
    return "Gemini API error (" + status + "): " + message;
  }

  async function askGemini(userText, imageDataUrl) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("No API key provided. Open Settings and save your Gemini API key.");
    }

    const chat = getCurrentChat();
    const history = (chat?.messages || []).slice(-24);

    const contents = history.map(m => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    const parts = [{ text: userText || "Please analyze this image." }];

    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) throw new Error("The selected image could not be read.");

      parts.push({
        inline_data: {
          mime_type: match[1],
          data: match[2]
        }
      });
    }

    contents.push({ role: "user", parts });

    const response = await fetch(
      API_ENDPOINT + encodeURIComponent(MODEL) +
      ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Gemini returned an unreadable response.");
    }

    if (!response.ok) {
      throw new Error(getApiError(data, response.status));
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!answer) {
      const reason = data.candidates?.[0]?.finishReason;
      throw new Error(
        "Gemini returned no text" + (reason ? " (" + reason + ")" : "") +
        ". Please try a different prompt."
      );
    }

    return answer;
  }

  // ---------- Send messages ----------
  async function sendMessage(forcedText) {
    if (busy) return;

    const text = (typeof forcedText === "string" ? forcedText : el.msg.value).trim();
    const imageData = pendingImage;

    if (!text && !imageData) return;

    if (!getCurrentChat()) makeChat();

    const imageForDisplay = imageData;
    const userText = text || "Please analyze the attached image.";

    el.msg.value = "";
    resizeTextarea();
    pendingImage = null;
    el.image.value = "";

    addMessage("user", userText, { imageUrl: imageForDisplay });
    saveMessage("user", userText);
    setBusy(true);

    try {
      const answer = await askGemini(userText, imageData);
      addMessage("model", answer);
      saveMessage("model", answer);
      if (speakReplies) speak(answer);
    } catch (error) {
      addMessage("model", error.message || "Something went wrong.", { error: true });
    } finally {
      setBusy(false);
      el.msg.focus();
    }
  }

  el.send.addEventListener("click", () => sendMessage());

  el.msg.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  });

  el.msg.addEventListener("input", resizeTextarea);

  function resizeTextarea() {
    el.msg.style.height = "auto";
    el.msg.style.height = Math.min(el.msg.scrollHeight, 150) + "px";
  }

  document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      el.msg.value = button.dataset.prompt || "";
      sendMessage();
    });
  });

  el.newChat.addEventListener("click", () => {
    pendingImage = null;
    el.image.value = "";
    makeChat();
    closeSidebar();
    el.msg.focus();
  });

  el.clear.addEventListener("click", clearCurrentChat);
  el.clearSetting.addEventListener("click", clearCurrentChat);

  // ---------- Image attachment ----------
  el.cam.addEventListener("click", () => el.image.click());

  el.image.addEventListener("change", () => {
    const file = el.image.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("Please choose an image file.");
      el.image.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showNotice("That image is larger than 8 MB. Please choose a smaller image.");
      el.image.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      pendingImage = typeof reader.result === "string" ? reader.result : null;
      if (pendingImage) {
        showNotice("Image attached. Add a question or press Send to analyze it.");
        el.msg.focus();
      } else {
        showNotice("Could not read that image.");
      }
    };
    reader.onerror = () => showNotice("Failed to read the selected image.");
    reader.readAsDataURL(file);
  });

  // ---------- Voice input ----------
  function speechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  el.mic.addEventListener("click", startVoiceInput);

  function startVoiceInput() {
    const SpeechRecognition = speechRecognitionConstructor();

    if (!SpeechRecognition) {
      showNotice("Voice input is not supported by this browser. Try a supported browser over HTTPS.");
      return;
    }
    if (recognition) {
      recognition.stop();
      return;
    }

    manualMic = true;
    recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    el.mic.classList.add("active");
    el.mic.title = "Listening…";

    recognition.onresult = event => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      el.msg.value = transcript.trim();
      resizeTextarea();
    };

    recognition.onerror = event => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        showNotice("Voice input error: " + event.error);
      }
    };

    recognition.onend = () => {
      recognition = null;
      manualMic = false;
      el.mic.classList.remove("active");
      el.mic.title = "Voice input";
      el.msg.focus();
    };

    try {
      recognition.start();
    } catch {
      recognition = null;
      manualMic = false;
      el.mic.classList.remove("active");
      showNotice("Could not start the microphone. Check browser permissions.");
    }
  }

  // ---------- Spoken replies ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  // ---------- Hey Jarvis wake word ----------
  // Browser support varies. Mobile browsers may stop listening in the background.
  el.wake.addEventListener("click", toggleWakeWord);

  function toggleWakeWord() {
    if (wakeEnabled) {
      stopWakeWord();
      return;
    }

    const SpeechRecognition = speechRecognitionConstructor();
    if (!SpeechRecognition) {
      showNotice("Wake-word listening is not supported in this browser.");
      return;
    }

    wakeEnabled = true;
    el.wake.classList.add("active");
    el.wakeStatus.textContent = "WAKE: ON";
    listenForWakeWord(SpeechRecognition);
  }

  function listenForWakeWord(SpeechRecognition) {
    if (!wakeEnabled || wakeRecognition || manualMic) return;

    const instance = new SpeechRecognition();
    wakeRecognition = instance;
    instance.lang = navigator.language || "en-US";
    instance.continuous = true;
    instance.interimResults = false;

    instance.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;

        const transcript = event.results[i][0].transcript.trim();
        const lower = transcript.toLowerCase();
        const match = lower.match(/\bhey[\s,]+jarvis\b|\bjarvis\b/);

        if (match) {
          const command = transcript.slice(match.index + match[0].length)
            .replace(/^[\s,.:;!-]+/, "").trim();

          if (command) {
            stopWakeRecognitionOnly();
            sendMessage(command);
            if (wakeEnabled) {
              wakeRestartTimer = setTimeout(() => {
                if (wakeEnabled) listenForWakeWord(SpeechRecognition);
              }, 1200);
            }
          } else {
            speak("Yes, how can I help?");
          }
        }
      }
    };

    instance.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopWakeWord();
        showNotice("Microphone permission was denied. Allow microphone access in browser settings.");
      }
    };

    instance.onend = () => {
      if (wakeRecognition === instance) wakeRecognition = null;
      if (wakeEnabled && !manualMic) {
        clearTimeout(wakeRestartTimer);
        wakeRestartTimer = setTimeout(() => {
          if (wakeEnabled) listenForWakeWord(SpeechRecognition);
        }, 900);
      }
    };

    try {
      instance.start();
    } catch {
      if (wakeRecognition === instance) wakeRecognition = null;
    }
  }

  function stopWakeRecognitionOnly() {
    const instance = wakeRecognition;
    wakeRecognition = null;
    if (instance) {
      try { instance.stop(); } catch {}
    }
  }

  function stopWakeWord() {
    wakeEnabled = false;
    clearTimeout(wakeRestartTimer);
    stopWakeRecognitionOnly();
    el.wake.classList.remove("active");
    el.wakeStatus.textContent = "WAKE: OFF";
  }

  // ---------- Sidebar ----------
  function openSidebar() {
    el.sidebar.classList.add("mobile-open");
    el.backdrop.hidden = false;
  }

  function closeSidebar() {
    el.sidebar.classList.remove("mobile-open");
    el.backdrop.hidden = true;
  }

  el.menu.addEventListener("click", openSidebar);
  el.backdrop.addEventListener("click", closeSidebar);
  el.sidebarToggle.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      closeSidebar();
    } else {
      el.sidebar.classList.toggle("sidebar-collapsed");
    }
  });

  // ---------- Settings and theme ----------
  function openSettings() {
    el.settings.hidden = false;
    el.settingsScrim.hidden = false;
    el.apiKey.value = localStorage.getItem(STORAGE_KEY) || "";
    el.theme.value = document.documentElement.dataset.theme || "dark";
  }

  function closeSettings() {
    el.settings.hidden = true;
    el.settingsScrim.hidden = true;
  }

  el.settingsOpen.addEventListener("click", openSettings);
  el.settingsClose.addEventListener("click", closeSettings);
  el.settingsScrim.addEventListener("click", closeSettings);

  function applyTheme(theme) {
    const safeTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = safeTheme;
    localStorage.setItem(STORAGE_THEME, safeTheme);
    el.theme.value = safeTheme;
  }

  el.theme.addEventListener("change", () => applyTheme(el.theme.value));

  el.saveKey.addEventListener("click", () => {
    const key = el.apiKey.value.trim();
    if (!key) {
      showNotice("Paste a valid Gemini API key before saving.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, key);
    showNotice("API key saved in this browser.");
  });

  el.removeKey.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    el.apiKey.value = "";
    showNotice("Saved API key removed.");
  });

  // ---------- Keyboard and initialization ----------
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSettings();
      closeSidebar();
    }
  });

  const savedTheme = localStorage.getItem(STORAGE_THEME) || "dark";
  applyTheme(savedTheme);

  if (!getCurrentChat() && chats.length) {
    currentId = chats[0].id;
  }
  if (!getCurrentChat()) makeChat();

  renderHistory();
  renderChat();

  // Register the service worker only on HTTPS or localhost.
  if ("serviceWorker" in navigator &&
      (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.warn("Service worker registration failed:", error);
      });
    });
  }
})();
