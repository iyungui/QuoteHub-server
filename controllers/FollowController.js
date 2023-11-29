// FollowController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { paginateQuery, calculateTotalPages } = require('../utils/pagination');

// 팔로우
const followUser = async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    // Check if the followerId is the same as the followingId
    if (followerId.toString() === followingId) {
        return res.status(400).json({ success: false, error: "You cannot follow yourself." });
    }
    
    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if already following or blocked
        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: followingId
        }).session(session);

        if (existingFollow) {
            // If the existing relationship is blocked, update it to following
            if (existingFollow.status === 'BLOCKED') {
                existingFollow.status = 'FOLLOWING';
                await existingFollow.save({ session });
                // Update following and followers list
                await User.findByIdAndUpdate(followerId, { $addToSet: { following: followingId } }, { session });
                await User.findByIdAndUpdate(followingId, { $addToSet: { followers: followerId } }, { session });
            } else {
                await session.abortTransaction();
                return res.status(400).json({ success: false, error: 'You are already following this user.' });
            }
        } else {
            // Create new follow record if not already following or blocked
            const newFollow = new Follow({
                follower: followerId,
                following: followingId,
                status: 'FOLLOWING' // Set status as FOLLOWING
            });

            await newFollow.save({ session });

            // Update following and followers list
            await User.findByIdAndUpdate(followerId, { $push: { following: followingId } }, { session });
            await User.findByIdAndUpdate(followingId, { $push: { followers: followerId } }, { session });
        }

        // Fetch followed user's detailed information
        const followedUser = await User.findById(followingId)
            .select('_id nickname profileImage statusMessage followers following') // Select necessary fields
            .session(session);
        
        await session.commitTransaction();
        res.status(201).json({ success: true, data: followedUser });

    } catch (error) {
        await session.abortTransaction();
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: 'Server error while processing follow.' });
        }
    } finally {
        session.endSession();
    }
};

const checkFollowStatus = async (req, res) => {
    const userId = req.user._id;
    const targetUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Invalid target user ID.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // 팔로우 상태 확인
        const isFollowing = user.following.includes(targetUserId);

        // 차단 상태 확인
        const blockedStatus = await Follow.findOne({
            follower: userId,
            following: targetUserId,
            status: 'BLOCKED'
        });
        const isBlocked = !!blockedStatus;

        res.status(200).json({
            success: true, 
            isFollowing: isFollowing, 
            isBlocked: isBlocked
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error while checking follow status.' });
    }
};

// 팔로워 목록 조회 with pagination
const getFollowers = async (req, res) => {
    const userId = req.params.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // Ensure the user has followers field
        if (!user.followers) {
            return res.status(200).json({
                success: true,
                data: [],
                currentPage: page,
                totalPages: 0,
                pageSize: pageSize,
                totalItems: 0
            });
        }

        const followerIds = user.followers;
        
        // Apply pagination to the followers array
        const baseQuery = User.find({ _id: { $in: followerIds } })
            .select('nickname profileImage statusMessage')
            .sort({ nickname: 1 });

        const totalItems = followerIds.length;
        const followers = await paginateQuery(baseQuery, page, pageSize);

        res.status(200).json({
            success: true,
            data: followers,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        // Distinguish between validation errors and other types of errors
        if (error.name === 'ValidationError') {
            res.status(400).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: 'Server error while retrieving followers.' });
        }
    }
};


// 팔로잉 목록 조회 with pagination
const getFollowing = async (req, res) => {
    const userId = req.params.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // Ensure the user has following field
        if (!user.following) {
            return res.status(200).json({
                success: true,
                data: [],
                currentPage: page,
                totalPages: 0,
                pageSize: pageSize,
                totalItems: 0
            });
        }

        const followingIds = user.following;
        
        // Apply pagination to the following array
        const baseQuery = User.find({ _id: { $in: followingIds } })
            .select('nickname profileImage statusMessage')
            .sort({ nickname: 1 });

        const totalItems = followingIds.length;
        const following = await paginateQuery(baseQuery, page, pageSize);

        res.status(200).json({
            success: true,
            data: following,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        // Distinguish between validation errors and other types of errors
        if (error.name === 'ValidationError') {
            res.status(400).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: 'Server error while retrieving following.' });
        }
    }
};

// 팔로워 및 팔로잉 count 조회
const getFollowCounts = async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = await User.findById(userId);
        const followersCount = user.followers.length;
        const followingCount = user.following.length;
        
        res.status(200).json({
            success: true,
            followersCount,
            followingCount
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 팔로우 차단 혹은 차단 해제(다시 팔로우)
const updateFollowStatus = async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;
    const { status } = req.body;

    // Check if the followerId and followingId are the same
    if (followerId.toString() === followingId) {
        return res.status(400).json({ success: false, error: "You cannot follow or block yourself." });
    }

    // Check for a valid ObjectId for followingId
    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    // Validate status
    if (!['FOLLOWING', 'BLOCKED'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let followRecord;

        if (status === 'BLOCKED') {
            followRecord = await Follow.findOneAndUpdate(
                { follower: followerId, following: followingId },
                { status: 'BLOCKED' },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            ).session(session);

            // 팔로우 관계가 있을 경우, User 모델에서 제거
            if (followRecord) {
                await User.findByIdAndUpdate(followerId, { $pull: { following: followingId } }, { session });
                await User.findByIdAndUpdate(followingId, { $pull: { followers: followerId } }, { session });
            }
        } else if (status === 'FOLLOWING') {
            const removedFollow = await Follow.findOneAndRemove({
                follower: followerId,
                following: followingId,
                status: 'BLOCKED'
            }).session(session);

            if (!removedFollow) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, error: 'Block record not found or already unblocked.' });
            }
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, message: `Follow status updated to ${status}.`, data: followRecord });

    } catch (error) {
        await session.abortTransaction();
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: 'Server error while updating follow status.' });
        }
    } finally {
        session.endSession();
    }
};



// 팔로우 해제
const unfollowUser = async (req, res) => {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(followingId)) {
        return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const removedFollow = await Follow.findOneAndRemove({
            follower: followerId,
            following: followingId,
            status: 'FOLLOWING'
        }).session(session);

        if (!removedFollow) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Follow record not found or already unfollowed.' });
        }

        // 사용자 A의 팔로우 목록 업데이트
        await User.findByIdAndUpdate(followerId, {
            $pull: { following: followingId }
        }, { session });

        // 사용자 B의 팔로워 목록 업데이트
        await User.findByIdAndUpdate(followingId, {
            $pull: { followers: followerId }
        }, { session });

        const unfollowedUser = await User.findById(followingId)
            .select('_id nickname profileImage statusMessage followers following') // 필요한 필드만 선택
            .session(session);            
        await session.commitTransaction();
        res.status(200).json({ success: true, data: unfollowedUser });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ success: false, error: 'Server error while processing unfollow.' });
    } finally {
        session.endSession();
    }
};

// 사용자 검색 api
const searchUser = async (req, res) => {
    try {
        const nickname = req.query.nickname;
        const loggedInUserId = req.user._id; // 로그인한 사용자의 ID

        if (!nickname) {
            return res.status(400).json({ success: false, message: 'No nickname provided for search.' });
        }
        
        // 닉네임을 기준으로 로그인 한 사용자를 제외한 사용자 검색
        const users = await User.find({ 
            _id: { $ne: loggedInUserId }, // 로그인 한 사용자 제외
            nickname: { $regex: nickname, $options: 'i' } // 대소문자 구분 없는 검색
        }).select('_id nickname profileImage statusMessage');
        
        return res.status(200).json({ success: true, users: users });
    } catch (error) {
        console.error(`Search User Error: ${error}`);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// 차단 목록 api
const blockedList = async (req, res) => {
    try {
        // 현재 로그인한 사용자 ID 가져오기
        const userId = req.user._id; 
        
        // 해당 사용자가 차단한 사용자 목록 검색
        const blockedUsers = await Follow.find({ 
            follower: userId,
            status: 'BLOCKED'
        }).populate('following', 'nickname profileImage statusMessage');
        
        // 차단한 사용자의 정보만 추출
        const blockedUserInfo = blockedUsers.map(bu => bu.following);
        
        return res.status(200).json({ success: true, blockedList: blockedUserInfo });
    } catch (error) {
        console.error(`Blocked List Error: ${error}`);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


module.exports = {
    followUser,
    checkFollowStatus,
    getFollowers,
    getFollowing,
    getFollowCounts,
    updateFollowStatus,
    unfollowUser,
    searchUser,
    blockedList
};
