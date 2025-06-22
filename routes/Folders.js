//routes/Folders.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const optionalAuthentication = require('../middleware/optionalAuthentication');
const { 
    getAllPublicBookStoriesByFolder,
    getFriendPublicBookStoriesByFolder,
    getMyBookStoriesByFolder,
    createFolder,
    getAllFolders,
    getUserFolders,
    getMyFolders,
    updateFolder,
    deleteFolder,
    getFolderById
} = require('../controllers/FolderController');

const upload = require('../s3Config');

// 모든 사용자의 공개된 북스토리 폴더별 조회 with pagination (선택적 인증 적용)
router.get('/public/:folderId', optionalAuthentication, getAllPublicBookStoriesByFolder);

// 특정 친구의 공개된 북스토리 폴더별 조회 with pagination (선택적 인증 적용)
router.get('/friend/:friendId/:folderId', optionalAuthentication, getFriendPublicBookStoriesByFolder);

// 내 서재의 북스토리 폴더별 조회 with pagination
router.get('/my/:folderId', ensureAuthenticated, getMyBookStoriesByFolder);

// 폴더 생성
router.post('/create', ensureAuthenticated, upload.single('folderImage'), createFolder);

// 모든 사용자의 폴더 목록 조회 with pagination (선택적 인증 적용)
router.get('/all', optionalAuthentication, getAllFolders);

// 특정 사용자의 폴더 목록 조회 with pagination (선택적 인증 적용)
router.get('/user/:userId', optionalAuthentication, getUserFolders);

// 내 폴더 목록 조회 with pagination
router.get('/myfolder', ensureAuthenticated, getMyFolders);

// 폴더 업데이트
router.put('/update/:folderId', ensureAuthenticated, upload.single('folderImage'), updateFolder);

// 폴더 삭제
router.delete('/delete/:folderId', ensureAuthenticated, deleteFolder);

// 특정 폴더 조회
router.get('/:folderId', getFolderById);
module.exports = router;