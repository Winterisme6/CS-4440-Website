const { parentPort } = require("worker_threads");


parentPort.on("message", (data) => {
 const { type, payload } = data;


 switch (type) {
   case "chat message": {
     const processed = processMessage(payload);


     parentPort.postMessage({
       type: "broadcast",
       payload: processed,
     });
     break;
   }


   case "join": {
     const announcement = `${payload.username} joined the chat`;


     parentPort.postMessage({
       type: "broadcast",
       payload: { username: "System", text: announcement, timestamp: Date.now() },
     });
     break;
   }


   case "disconnect": {
     const announcement = `${payload.username} left the chat`;


     parentPort.postMessage({
       type: "broadcast",
       payload: { username: "System", text: announcement, timestamp: Date.now() },
     });
     break;
   }


   default:
     console.warn("Worker received unknown message type:", type);
 }
});


function processMessage(payload) {
 const text = sanitize(payload.text);


 return {
   username: payload.username || "Anonymous",
   text,
   timestamp: Date.now(),
 };
}


function sanitize(str) {
 return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

