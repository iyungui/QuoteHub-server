// routes/userRoutes.js
const express = require("express");
const router = express.Router();

// Controllers
const { 
  appleCallback, 
  checkNicknameDuplicate,
  changeNickname, 
  renewAccessToken, 
  validateToken, 
  revokeAccount 
} = require("../controllers/authController");

const { 
  getUserProfile, 
  updateUserProfile, 
  getUserList 
} = require("../controllers/userController");

// Middleware
const ensureAuthenticated = require("../middleware/ensureAuthenticated");
const upload = require("../s3Config");

// 선택적 인증 미들웨어 (userId가 있으면 인증 건너뛰기)
function optionalAuthentication(req, res, next) {
  if (!req.params.userId) {
    return ensureAuthenticated(req, res, next);
  }
  next();
}

// ============= 인증 관련 라우트 =============
// Apple 로그인 콜백
router.post("/auth/apple/callback", appleCallback);

// 닉네임 중복 체크 (GET 방식으로 변경, 선택적 인증)
router.get("/auth/check-nickname", (req, res, next) => {
  // Authorization 헤더가 있으면 인증 미들웨어 적용
  if (req.headers.authorization) {
    return ensureAuthenticated(req, res, next);
  }
  next();
}, checkNicknameDuplicate);

// 닉네임 변경 (inputProfile 대신)
router.post("/auth/change-nickname", ensureAuthenticated, changeNickname);

// JWT 액세스 토큰 갱신
router.post("/auth/renew-token", renewAccessToken);

// 토큰 검증 및 자동 로그인
router.post("/auth/validate-token", validateToken);

// 계정 탈퇴
router.post("/auth/revoke", ensureAuthenticated, revokeAccount);

// ============= 사용자 관리 라우트 =============
// 사용자 프로필 조회 (자신 또는 다른 사용자)
router.get("/profile/:userId?", optionalAuthentication, getUserProfile);

// 사용자 프로필 업데이트
router.put("/profile", ensureAuthenticated, upload.single("profileImage"), updateUserProfile);

// 사용자 목록 조회 (관리자용)
router.get("/profileList/", getUserList);

module.exports = router;