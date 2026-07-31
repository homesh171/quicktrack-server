import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import initSocket from "./sockets/index.js";

import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors({ origin: "https://quicktrack-client.vercel.app" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "https://quicktrack-client.vercel.app" },
});
initSocket(io);

// make io available inside route handlers via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => res.send("QuickTrack API is running"));
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`QuickTrack server running on port ${PORT}`));
