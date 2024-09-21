// routes/userRoutes.js
const express = require("express");
const passport = require("passport");
const { handleSocialLogin } = require("../controllers/authController");
const router = express.Router();

// Apple 로그인 라우트
router.get("/auth/apple", passport.authenticate("apple"));

router.get(
  "/auth/apple/callback",
  passport.authenticate("apple", {
    failureRedirect: "/login",
    session: false, // 세션을 사용하지 않으려면 false로 설정
  }),
  handleSocialLogin
);

// Google 로그인 라우트
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  handleSocialLogin
);

// Kakao 로그인 라우트
router.get("/auth/kakao", passport.authenticate("kakao"));

router.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", {
    failureRedirect: "/login",
    session: false,
  }),
  handleSocialLogin
);

module.exports = router;
