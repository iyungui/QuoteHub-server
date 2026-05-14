const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');

const {
    addCommentToBookStory,
    getCommentsForBookStory,
    updateComment,
    deleteComment,
    getCommentCountForBookStory
} = require('../controllers/BookStoryCommentController'); // 대문자 B로 변경

router.post('/', ensureAuthenticated, addCommentToBookStory);
router.get('/count/:bookStoryId', getCommentCountForBookStory);
router.get('/:bookStoryId', getCommentsForBookStory);
router.put('/:commentId', ensureAuthenticated, updateComment);
router.delete('/:commentId', ensureAuthenticated, deleteComment);

module.exports = router;
