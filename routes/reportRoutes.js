// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const {
    reportUser,
    reportBookStory,
    getReportUsers,
    getReportStories
} = require('../controllers/ReportController');

router.post('/user', ensureAuthenticated, reportUser);
router.post('/bookstory', ensureAuthenticated, reportBookStory);
router.get('/user', ensureAuthenticated, getReportUsers);
router.get('/bookstory', ensureAuthenticated, getReportStories);

// router.get('/admin/reportList', ensureAuthenticated, getReportList);

module.exports = router;