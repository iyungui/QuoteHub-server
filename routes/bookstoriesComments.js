const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');

const {
    addCommentToBookStory,
    getCommentsForBookStory,
    updateComment,
    deleteComment,
    getCommentCountForBookStory
} = require('../controllers/bookStoryCommentController'); // 대문자 B로 변경

router.post('/', ensureAuthenticated, addCommentToBookStory);
router.get('/:bookStoryId', getCommentsForBookStory);
router.get('/count/:bookStoryId', getCommentCountForBookStory);
router.put('/:commentId', ensureAuthenticated, updateComment);
router.delete('/:commentId', ensureAuthenticated, deleteComment);

module.exports = router;