// controllers/authController.js
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AppleAuth = require("apple-auth");
const User = require("../models/User");
const { sendSuccess, sendError } = require('../utils/responseHelper');

// JWT 비밀 키
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;

// Apple Auth 설정
const appleAuthConfig = {
  client_id: process.env.APPLE_CLIENT_ID,
  team_id: process.env.APPLE_TEAM_ID,
  key_id: process.env.APPLE_KEY_ID,
  redirect_uri: process.env.APPLE_REDIRECT_URI || "https://domain/auth/apple/callback",
  scope: "name"
};

const auth = new AppleAuth(
  appleAuthConfig,
  process.env.APPLE_PRIVATE_KEY ? process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  'text'
);

// JWT 토큰 생성 함수
const generateAccessToken = (user) => {
  return jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "1d" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ _id: user._id }, REFRESH_TOKEN_SECRET, { expiresIn: "14d" });
};

// 고유한 닉네임 생성 함수
const generateUniqueNickname = async () => {
  try {
    for (let attempts = 0; attempts < 10; attempts++) {
      const response = await axios.get("https://nickname.hwanmoo.kr/", {
        params: {
          format: "json",
          count: 1,
        },
      });

      const nickname = response.data.words[0];
      const existingUser = await User.findOne({ nickname: nickname });

      if (!existingUser) {
        return nickname;
      }
    }
    throw new Error("Unable to generate unique nickname after multiple attempts");
  } catch (error) {
    console.error("Error in generateUniqueNickname:", error);
    throw error;
  }
};

// Apple 로그인 콜백 처리
const appleCallback = async (req, res) => {
  try {
    console.log(Date().toString() + " POST /auth/apple/callback");

    const response = await auth.accessToken(req.body.code);
    console.log('Received code:', req.body.code);
    
    const idToken = jwt.decode(response.id_token);
    let user = await User.findOne({ appleId: idToken.sub });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const nickname = await generateUniqueNickname();
      const newUser = {
        appleId: idToken.sub,
        nickname: nickname
      };

      user = new User(newUser);
      await user.save();
    } else {
      user.refreshToken = response.refresh_token;
      await user.save();
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 간소화된 사용자 정보 (민감한 정보 제외)
    const userData = {
      _id: user._id,
      nickname: user.nickname,
      profileImage: user.profileImage || "",
      statusMessage: user.statusMessage || null,
      blockedUsers: user.blockedUsers || []
    };

    // 간소화된 응답 데이터
    const responseData = {
      user: userData,
      accessToken: accessToken,
      refreshToken: refreshToken,
      isNewUser: isNewUser
    };

    return sendSuccess(res, 200, 'Apple authentication successful.', responseData);
  } catch (error) {
    console.error("Error during Apple authentication:", error);
    return sendError(res, 500, "An error occurred during the Apple authentication!");
  }
};

// 닉네임 중복 체크
const checkNicknameDuplicate = async (req, res) => {
  try {
    const { nickname } = req.query;
    
    if (!nickname) {
      return sendError(res, 400, "Nickname is required!");
    }

    const existingUser = await User.findOne({ nickname: nickname });
    
    if (existingUser) {
      // 현재 사용자가 자신의 닉네임을 체크하는 경우는 중복이 아님
      if (req.user && existingUser._id.toString() === req.user._id.toString()) {
        return sendSuccess(res, 200, "Nickname is available.", { available: true });
      }
      return sendSuccess(res, 200, "Nickname is already taken.", { available: false });
    }

    return sendSuccess(res, 200, "Nickname is available.", { available: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "An error occurred while checking nickname!");
  }
};

// 닉네임 변경
const changeNickname = async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname) {
      return sendError(res, 400, "Nickname is required!");
    }

    // 중복 닉네임 체크
    const existingUser = await User.findOne({ nickname: nickname });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return sendError(res, 400, "Nickname already in use!");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { nickname: nickname }, 
      { new: true }
    ).select("-refreshToken -appleId -__v");
    
    if (!updatedUser) {
      return sendError(res, 404, "User not found!");
    }

    return sendSuccess(res, 200, "Nickname updated successfully!", updatedUser);
  } catch (error) {
    console.error(error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.nickname) {
      return sendError(res, 400, "Nickname already in use!");
    }
    return sendError(res, 500, "An error occurred!");
  }
};

// JWT 액세스 토큰 갱신 - 일관성을 위해 Authorization 헤더 사용
const renewAccessToken = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const refreshToken = authHeader && authHeader.startsWith("Bearer ") 
      ? authHeader.split("Bearer ")[1] 
      : null;

    if (!refreshToken) {
      return sendError(res, 400, "No refresh token provided.");
    }

    // Refresh Token 검증
    const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const newAccessToken = generateAccessToken({ _id: decodedRefreshToken._id });

    const responseData = { accessToken: newAccessToken };
    return sendSuccess(res, 200, "Access token renewed successfully.", responseData);
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid or expired refresh token.");
    }
    return sendError(res, 500, "Error occurred while renewing the access token!");
  }
};

// 토큰 검증 및 자동 로그인 - 일관성을 위해 Authorization 헤더 사용
const validateToken = async (req, res) => {
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.startsWith("Bearer ") 
    ? authHeader.split("Bearer ")[1] 
    : null;
  
  const refreshAuthHeader = req.headers["x-refresh-token"];
  const refreshToken = refreshAuthHeader && refreshAuthHeader.startsWith("Bearer ")
    ? refreshAuthHeader.split("Bearer ")[1]
    : refreshAuthHeader; // Bearer 없이도 허용

  if (!accessToken || !refreshToken) {
    return sendError(res, 400, "Access or refresh token not provided.");
  }

  try {
    // 액세스 토큰 검증
    const decodedAccessToken = jwt.verify(accessToken, JWT_SECRET);
    const responseData = { valid: true };
    return sendSuccess(res, 200, "Access token is still valid.", responseData);
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      try {
        // 액세스 토큰이 만료되거나 유효하지 않은 경우, 리프레시 토큰 검증
        const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const newAccessToken = generateAccessToken({ _id: decodedRefreshToken._id });
        const newRefreshToken = generateRefreshToken({ _id: decodedRefreshToken._id });
        
        const responseData = {
          valid: false,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        };
        
        return sendSuccess(res, 200, "New tokens generated.", responseData);
      } catch (err) {
        return sendError(res, 401, "Invalid or expired refresh token. Please log in again.");
      }
    }
    return sendError(res, 500, "Error occurred while validating the access token!");
  }
};

// 계정 탈퇴 (Follow 모델 관련 코드 제거)
const revokeAccount = async (req, res) => {
  const mongoose = require('mongoose');
  const BookStory = require('../models/BookStory');
  const BookStoryComment = require('../models/BookStoryComment');
  const Folder = require('../models/Folder');
  const Report = require('../models/Report');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return sendError(res, 404, "User not found!");
    }

    // 사용자와 관련된 데이터 삭제
    await BookStory.deleteMany({ userId: user._id }, { session });
    await BookStoryComment.deleteMany({ userId: user._id }, { session });
    await Folder.deleteMany({ userId: user._id }, { session });
    
    // 사용자가 신고한 기록과 사용자가 신고당한 기록 모두 삭제
    await Report.deleteMany(
      { $or: [{ reporterId: user._id }, { targetId: user._id }] },
      { session }
    );

    // 다른 사용자들의 차단 목록에서 이 사용자 제거
    await User.updateMany(
      { blockedUsers: user._id },
      { $pull: { blockedUsers: user._id } },
      { session }
    );

    // Apple 토큰 해제
    if (user.refreshToken) {
      await auth.revokeToken(user.refreshToken);
    }

    // 사용자 삭제
    await User.deleteOne({ _id: user._id }, { session });

    await session.commitTransaction();
    return sendSuccess(res, 200, "User data and token revoked successfully!", { revoked: true });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    return sendError(res, 500, "An error occurred revoking the token or deleting user data!");
  } finally {
    session.endSession();
  }
};

module.exports = {
  appleCallback,
  checkNicknameDuplicate,
  changeNickname,
  renewAccessToken,
  validateToken,
  revokeAccount
};