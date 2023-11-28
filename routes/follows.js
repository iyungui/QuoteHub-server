const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware/ensureAuthenticated');
const {
    followUser,
    checkFollowStatus,
    getFollowers,
    getFollowing,
    getFollowCounts,
    updateFollowStatus,
    unfollowUser,
    searchUser,
    blockedList
} = require('../controllers/FollowController');

// 팔로우
router.post('/:userId', ensureAuthenticated, followUser);
router.get('/check/:userId', ensureAuthenticated, checkFollowStatus);


// 팔로워 조회 with pagination
router.get('/followers/:userId', getFollowers);

// 팔로잉 조회 with pagination
router.get('/following/:userId', getFollowing);

// 팔로워 및 팔로잉 수 조회
router.get('/counts/:userId', getFollowCounts);

// 팔로우 상태 업데이트 (차단/차단 해제)
router.patch('/update/:userId', ensureAuthenticated, updateFollowStatus);

// 팔로우를 해제
router.delete('/unfollow/:userId', ensureAuthenticated, unfollowUser);

// 사용자 검색 api
router.get('/user/search', searchUser);

// 차단 목록 api
router.get('/blockedList', ensureAuthenticated, blockedList);

module.exports = router;
