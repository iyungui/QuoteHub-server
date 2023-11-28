const express = require('express');
const router = express.Router();
const { fetchBookData, recommendTodayBooks } = require('../controllers/bookController');

// 도서 검색 요청 라우트
router.get('/search', fetchBookData);

// today recommend books
router.get('/todayBooks', recommendTodayBooks);

module.exports = router;
