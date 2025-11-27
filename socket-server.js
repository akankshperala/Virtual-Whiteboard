// socket-server.js (place at project root)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // tighten in prod to your app origin
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  // client -> server events (server will forward to others)
  socket.on("stroke:created", (payload) => {
    // payload should be the created stroke object (with _id)
    socket.broadcast.emit("stroke:created", payload);
  });

  socket.on("stroke:updated", (payload) => {
    socket.broadcast.emit("stroke:updated", payload);
  });

  socket.on("stroke:deleted", (payload) => {
    socket.broadcast.emit("stroke:deleted", payload);
  });

  socket.on("clear:all", (payload) => {
    socket.broadcast.emit("clear:all", payload);
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", socket.id, reason);
  });
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => console.log(`Socket server listening on ${PORT}`));
