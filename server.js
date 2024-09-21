// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
require("./config/passport");

const http = require("http");
const helmet = require("helmet");
require("dotenv").config({ path: "./config/.env" });
const app = express();
const server = http.createServer(app);

// routes
const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/books");
const bookStoriesRoutes = require("./routes/bookstories");
const bookStoriesCommentsRoutes = require("./routes/bookstoriesComments");
const followRoutes = require("./routes/follows");
const folderRoutes = require("./routes/Folders");
const reportRoutes = require("./routes/reportRoutes");

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

// AWS health check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use("/", userRoutes);
app.use("/book", bookRoutes);
app.use("/bookstories", bookStoriesRoutes);
app.use("/bookstoriesComments", bookStoriesCommentsRoutes);
app.use("/follow", followRoutes);
app.use("/folder", folderRoutes);
app.use("/reports", reportRoutes);

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error("Internal server error:", err.stack);
  if (process.env.NODE_ENV === "production") {
    res.status(500).send("Something went wrong!");
  } else {
    res.status(500).send(`Something went wrong! Error: ${err.message}`);
  }
});

// server connect, Github Actions Test
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
