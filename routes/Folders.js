//routes/Folders.js
const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const { 
    getAllPublicBookStoriesByFolder,
    getFriendPublicBookStoriesByFolder,
    getMyBookStoriesByFolder,
    createFolder,
    getAllFolders,
    getUserFolders,
    getMyFolders,
    updateFolder,
    deleteFolder
} = require('../controllers/FolderController');

const upload = require('../s3Config');

// 모든 사용자의 공개된 북스토리 폴더별 조회 with pagination
router.get('/public/:folderId', getAllPublicBookStoriesByFolder);       // GET /public/12345?page=1&pageSize=10

// 특정 친구의 공개된 북스토리 폴더별 조회 with pagination
router.get('/friend/:friendId/:folderId', getFriendPublicBookStoriesByFolder);

// 내 서재의 북스토리 폴더별 조회 with pagination
router.get('/my/:folderId', ensureAuthenticated, getMyBookStoriesByFolder);

// 폴더 생성
router.post('/create', ensureAuthenticated, upload.single('folderImage'), createFolder);

// 모든 사용자의 폴더 목록 조회 with pagination
router.get('/all', getAllFolders);

// 특정 사용자의 폴더 목록 조회 with pagination
router.get('/user/:userId', getUserFolders);

// 내 폴더 목록 조회 with pagination
router.get('/myfolder', ensureAuthenticated, getMyFolders);

// 폴더 업데이트
router.put('/update/:folderId', ensureAuthenticated, upload.single('folderImage'), updateFolder);

// 폴더 삭제
router.delete('/delete/:folderId', ensureAuthenticated, deleteFolder);

module.exports = router;
