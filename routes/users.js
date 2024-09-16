const mongoose = require("mongoose"); // ObjectId 검증을 위해 필요

const express = require("express");

const router = express.Router();

const User = require("../models/User");
const BookStory = require("../models/BookStory");
const BookStoryComment = require("../models/BookStoryComment");
const Folder = require("../models/Folder");
const Follow = require("../models/Follow");

const upload = require("../s3Config");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const axios = require("axios");


const fs = require('fs');
const config = fs.readFileSync('./config/config.json');
const AppleAuth = require('apple-auth');
const jwt = require('jsonwebtoken');

// apple-auth
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_KEY;

let auth = new AppleAuth(config, fs.readFileSync('./config/AuthKey_V9RPA6NG6H.p8').toString(), 'text');

function optionalAuthentication(req, res, next) {
  if (!req.params.userId) {
    return ensureAuthenticated(req, res, next);
  }
  next(); // req.params.userId가 있다면 인증을 건너뜁니다.
}

// 고유한 닉네임 생성 함수
async function generateUniqueNickname() {
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
    throw new Error(
      "Unable to generate unique nickname after multiple attempts"
    );
  } catch (error) {
    console.error("Error in generateUniqueNickname:", error);
    throw error;
  }
}

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// apple login
router.post("/auth/apple/callback", async (req, res) => {
  try {
    console.log( Date().toString() + "GET /auth");

    const response = await auth.accessToken(req.body.code);
    console.log('Received code:', req.body.code);
    const idToken = jwt.decode(response.id_token);


    let user = await User.findOne({ appleId: idToken.sub });
    let isFirstLogin = false;

    if (!user) {
      const nickname = await generateUniqueNickname();
      const newUser = {
        appleId: idToken.sub,
        nickname: nickname,
      };

      user = new User(newUser);
      await user.save();
      isFirstLogin = true;
    } else {
      user.refreshToken = response.refresh_token;
      await user.save();
    }

    const accessToken = jwt.sign({ _id: user._id }, JWT_SECRET, {
      expiresIn: "1d",
    });
    const refreshToken = jwt.sign({ _id: user._id }, REFRESH_TOKEN_SECRET, {
      expiresIn: "14d",
    });

    // 응답 데이터 생성
    const responseData = {
      user: user,
      isFirstLogin: isFirstLogin,
      JWTAccessToken: accessToken,
      JWTRefreshToken: refreshToken,
    };

    res.json(responseData);
  } catch (ex) {
    console.error("Error during Apple authentication:", ex);
    console.error("Full error details:", JSON.stringify(ex, null, 2)); // 추가 정보 출력

    if (ex.response && ex.response.data) {
      console.error("Apple Server Response:", ex.response.data);
    }

    res.status(500).json({ error: "An error occurred during the Apple authentication!" });
  }
});

// 애플 회원가입 후, 프로필 입력
router.post(
  "/auth/inputProfile",
  ensureAuthenticated,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      let user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: "User not found!" });
      }

      const updateFields = ["nickname", "statusMessage", "monthlyReadingGoal"];
      let updatedData = {};

      // 중복 닉네임 체크
      if (req.body.nickname) {
        const existingUserWithNickname = await User.findOne({
          nickname: req.body.nickname,
        });
        if (existingUserWithNickname) {
          return res.status(400).json({ error: "Nickname already in use!" });
        }
      }

      updateFields.forEach((field) => {
        if (req.body[field]) {
          if (
            field === "monthlyReadingGoal" &&
            (isNaN(req.body[field]) || req.body[field] <= 0)
          ) {
            throw new Error("Invalid monthlyReadingGoal value");
          }
          updatedData[field] = req.body[field];
        }
      });

      if (req.file) {
        updatedData.profileImage = req.file.location;
      }

      await User.findByIdAndUpdate(req.user._id, updatedData);
      res.json({ message: "Profile updated successfully!" });
    } catch (ex) {
      console.error(ex);
      if (ex.code === 11000 && ex.keyPattern && ex.keyPattern.nickname) {
        return res.status(400).json({ error: "Nickname already in use!" });
      }
      res.status(500).json({ error: "An error occurred!" });
    }
  }
);

// renew JWT access token (for retry)
router.post("/renew-access-token", async (req, res) => {
  try {
    const JWTRefreshToken = req.headers["authorization"]
      ? req.headers["authorization"].split("Bearer ")[1]
      : null;

    if (!JWTRefreshToken) {
      return res.status(400).send({ error: "No refresh token provided." });
    }

    // Verify the JWTRefreshToken
    const decodedRefreshToken = jwt.verify(
      JWTRefreshToken,
      REFRESH_TOKEN_SECRET
    );

    const newAccessToken = jwt.sign(
      { _id: decodedRefreshToken._id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ accessToken: newAccessToken }); // Save in iOS keychain
  } catch (ex) {
    console.error(ex);
    if (ex.name === "TokenExpiredError" || ex.name === "JsonWebTokenError") {
      return res
        .status(401)
        .send({ error: "Invalid or expired refresh token." });
    }
    res
      .status(500)
      .send({ error: "Error occurred while renewing the access token!" });
  }
});

// verify and renew access token (for auto-login)
router.post("/validate-token", async (req, res) => {
  const accessToken = req.headers.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  const refreshToken = req.headers["x-refresh-token"]; // 별도의 헤더를 사용

  if (!accessToken || !refreshToken) {
    return res
      .status(400)
      .send({ error: "Access or refresh token not provided." });
  }

  try {
    // 액세스 토큰 검증
    const decodedAccessToken = jwt.verify(accessToken, JWT_SECRET);
    return res
      .status(200)
      .send({ valid: true, message: "Access token is still valid." });
  } catch (ex) {
    if (ex.name === "TokenExpiredError" || ex.name === "JsonWebTokenError") {
      try {
        // 액세스 토큰이 만료되거나 유효하지 않은 경우, 리프레시 토큰 검증
        const decodedRefreshToken = jwt.verify(
          refreshToken,
          REFRESH_TOKEN_SECRET
        );
        const newAccessToken = jwt.sign(
          { _id: decodedRefreshToken._id },
          JWT_SECRET,
          { expiresIn: "1d" }
        );
        const newRefreshToken = jwt.sign(
          { _id: decodedRefreshToken._id },
          REFRESH_TOKEN_SECRET,
          { expiresIn: "14d" }
        );
        return res
          .status(200)
          .send({ valid: false, newAccessToken, newRefreshToken });
      } catch (err) {
        return res
          .status(401)
          .send({
            error: "Invalid or expired refresh token. Please log in again.",
          });
      }
    }
    return res
      .status(500)
      .send({ error: "Error occurred while validating the access token!" });
  }
});

router.post("/revoke", ensureAuthenticated, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: "User not found!" });
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

    // 사용자와 관련된 추가 데이터 삭제
    await BookStory.deleteMany({ userId: user._id }, { session });
    await BookStoryComment.deleteMany({ userId: user._id }, { session });
    await Folder.deleteMany({ userId: user._id }, { session });

    await Follow.deleteMany(
      {
        $or: [{ follower: user._id }, { following: user._id }],
      },
      { session }
    );

    // revoke apple token
    await auth.revokeToken(user.refreshToken);

    // 사용자 삭제
    await User.deleteOne({ _id: user._id }, { session });

    await session.commitTransaction();
    res
      .status(200)
      .json({
        success: true,
        message: "User data and token revoked successfully!",
      });
  } catch (ex) {
    await session.abortTransaction();
    console.error(ex);
    res
      .status(500)
      .json({
        success: false,
        error: "An error occurred revoking the token or deleting user data!",
      });
  } finally {
    session.endSession();
  }
});

// Get user profile
router.get("/profile/:userId?", optionalAuthentication, async (req, res) => {
  try {
    let query;

    if (req.params.userId) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      query = { _id: req.params.userId };
    } else {
      // Get logged-in user's profile
      query = { _id: req.user._id };
    }

    const user = await User.findOne(query).select(
      "-refreshToken -appleId -__v"
    ); // Exclude sensitive fields
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update user profile
router.put(
  "/update",
  ensureAuthenticated,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const updateFields = ["nickname", "statusMessage", "monthlyReadingGoal"];
      let updatedData = {};

      // Validate and update fields
      updateFields.forEach((field) => {
        if (req.body[field]) {
          if (field === "monthlyReadingGoal") {
            const monthlyReadingGoal = Number(req.body[field]);
            if (isNaN(monthlyReadingGoal) || monthlyReadingGoal <= 0) {
              return res
                .status(400)
                .json({ error: "Invalid monthlyReadingGoal value" });
            }
          }
          updatedData[field] = req.body[field];
        }
      });

      // Check for duplicate nickname
      if (updatedData.nickname) {
        const existingUser = await User.findOne({
          nickname: updatedData.nickname,
        });
        if (
          existingUser &&
          existingUser._id.toString() !== req.user._id.toString()
        ) {
          // 이미 존재하는 닉네임이 있으며, 그 닉네임이 현재 API 요청을 보낸 사용자의 것이 아닐 때
          return res.status(400).json({ error: "Nickname is already taken!" });
        }
      }

      if (req.file) {
        updatedData.profileImage = req.file.location;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updatedData,
        { new: true }
      ).select("-refreshToken -appleId -__v -followers -following");
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: error.message || "Failed to update user!" });
    }
  }
);

router.get("/list/users", async (req, res) => {
  try {
    const users = await User.find()
      .sort({ _id: -1 })
      .limit(10)
      .select("-appleId -refreshToken");

    res.json(users);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

module.exports = router;
