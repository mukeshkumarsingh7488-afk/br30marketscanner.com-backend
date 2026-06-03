process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION =>", err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION =>", err);
});

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const scannerRoutes = require("./routes/scannerRoutes");
const authRoutes = require("./routes/authRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());

app.use(express.json({ limit: "10mb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ BR30 Market Scanner MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BR30 Market Scanner Backend Running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/subscription", subscriptionRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: "API route not found",
  });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BR30 Market Scanner Backend running on port ${PORT}`);
});

server.on("error", (err) => {
  console.log("SERVER LISTEN ERROR =>", err);
});
