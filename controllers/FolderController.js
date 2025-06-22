// controllers/folderController.js
const mongoose = require('mongoose');
const BookStory = require('../models/BookStory');
const Folder = require('../models/Folder');
const { paginateQuery, calculateTotalPages } = require('../utils/pagination');
const { sendSuccess, sendSuccessWithPagination, sendError } = require('../utils/responseHelper');
const { applyBookStoryFilter, applyFolderFilter } = require('../utils/filterHelper');

// 모든 사용자의 공개된 북스토리 폴더별 조회 (필터링 적용)
exports.getAllPublicBookStoriesByFolder = async (req, res) => {
    const { folderId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return sendError(res, 400, 'Invalid folder identifier.');
    }

    try {
        // 기본 쿼리 조건
        let queryCondition = { folderIds: folderId, isPublic: true };
        
        // 인증된 사용자가 있으면 차단 필터 적용
        if (req.user) {
            queryCondition = applyBookStoryFilter(queryCondition, req.user);
        }

        const baseQuery = BookStory.find(queryCondition)
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ updatedAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments(queryCondition),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        if (totalItems === 0) {
            const pagination = {
                currentPage: page,
                totalPages: 0,
                pageSize: pageSize,
                totalItems: totalItems
            };
            return sendSuccessWithPagination(res, 200, 'No book stories found in the specified folder.', [], pagination);
        }

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, 'Public book stories retrieved successfully.', bookStories, pagination);
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return sendError(res, 400, 'Invalid folder identifier.');
        }
        console.error('Error retrieving public book stories by folder:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 특정 친구의 공개된 북스토리 폴더별 조회 (필터링 적용)
exports.getFriendPublicBookStoriesByFolder = async (req, res) => {
    const { folderId, friendId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId) || !mongoose.Types.ObjectId.isValid(friendId)) {
        return sendError(res, 400, 'Invalid folder or friend identifier.');
    }

    try {
        // 기본 쿼리 조건
        let queryCondition = { userId: friendId, folderIds: folderId, isPublic: true };
        
        // 인증된 사용자가 있으면 차단 필터 적용
        if (req.user) {
            queryCondition = applyBookStoryFilter(queryCondition, req.user);
        }

        const baseQuery = BookStory.find(queryCondition)
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ updatedAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments(queryCondition),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        if (totalItems === 0) {
            const pagination = {
                currentPage: page,
                totalPages: 0,
                pageSize: pageSize,
                totalItems: totalItems
            };
            return sendSuccessWithPagination(res, 200, 'No book stories found in the specified folder.', [], pagination);
        }

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, "Friend's book stories retrieved successfully.", bookStories, pagination);
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return sendError(res, 400, 'Invalid folder or friend identifier.');
        }
        console.error('Error retrieving friend book stories by folder:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 내 서재의 북스토리 폴더별 조회 (필터링 불필요 - 자신의 콘텐츠)
exports.getMyBookStoriesByFolder = async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user._id; // 인증된 사용자의 ID
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return sendError(res, 400, 'Invalid folder identifier.');
    }

    try {
        const baseQuery = BookStory.find({ userId, folderIds: folderId })
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ updatedAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ userId, folderIds: folderId }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        // 폴더에 북스토리가 없는 경우 처리
        if (totalItems === 0) {
            const pagination = {
                currentPage: page,
                totalPages: 0,
                pageSize: pageSize,
                totalItems: totalItems
            };
            return sendSuccessWithPagination(res, 200, 'No book stories found in the specified folder.', [], pagination);
        }

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, 'My book stories retrieved successfully.', bookStories, pagination);
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return sendError(res, 400, 'Invalid folder identifier.');
        }
        console.error('Error retrieving my book stories by folder:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 폴더 생성
exports.createFolder = async (req, res) => {
    const { name, description, isPublic } = req.body;
    const userId = req.user._id;

    if (!name) {
        return sendError(res, 400, 'Folder name is required.');
    }

    const folderImageURL = req.file ? req.file.location : undefined;

    try {
        // 새로운 폴더 생성 시 isPublic 값을 포함
        const folder = new Folder({
            userId,
            name,
            description,
            folderImageURL,
            isPublic: isPublic !== undefined ? isPublic : true
        });

        // 폴더 저장
        const newFolder = await folder.save();
        const populatedFolder = await Folder.findById(newFolder._id)
            .populate('userId', 'nickname profileImage');

        return sendSuccess(res, 201, 'Folder created successfully.', populatedFolder);
    } catch (error) {
        // 에러 처리
        if (error.code === 11000) { // Mongoose duplicate key error
            return sendError(res, 409, 'Folder already exists.');
        } else {
            console.error('Error creating folder:', error);
            return sendError(res, 500, 'Internal Server Error.');
        }
    }
};

// 모든 사용자의 폴더 목록 조회 with pagination (필터링 적용)
exports.getAllFolders = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    
    try {
        // 기본 쿼리 조건
        let queryCondition = { isPublic: true };
        
        // 인증된 사용자가 있으면 차단 필터 적용
        if (req.user) {
            queryCondition = applyFolderFilter(queryCondition, req.user);
        }

        const baseQuery = Folder.find(queryCondition)
            .populate('userId', 'nickname profileImage')
            .sort({ updatedAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments(queryCondition),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, 'All folders retrieved successfully.', folders, pagination);
    } catch (error) {
        console.error('Error retrieving all folders:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 특정 사용자의 폴더 목록 조회 with pagination (필터링 적용)
exports.getUserFolders = async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        // 기본 쿼리 조건
        let queryCondition = { userId: userId, isPublic: true };
        
        // 인증된 사용자가 있으면 차단 필터 적용
        if (req.user) {
            queryCondition = applyFolderFilter(queryCondition, req.user);
        }

        const baseQuery = Folder.find(queryCondition)
            .populate('userId', 'nickname profileImage')
            .sort({ updatedAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments(queryCondition),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, 'User folders retrieved successfully.', folders, pagination);
    } catch (error) {
        console.error(`Error retrieving folders for user ${userId}:`, error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 내 폴더 목록 조회 with pagination (필터링 불필요 - 자신의 콘텐츠)
exports.getMyFolders = async (req, res) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        const baseQuery = Folder.find({ userId: userId })
            .populate('userId', 'nickname profileImage')
            .sort({ updatedAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments({ userId: userId }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        const pagination = {
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        };

        return sendSuccessWithPagination(res, 200, 'My folders retrieved successfully.', folders, pagination);
    } catch (error) {
        console.error(`Error retrieving folders for the logged-in user:`, error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 폴더 업데이트
exports.updateFolder = async (req, res) => {
    const { folderId } = req.params;
    const { name, description, isPublic } = req.body;
    const folderImageURL = req.file ? req.file.location : undefined;
    const userId = req.user._id; // 인증된 사용자 ID

    try {
        // userId와 folderId가 일치하는 문서를 찾아 업데이트
        const updatedFolder = await Folder.findOneAndUpdate(
            { _id: folderId, userId: userId },
            {
                name,
                description,
                folderImageURL,
                ...(isPublic !== undefined && { isPublic })
            },
            { new: true, runValidators: true }
        ).populate('userId', 'nickname profileImage');

        if (!updatedFolder) {
            return sendError(res, 404, 'Folder not found or user not authorized.');
        }

        return sendSuccess(res, 200, 'Folder updated successfully.', updatedFolder);
    } catch (error) {
        // 에러 처리 - 중복된 폴더 이름에 대한 처리
        if (error.code === 11000) {
            return sendError(res, 409, 'Folder already exists.');
        } else {
            console.error('Error updating folder:', error);
            return sendError(res, 500, 'Internal Server Error.');
        }
    }
};

// 폴더 삭제
exports.deleteFolder = async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user._id; // 인증된 사용자 ID

    try {
        const folder = await Folder.findOneAndDelete({ _id: folderId, userId: userId });
        if (!folder) {
            return sendError(res, 404, 'Folder not found or user not authorized to delete.');
        }

        // 폴더 삭제 후, 해당 폴더에 속한 북스토리들의 folderIds 배열에서 이 폴더 ID를 제거합니다.
        await BookStory.updateMany(
            { folderIds: folderId },
            { $pull: { folderIds: folderId } }
        );

        return sendSuccess(res, 200, 'Folder and its references in BookStories deleted successfully.');
    } catch (error) {
        console.error('Error deleting folder:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

// 조회 (ID로 단일 폴더 조회)
exports.getFolderById = async (req, res) => {
    const { folderId } = req.params;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return sendError(res, 400, 'Invalid folder identifier.');
    }

    try {
        const folder = await Folder.findById(folderId)
            .populate('userId', 'nickname profileImage statusMessage')

        if (!folder) {
            return sendError(res, 404, 'Folder not found.');
        }

        return sendSuccess(res, 200, 'Folder retrieved successfully.', folder);
    } catch (error) {
        console.error('Error retrieving folder by ID:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
}