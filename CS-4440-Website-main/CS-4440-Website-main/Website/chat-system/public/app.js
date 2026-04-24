const socket = io();

const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatBox = document.getElementById("chat-box");
const loginSection = document.getElementById("login-section");
const chatSection = document.getElementById("chat-section");

let username = "";

function addMessage(text) {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

joinBtn.addEventListener("click", () => {
  username = usernameInput.value.trim();

  if (!username) {
    alert("Enter a username first.");
    return;
  }

  loginSection.classList.add("hidden");
  chatSection.classList.remove("hidden");

  socket.emit("join", username);
});

sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();

  if (!message) return;

  socket.emit("chat message", message);
  messageInput.value = "";
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

socket.on("chat message", (msg) => {
  addMessage(msg);
});