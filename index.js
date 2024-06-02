const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = require("http").Server(app);
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;
const io = new Server(server);
console.log("Jdge 0", process.env.JUDGE0_API_KEY);
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

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/submit", async (req, res) => {
  const { code, code_language, stdin, stdout } = req.body;

  let code_language_id = 0;

  if (code_language === "python") {
    code_language_id = 71;
  }
  if (code_language === "cpp") {
    code_language_id = 54;
  }
  if (code_language === "java") {
    code_language_id = 62;
  }
  if (code_language === "javascript") {
    code_language_id = 63;
  }
  if (code_language === "c") {
    code_language_id = 50;
  }
  if (code_language === "rust") {
    code_language_id = 73;
  }
  if (code_language === "php") {
    code_language_id = 68;
  }
  if (code_language === "go") {
    code_language_id = 60;
  }
  if (code_language === "typescript") {
    code_language_id = 74;
  }

  let statusOfCode = "";
  let outputofCode = "";
  let stderr = "";

  const options = {
    method: "POST",
    url: "https://judge0-ce.p.rapidapi.com/submissions",
    params: {
      base64_encoded: "true",
      wait: "true",
      fields: "*",
    },
    headers: {
      "content-type": "application/json",
      "Content-Type": "application/json",
      "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
    data: {
      language_id: code_language_id,
      source_code: btoa(code),
      stdin: btoa(stdin),
      stdout: btoa(stdout),
    },
  };

  try {
    const response = await axios.request(options);
    console.log(response.data, " from judge0");
    //console.log(atob(response.data.source_code), " code from judge0");
    //console.log(atob(response.data.stdout), " output from judge0");

    //console.log(response.data.stderr, " error from judge0");
    //console.log(response.data.status, " status from judge0");

    statusOfCode = response.data.status.description.toString();
    outputofCode = atob(response.data.stdout).toString();
    stderr = atob(response.data.stderr).toString();

    if (statusOfCode !== "Accepted") {
      outputofCode = "";
    }

    console.log(statusOfCode, " status from judge0");
    console.log(outputofCode, " output from judge0");
  } catch (error) {
    console.error(error);
  }

  res.json({ statusOfCode, outputofCode, stderr });
});

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
    //console.log("code-change", roomId, code);
    socket.broadcast.to(roomId).emit("code-change", code, (setValue = true));
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
