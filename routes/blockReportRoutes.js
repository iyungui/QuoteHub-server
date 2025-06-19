// routes/blockReportRoutes.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const {
    blockUser,
    unblockUser,
    reportAndBlock,
    cancelReport,
    getBlockedUsers,
    getReports
} = require('../controllers/blockReportController');

// 사용자 차단
router.post('/block', ensureAuthenticated, blockUser);

// 사용자 차단 해제  
router.post('/unblock', ensureAuthenticated, unblockUser);

// 신고 및 차단 (통합)
router.post('/report', ensureAuthenticated, reportAndBlock);

// 신고 취소
router.post('/cancel-report', ensureAuthenticated, cancelReport);

// 차단 목록 조회
router.get('/blocked-users', ensureAuthenticated, getBlockedUsers);

// 신고 목록 조회
router.get('/reports', ensureAuthenticated, getReports);

module.exports = router;