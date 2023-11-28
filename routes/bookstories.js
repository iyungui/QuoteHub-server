//routes/bookstories.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const { 
    createBookStory,
    getUserBookStoryCount,
    getAllPublicBookStories,
    getAllPublicBookStoriesWithKeyword,
    getFriendPublicBookStories,
    getFriendPublicBookStoriesWithKeyword,
    getMyBookStories,
    getMyPublicBookStoriesWithKeyword,
    updateBookStory,
    getBookStoryById,
    deleteBookStory,
    deleteMultipleBookStories
} = require('../controllers/bookStoriesController');

const upload = require('../s3Config');

// BookStory 생성
router.post('/createBookStory', ensureAuthenticated, upload.array('storyImage'), createBookStory);

// 특정 사용자의 북스토리 기록한 총 개수 조회
router.get('/count/:userId?', (req, res, next) => {
    if (!req.params.userId) {
        return ensureAuthenticated(req, res, next);
    }
    next();
}, getUserBookStoryCount);

// 모든 공개된 BookStory 조회 with pagination
router.get('/public', getAllPublicBookStories);     // GET /public?page=2&pageSize=10

// 분류 x 친구 서재에서의 공개된 BookStory 조회 with pagination
router.get('/friend/:friendId', getFriendPublicBookStories);        // GET /friend/12345?page=3&pageSize=5

// 분류 x 내 서재의 모든 BookStory 조회 with pagination
router.get('/my', ensureAuthenticated, getMyBookStories);

// 키워드를 사용하여 모든 공개된 BookStory 조회 with pagination
router.get('/public/search', getAllPublicBookStoriesWithKeyword);

// 친구 서재에서의 키워드를 사용하여 공개된 BookStory 조회 with pagination
router.get('/friend/search/:friendId', getFriendPublicBookStoriesWithKeyword);

// 내 서재에서 키워드를 사용하여 BookStory 조회 with pagination
router.get('/my/search', ensureAuthenticated, getMyPublicBookStoriesWithKeyword);

// BookStory 수정
router.put('/update/:id', ensureAuthenticated, upload.array('storyImage'), updateBookStory);

// 특정 북스토리 하나 조회
router.get('/:id', getBookStoryById);

// BookStory 삭제
router.delete('/delete/:id', ensureAuthenticated, deleteBookStory);

// BookStory 다중 삭제
router.delete('/delete-multiple', ensureAuthenticated, deleteMultipleBookStories);      // json 으로 북스토리 id 받음

module.exports = router;
