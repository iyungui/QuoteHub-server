// controllers/authController.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// JWT 비밀 키
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;

// JWT 토큰 생성 함수
const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" }); // 15분 후 만료
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: "30d" }); // 30일 후 만료
};

// 소셜 로그인 성공 시 처리할 함수
const handleSocialLogin = async (req, res) => {
  const user = req.user; // Passport가 자동으로 user를 설정함

  // 소셜 로그인에서 이메일 정보가 제공되지 않으면 처리
  if (user.email) {
    // 사용자 정보에 이메일 추가
    await User.findByIdAndUpdate(user.id, { email: user.email });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Refresh Token 저장
  await User.findByIdAndUpdate(user.id, { refreshToken });

  // 토큰을 클라이언트에 응답
  res.status(200).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email, // 이메일 추가
      nickname: user.nickname,
      profileImage: user.profileImage,
    },
  });
};

// 이메일 로그인 처리 함수 (예시)
const emailLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // 사용자 확인 및 비밀번호 체크 로직 (비밀번호 해싱 처리 필요)
  if (!user || !user.checkPassword(password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Refresh Token 저장
  await User.findByIdAndUpdate(user.id, { refreshToken });

  res.status(200).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      nickname: user.nickname,
      profileImage: user.profileImage,
    },
  });
};

// 로그아웃 처리 함수
const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  handleSocialLogin,
  emailLogin,
  logout,
};
