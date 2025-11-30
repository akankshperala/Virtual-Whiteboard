// socket-server.js
// Custom Next.js + Socket.IO server (CommonJS)
// Run with: node socket-server.js
// NOTE: in dev, run your Next dev server via this script (it starts Next internally)

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

  // Allow socket connections from your client origin(s)
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ["GET", "POST"],
    },
  });

  // Serve Next static files (only necessary if you want to serve built files from same server)
  server.use("/_next", express.static(path.join(__dirname, ".next")));

  // Keep an in-memory map of online users (userId -> socketId)
  // You can expand this to support multiple sockets per user (map userId -> Set(socketIds))
  const onlineUsers = new Map();

  // ---------- Socket handlers ----------
  io.on("connection", (socket) => {
    // Prefer auth.userId passed on connect (socket.io client: io(url, { auth: { userId } }))
    const userId = socket.handshake.auth && socket.handshake.auth.userId;
    if (userId) {
      onlineUsers.set(userId, socket.id);
    }

    // Broadcast online users list to all connected clients
    io.emit("online-users", [...onlineUsers.keys()]);
    // console.log("🔌 Socket connected:", socket.id, "userId:", userId ?? "<no-userId>");

    // === Whiteboard events ===
    // When a client creates a stroke, they should include the created stroke object
    // server will broadcast to all other clients (exclude sender)
    socket.on("stroke:created", (payload) => {
      // payload expected: { _id, shape, points, color, size, width?, height?, sourceClient? }
      // console.error(1111111111)
      console.error(payload,"payload")
      socket.broadcast.emit("stroke:created", payload);
    });

    // When a client updates a stroke
    socket.on("stroke:updated", (payload) => {
      socket.broadcast.emit("stroke:updated", payload);
    });

    // When a client deletes a stroke (clear one)
    socket.on("stroke:deleted", (payload) => {
      // payload expected { _id, sourceClient? }
      socket.broadcast.emit("stroke:deleted", payload);
    });

    // When a client clears all strokes
    socket.on("clear:all", (payload) => {
      // payload may be { sourceClient? }
      socket.broadcast.emit("clear:all", payload);
    });
    // when a client sends an undo snapshot, broadcast to everyone else
socket.on("undo", ({ sourceClient, snapshot,pageId }) => {
  // optional: validate snapshot shape here, or check auth
  socket.broadcast.emit("undo", { sourceClient, snapshot,pageId });
});

// when a client sends a redo snapshot, broadcast to everyone else
socket.on("redo", ({ sourceClient, snapshot,pageId }) => {
  socket.broadcast.emit("redo", { sourceClient, snapshot,pageId });
});

    // Messaging example you already had (keeps targeted messaging)
    socket.on("send-message", (data) => {
      const receiverId = data.receiverId;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", data);
      }
      // Emit to sender as confirmation
      socket.emit("receive-message", data);
    });

    // When the socket disconnects, remove from onlineUsers and broadcast update
    socket.on("disconnect", (reason) => {
      if (userId) {
        // Remove the userId mapping only if the same socket id is recorded
        const recorded = onlineUsers.get(userId);
        if (recorded === socket.id) {
          onlineUsers.delete(userId);
        }
        io.emit("online-users", [...onlineUsers.keys()]);
      }
      // console.log("❌ Socket disconnected:", socket.id, "reason:", reason);
    });

    // Optional: a ping/pong keepalive to track liveness
    socket.on("ping-server", () => socket.emit("pong-server", Date.now()));
  });

  // Use a regex route so Express + path-to-regexp don't misinterpret special patterns.
  // This tells Next to handle every route that wasn't handled above.
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  const PORT = parseInt(process.env.PORT || "3001", 10);
  httpServer.listen(PORT, () => {
    console.log(`🚀 Custom Next + Socket.IO server running on http://localhost:${PORT}`);
    console.log(`   Socket.IO CORS origin: ${CLIENT_ORIGIN}`);
  });
}).catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
