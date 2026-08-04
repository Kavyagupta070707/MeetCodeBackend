import { Server } from "socket.io";

const roomUsers = new Map();

const getRoomUsers = (roomId) => roomUsers.get(roomId) || new Map();

const removeSocketFromRooms = (socket) => {
  for (const [roomId, users] of roomUsers.entries()) {
    if (!users.has(socket.id)) continue;

    users.delete(socket.id);
    socket.to(roomId).emit("user-left", { socketId: socket.id });

    if (users.size === 0) {
      roomUsers.delete(roomId);
    }
  }
};

export const initializeSocket = (server, clientUrl) => {
  const io = new Server(server, {
    cors: {
      origin: clientUrl || true,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, user }) => {
      if (!roomId || !user?.id) return;

      const users = getRoomUsers(roomId);
      roomUsers.set(roomId, users);

      socket.join(roomId);
      users.set(socket.id, user);

      socket.emit("room-users", {
        users: [...users.entries()]
          .filter(([socketId]) => socketId !== socket.id)
          .map(([socketId, roomUser]) => ({ socketId, user: roomUser })),
      });

      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        user,
      });
    });

    socket.on("offer", ({ to, offer }) => {
      if (!to || !offer) return;
      io.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      if (!to || !answer) return;
      io.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      if (!to || !candidate) return;
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("chat-message", ({ roomId, message }) => {
      if (!roomId || !message?.text) return;

      io.to(roomId).emit("chat-message", {
        id: `${Date.now()}_${socket.id}`,
        text: message.text,
        sender: message.sender,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on("join-code-room", ({ roomId }) => {
      if (!roomId) return;
      socket.join(`code:${roomId}`);
    });

    socket.on("code-change", ({ roomId, code, language }) => {
      if (!roomId || typeof code !== "string") return;
      socket.to(`code:${roomId}`).emit("code-change", { code, language });
    });

    socket.on("language-change", ({ roomId, language, code }) => {
      if (!roomId || !language) return;
      socket.to(`code:${roomId}`).emit("language-change", { language, code });
    });

    socket.on("disconnect", () => {
      removeSocketFromRooms(socket);
    });
  });

  return io;
};
