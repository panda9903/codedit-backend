const express = require("express");
const app = express();

const server = require("http").Server(app);
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const io = new Server(server);

const userSocketMap = {};

const getAllClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("join", ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clientsList = getAllClients(roomId);

    console.log("clientsList", clientsList);

    clientsList.forEach((client) => {
      io.to(roomId).emit("joined", {
        clientsList,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on("code-change", ({ roomId, code }) => {
    console.log("code-change", roomId, code);
    socket.broadcast.in(roomId).emit("code-change", code);
  });

  socket.on("sync-code", ({ socketId, code }) => {
    //console.log("code-change", roomId, code);
    io.to(socketId).emit("code-change", code);
  });

  socket.on("disconnecting", () => {
    console.log("disconnecting", socket.id);
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.to(roomId).emit("disconnected", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
