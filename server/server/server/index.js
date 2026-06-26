const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const User = mongoose.model("User", {
  phone: String,
  username: String,
  verified: Boolean
});

const OTP = mongoose.model("OTP", {
  phone: String,
  code: String,
  used: Boolean
});

const Message = mongoose.model("Message", {
  from: String,
  to: String,
  text: String,
  room: String,
  time: { type: Date, default: Date.now }
});

app.post("/request", (req, res) => {
  res.json({ message: "Request received" });
});

app.post("/generate-otp", async (req, res) => {
  const { phone } = req.body;

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.create({ phone, code, used: false });

  res.json({ phone, code });
});

app.post("/verify", async (req, res) => {
  const { phone, code, username } = req.body;

  const otp = await OTP.findOne({ phone, code, used: false });

  if (!otp) return res.json({ error: "Invalid OTP" });

  otp.used = true;
  await otp.save();

  await User.create({ phone, username, verified: true });

  res.json({ message: "User verified" });
});

app.post("/message", async (req, res) => {
  const { from, to, text } = req.body;

  const room = [from, to].sort().join("_");

  const msg = await Message.create({ from, to, text, room });

  io.to(room).emit("new-message", msg);

  res.json(msg);
});

io.on("connection", (socket) => {
  socket.on("join-room", (room) => {
    socket.join(room);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
