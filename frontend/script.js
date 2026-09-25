const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const send = document.getElementById('send');

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  add('YOU: ' + text, 'user');
  input.value = '';
  add('J.A.R.V.I.S: Processing...', 'ai');

  setTimeout(() => {
    chat.lastChild.innerText = 'J.A.R.V.I.S: Systems online. How may I assist you, Boss?';
  }, 1000);
}

send.addEventListener('click', sendMessage);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

function add(text, who) {
  const message = document.createElement('div');
  message.className = 'msg ' + who;
  message.innerText = text;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}
