// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const helmet = require("helmet");
require('dotenv').config();

const { getCorsOptions, validateRequiredEnv } = require("./config/env");

validateRequiredEnv();

const app = express();
const server = http.createServer(app);

// routes
const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/books");
const bookStoriesRoutes = require("./routes/bookstories");
const bookStoriesCommentsRoutes = require("./routes/bookstoriesComments");
const folderRoutes = require("./routes/Folders");
const reportRoutes = require("./routes/blockReportRoutes");

// MongoDB 연결 설정
const MONGO_URI = process.env.MONGO_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// 서버 보안 모듈
app.use(helmet());
app.set("trust proxy", 1);

// AWS health check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/health/ready", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: "ok", database: "connected" });
  }

  return res.status(503).json({ status: "error", database: "disconnected" });
});

// Middleware
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", userRoutes);
app.use("/book", bookRoutes);
app.use("/bookstories", bookStoriesRoutes);
app.use("/bookstoriesComments", bookStoriesCommentsRoutes);
app.use("/folder", folderRoutes);
app.use("/block-report", reportRoutes);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error("Internal server error:", err.stack);
  if (process.env.NODE_ENV === "production") {
    res.status(500).send("Something went wrong!");
  } else {
    res.status(500).send(`Something went wrong! Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
