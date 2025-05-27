const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const path = require('path');
const fs = require('fs');

// 배포환경 파일 구조 디버깅
console.log('=== 배포환경 파일 구조 디버깅 ===');
console.log('Current directory:', __dirname);
console.log('Controller directory path:', path.join(__dirname, '../controllers'));

try {
    // 컨트롤러 디렉토리의 모든 파일 확인
    const controllerDir = path.join(__dirname, '../controllers');
    console.log('Controller directory exists:', fs.existsSync(controllerDir));
    
    if (fs.existsSync(controllerDir)) {
        const controllerFiles = fs.readdirSync(controllerDir);
        console.log('Available controller files:', controllerFiles);
        
        // 대소문자 구분해서 정확한 파일명 찾기
        const commentControllerFiles = controllerFiles.filter(file => 
            file.toLowerCase().includes('comment') && file.endsWith('.js')
        );
        console.log('Comment-related controller files:', commentControllerFiles);
        
        // 각 파일의 정확한 대소문자 확인
        commentControllerFiles.forEach(file => {
            console.log(`Found file: "${file}" (exact case)`);
        });
    }
    
} catch (error) {
    console.error('Error reading controller directory:', error);
}

// 다양한 대소문자 조합으로 시도
let commentController = null;
const possibleNames = [
    '../controllers/bookStoryCommentController',     // 원본
    '../controllers/bookstoryCommentController',     // 소문자 s
    '../controllers/bookStoriesCommentController',   // Stories 복수형
    '../controllers/bookstoriesCommentController',   // 모두 소문자
    '../controllers/bookStoryCommentsController',    // Comments 복수형
    '../controllers/BookStoryCommentController'      // 대문자 B
];

console.log('\n=== 다양한 파일명으로 로딩 시도 ===');
for (const name of possibleNames) {
    try {
        commentController = require(name);
        console.log(`✅ SUCCESS: ${name}`);
        break;
    } catch (error) {
        console.log(`❌ FAILED: ${name} - ${error.message}`);
    }
}

// 실패 시 기본 핸들러 생성
if (!commentController) {
    console.error('⚠️  모든 시도 실패 - 기본 핸들러 사용');
    commentController = {
        addCommentToBookStory: (req, res) => {
            console.error('Comment controller not loaded');
            res.status(500).json({
                success: false,
                error: 'Comment controller not loaded. Check server logs for file structure.'
            });
        },
        getCommentsForBookStory: (req, res) => {
            console.error('Comment controller not loaded');
            res.status(500).json({
                success: false,
                error: 'Comment controller not loaded. Check server logs for file structure.'
            });
        },
        deleteComment: (req, res) => {
            console.error('Comment controller not loaded');
            res.status(500).json({
                success: false,
                error: 'Comment controller not loaded. Check server logs for file structure.'
            });
        },
        getCommentCountForBookStory: (req, res) => {
            console.error('Comment controller not loaded');
            res.status(500).json({
                success: false,
                error: 'Comment controller not loaded. Check server logs for file structure.'
            });
        }
    };
}

const {
    addCommentToBookStory,
    getCommentsForBookStory,
    deleteComment,
    getCommentCountForBookStory
} = commentController;

router.post('/', ensureAuthenticated, addCommentToBookStory);
router.get('/:bookStoryId', getCommentsForBookStory);
router.get('/count/:bookStoryId', getCommentCountForBookStory);
router.delete('/:commentId', ensureAuthenticated, deleteComment);

module.exports = router;