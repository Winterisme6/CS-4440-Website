/*


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
});*/




const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const path = require("path");


const app = express();
const server = http.createServer(app);
const io = new Server(server);


app.use(express.static("public"));


function createWorkerForSocket(socket) {
 const worker = new Worker(path.join(__dirname, "worker.js"));


 // When the worker finishes processing, broadcast the result
 worker.on("message", (data) => {
   if (data.type === "broadcast") {
     io.emit("chat message", data.payload);
   }
 });


 worker.on("error", (err) => {
   console.error(`Worker error for socket ${socket.id}:`, err);
 });


 worker.on("exit", (code) => {
   if (code !== 0) {
     console.error(`Worker for socket ${socket.id} exited with code ${code}`);
   }
 });


 return worker;
}


io.on("connection", (socket) => {
 console.log("User connected:", socket.id);


 const worker = createWorkerForSocket(socket);


 socket.on("join", (username) => {
   socket.username = username;


   worker.postMessage({
     type: "join",
     payload: { username },
   });
 });


 socket.on("chat message", (msg) => {
   const username = socket.username || "Anonymous";


   worker.postMessage({
     type: "chat message",
     payload: { username, text: msg },
   });
 });


 socket.on("disconnect", () => {
   const username = socket.username || "A user";
   console.log("User disconnected:", socket.id);


   worker.postMessage({
     type: "disconnect",
     payload: { username },
   });


   worker.terminate();
 });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
 console.log(`Server running at http://localhost:${PORT}`);
});
