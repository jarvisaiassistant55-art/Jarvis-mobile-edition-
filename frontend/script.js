const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const send = document.getElementById("send");

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = "message " + type;
  message.textContent = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}

function jarvisResponse(command) {
  const text = command.toLowerCase().trim();

  // Validate input
  if (!text || text.length === 0) {
    return "J.A.R.V.I.S.: Please provide a command, Boss.";
  }

  if (text.includes("hello") || text.includes("hi")) {
    return "J.A.R.V.I.S.: Hello, Boss. How may I assist you?";
  }

  if (text.includes("status")) {
    return "J.A.R.V.I.S.: All systems are currently online.";
  }

  if (text.includes("time")) {
    return "J.A.R.V.I.S.: The current time is " + new Date().toLocaleTimeString();
  }

  if (text.includes("date")) {
    return "J.A.R.V.I.S.: Today is " + new Date().toLocaleDateString();
  }

  if (text.includes("youtube")) {
    window.open("https://www.youtube.com", "_blank");
    return "J.A.R.V.I.S.: Opening YouTube.";
  }

  if (text.includes("whatsapp")) {
    window.open("https://web.whatsapp.com", "_blank");
    return "J.A.R.V.I.S.: Opening WhatsApp.";
  }

  if (text.includes("who are you")) {
    return "J.A.R.V.I.S.: I am your personal AI assistant.";
  }

  if (text.includes("help")) {
    return "J.A.R.V.I.S.: I am ready for your command, Boss.";
  }

  return "J.A.R.V.I.S.: Command received. Processing...";
}

function processCommand() {
  const command = input.value.trim();

  if (!command) {
    return;
  }

  addMessage("YOU: " + command, "user");
  input.value = "";

  addMessage("J.A.R.V.I.S.: Processing...", "ai");

  setTimeout(() => {
    const messages = document.querySelectorAll(".message");
    const lastMessage = messages[messages.length - 1];
    lastMessage.textContent = jarvisResponse(command);
  }, 800);
}

send.addEventListener("click", processCommand);

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    processCommand();
  }
});
