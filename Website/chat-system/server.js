const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (username) => {
    socket.username = username;
    io.emit("chat message", `${username} joined the chat`);
  });

  socket.on("chat message", (msg) => {
    const username = socket.username || "Anonymous";
    io.emit("chat message", `${username}: ${msg}`);
  });

  socket.on("disconnect", () => {
    const username = socket.username || "A user";
    io.emit("chat message", `${username} left the chat`);
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});