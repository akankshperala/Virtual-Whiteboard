// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const next = require("next");
// const path = require("path");

// const dev = process.env.NODE_ENV !== "production";
// const app = next({ dev });
// const handle = app.getRequestHandler();

// app.prepare().then(() => {
//   const server = express();
//   const httpServer = http.createServer(server);
//   const io = new Server(httpServer, {
//     cors: {
//       origin: "http://localhost:3000",
//       methods: ["GET", "POST"],
//     },
//   });

//   // ✅ Serve static files
//   server.use("/_next", express.static(path.join(__dirname, ".next")));

//   // 💬 Socket handlers
//   io.on("connection", (socket) => {
//     console.log("🔌 User connected:", socket.id);

//     socket.on("send-message", (data) => {
//       console.log("💬 Message:", data);
//       io.emit("receive-message", data);
//     });

//     socket.on("disconnect", () => {
//       console.log("❌ Disconnected:", socket.id);
//     });
//   });

//   // ✅ Let Next.js handle everything else
//   server.all("*", (req, res) => handle(req, res));

//   const PORT = process.env.PORT || 3001;
//   httpServer.listen(PORT, () => {
//     console.log(`🚀 Server ready at http://localhost:${PORT}`);
//   });
// });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const next = require("next");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // ✅ Serve static files
  server.use("/_next", express.static(path.join(__dirname, ".next")));

  const onlineUsers = new Map();

  // 💬 Socket handlers
  io.on("connection", (socket) => {

    const userId = socket.handshake.auth?.userId;
    if (userId) {
      onlineUsers.set(userId, socket.id);
    }
    io.emit("online-users", [...onlineUsers.keys()]);
    console.log("🔌 User connected:", socket.id)

    socket.on("send-message", (data) => {
      console.log("💬 Message:", data);
      const receiverId = data.receiverId;
      const receiverSocketId = onlineUsers.get(receiverId);

      // ✅ Send only to the receiver if they are online
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", data);
      }

      // ✅ Optionally also send to sender so they see their own message
      socket.emit("receive-message", data);
      // io.emit("receive-message", data);
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("online-users", [...onlineUsers.keys()]);
      }
    });

    // ✅ Let Next.js handle everything else
  });
  server.all("*", (req, res) => handle(req, res));

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
  });


})
