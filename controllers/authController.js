// controllers/authController.js
const jwt = require("jsonwebtoken");
const axios = require("axios");
const AppleAuth = require("apple-auth");
const User = require("../models/User");
const { sendSuccess, sendError } = require('../utils/responseHelper');

// JWT 비밀 키
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;

// Apple Auth 설정 - env에서 string으로 가져오기
const appleAuthConfig = {
  client_id: process.env.APPLE_CLIENT_ID,
  team_id: process.env.APPLE_TEAM_ID,
  key_id: process.env.APPLE_KEY_ID,
  redirect_uri: process.env.APPLE_REDIRECT_URI || "https://domain/auth/apple/callback",
  scope: "name"
};

// Apple Auth 인스턴스 생성 - private key를 env에서 가져오기
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
    console.log(Date().toString() + " GET /auth/apple/callback");

    const response = await auth.accessToken(req.body.code);
    console.log('Received code:', req.body.code);
    
    const idToken = jwt.decode(response.id_token);
    let user = await User.findOne({ appleId: idToken.sub });

    if (!user) {
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

    // 응답 데이터 생성
    const responseData = {
      user: {
        _id: user._id,
        appleId: user.appleId,
        nickname: user.nickname,
        profileImage: user.profileImage || "",
        statusMessage: user.statusMessage || null,
        monthlyReadingGoal: user.monthlyReadingGoal || null,
        refreshToken: refreshToken,
        followers: user.followers || [],
        following: user.following || []
      },
      JWTAccessToken: accessToken,
      JWTRefreshToken: refreshToken
    };

    return sendSuccess(res, 200, 'Apple authentication successful.', responseData);
  } catch (error) {
    console.error("Error during Apple authentication:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));

    if (error.response && error.response.data) {
      console.error("Apple Server Response:", error.response.data);
    }

    return sendError(res, 500, "An error occurred during the Apple authentication!");
  }
};

// 프로필 입력 (첫 로그인 후)
const inputProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 404, "User not found!");
    }

    const updateFields = ["nickname", "statusMessage"];
    let updatedData = {};

    // 중복 닉네임 체크
    if (req.body.nickname) {
      const existingUserWithNickname = await User.findOne({
        nickname: req.body.nickname,
      });
      if (existingUserWithNickname && existingUserWithNickname._id.toString() !== user._id.toString()) {
        return sendError(res, 400, "Nickname already in use!");
      }
    }

    updateFields.forEach((field) => {
      if (req.body[field]) {
        updatedData[field] = req.body[field];
      }
    });

    if (req.file) {
      updatedData.profileImage = req.file.location;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updatedData, { new: true })
      .select("-refreshToken -appleId -__v");
    
    return sendSuccess(res, 200, "Profile updated successfully!", updatedUser);
  } catch (error) {
    console.error(error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.nickname) {
      return sendError(res, 400, "Nickname already in use!");
    }
    return sendError(res, 500, "An error occurred!");
  }
};

// JWT 액세스 토큰 갱신
const renewAccessToken = async (req, res) => {
  try {
    const refreshToken = req.headers["authorization"]
      ? req.headers["authorization"].split("Bearer ")[1]
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

// 토큰 검증 및 자동 로그인
const validateToken = async (req, res) => {
  const accessToken = req.headers.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  const refreshToken = req.headers["x-refresh-token"];

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
          newAccessToken,
          newRefreshToken
        };
        
        return sendSuccess(res, 200, "New tokens generated.", responseData);
      } catch (err) {
        return sendError(res, 401, "Invalid or expired refresh token. Please log in again.");
      }
    }
    return sendError(res, 500, "Error occurred while validating the access token!");
  }
};

// 계정 탈퇴
const revokeAccount = async (req, res) => {
  const mongoose = require('mongoose');
  const BookStory = require('../models/BookStory');
  const BookStoryComment = require('../models/BookStoryComment');
  const Folder = require('../models/Folder');
  const Follow = require('../models/Follow');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return sendError(res, 404, "User not found!");
    }

    // 팔로잉 및 팔로워 목록에서 사용자 제거
    await User.updateMany(
      { _id: { $in: user.following } },
      { $pull: { followers: user._id } },
      { session }
    );
    await User.updateMany(
      { _id: { $in: user.followers } },
      { $pull: { following: user._id } },
      { session }
    );

    // 사용자와 관련된 데이터 삭제
    await BookStory.deleteMany({ userId: user._id }, { session });
    await BookStoryComment.deleteMany({ userId: user._id }, { session });
    await Folder.deleteMany({ userId: user._id }, { session });
    await Follow.deleteMany(
      { $or: [{ follower: user._id }, { following: user._id }] },
      { session }
    );

    // Apple 토큰 해제
    if (user.refreshToken) {
      await auth.revokeToken(user.refreshToken);
    }

    // 사용자 삭제
    await User.deleteOne({ _id: user._id }, { session });

    await session.commitTransaction();
    return sendSuccess(res, 200, "User data and token revoked successfully!");
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
  inputProfile,
  renewAccessToken,
  validateToken,
  revokeAccount
};