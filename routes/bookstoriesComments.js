const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');

const {
    addCommentToBookStory,
    getCommentsForBookStory,
    deleteComment,
    getCommentCountForBookStory
 } = require('../controllers/bookStoryCommentController'); // 파일명 수정

router.post('/', ensureAuthenticated, addCommentToBookStory);

router.get('/:bookStoryId', getCommentsForBookStory);
router.get('/count/:bookStoryId', getCommentCountForBookStory);
router.delete('/:commentId', ensureAuthenticated, deleteComment);

module.exports = router;