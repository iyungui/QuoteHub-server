const mongoose = require('mongoose');
const BookStory = require('../models/BookStory');
const Folder = require('../models/Folder');

const { paginateQuery, calculateTotalPages } = require('../utils/pagination');

// 모든 사용자의 공개된 북스토리 폴더별 조회
exports.getAllPublicBookStoriesByFolder = async (req, res) => {
    const { folderId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid folder identifier.'
        });
    }

    try {
        const baseQuery = BookStory.find({ folderIds: folderId, isPublic: true })
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ folderIds: folderId, isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        if (totalItems === 0) {
            return res.status(200).json({
                success: true,
                message: 'No book stories found in the specified folder.',
                data: [], // 비어있는 데이터 배열
                currentPage: page,
                totalPages: 0, // 총 페이지 수는 0으로
                pageSize: pageSize,
                totalItems: totalItems
            });
        }

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder identifier.'
            });
        }
        console.error('Error retrieving public book stories by folder:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error.'
        });
    }
};



// 특정 친구의 공개된 북스토리 폴더별 조회
exports.getFriendPublicBookStoriesByFolder = async (req, res) => {
    const { folderId, friendId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId) || !mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid folder or friend identifier.'
        });
    }

    try {
        const baseQuery = BookStory.find({ userId: friendId, folderIds: folderId, isPublic: true })
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ userId: friendId, folderIds: folderId, isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        if (totalItems === 0) {
            return res.status(200).json({
                success: true,
                message: 'No book stories found in the specified folder.',
                data: [], // 비어있는 데이터 배열
                currentPage: page,
                totalPages: 0, // 총 페이지 수는 0으로
                pageSize: pageSize,
                totalItems: totalItems
            });
        }

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder or friend identifier.'
            });
        }
        console.error('Error retrieving friend book stories by folder:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error.'
        });
    }
};


// 내 서재의 북스토리 폴더별 조회
exports.getMyBookStoriesByFolder = async (req, res) => {
    const { folderId } = req.params;
    const userId = req.user._id; // 인증된 사용자의 ID
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid folder identifier.'
        });
    }

    try {
        const baseQuery = BookStory.find({ userId, folderIds: folderId })
            .populate('userId', 'nickname profileImage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ userId, folderIds: folderId }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        // 폴더에 북스토리가 없는 경우 처리
        if (totalItems === 0) {
            return res.status(200).json({
                success: true,
                message: 'No book stories found in the specified folder.',
                data: [], // 비어있는 데이터 배열
                currentPage: page,
                totalPages: 0, // 총 페이지 수는 0으로
                pageSize: pageSize,
                totalItems: totalItems
            });
        }

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        // CastError를 확인하여 명확한 에러 메시지를 제공
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder identifier.'
            });
        }
        console.error('Error retrieving my book stories by folder:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error.'
        });
    }
};


// 폴더 생성
exports.createFolder = async (req, res) => {
    const { name, description, isPublic } = req.body; // isPublic 값을 req.body에서 추출
    const userId = req.user._id;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }

    const folderImageURL = req.file ? req.file.location : undefined;

    try {
        // 새로운 폴더 생성 시 isPublic 값을 포함
        const folder = new Folder({
            userId,
            name,
            description,
            folderImageURL,
            isPublic: isPublic !== undefined ? isPublic : true // isPublic 값이 제공되지 않으면 기본값 true 사용
        });

        // 폴더 저장
        const newFolder = await folder.save();
        const populatedFolder = await Folder.findById(newFolder._id)
        .populate('userId', 'nickname profileImage')

        // 성공 응답 반환
        res.status(201).json({ success: true, data: populatedFolder });
    } catch (error) {
        // 에러 처리
        if (error.code === 11000) { // Mongoose duplicate key error
            return res.status(409).json({ success: false, message: 'Folder already exists.' });
        } else {
            console.error('Error creating folder:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error.' });
        }
    }
};

// 모든 사용자의 폴더 목록 조회 with pagination
exports.getAllFolders = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    try {
        const baseQuery = Folder.find({ isPublic: true })
            .populate('userId', 'nickname profileImage')
            .sort({ createdAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments({ isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        res.status(200).json({
            success: true,
            data: folders,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error('Error retrieving all folders:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// 특정 사용자의 폴더 목록 조회 with pagination
exports.getUserFolders = async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        const baseQuery = Folder.find({ userId: userId, isPublic: true })
            .populate('userId', 'nickname profileImage')
            .sort({ createdAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments({ userId: userId, isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        res.status(200).json({
            success: true,
            data: folders,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error(`Error retrieving folders for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// 내 폴더 목록 조회 with pagination
exports.getMyFolders = async (req, res) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        const baseQuery = Folder.find({ userId: userId })
            .populate('userId', 'nickname profileImage')
            .sort({ createdAt: -1 });

        const [totalItems, folders] = await Promise.all([
            Folder.countDocuments({ userId: userId }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        res.status(200).json({
            success: true,
            data: folders,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error(`Error retrieving folders for the logged-in user:`, error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
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
                ...(isPublic !== undefined && { isPublic }) // isPublic 값이 제공되면 업데이트 객체에 추가
            },
            { new: true, runValidators: true }
        ).populate('userId', 'nickname profileImage');

        if (!updatedFolder) {
            return res.status(404).json({ success: false, message: 'Folder not found or user not authorized.' });
        }

        res.status(200).json({ success: true, data: updatedFolder });
    } catch (error) {
        // 에러 처리 - 중복된 폴더 이름에 대한 처리
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Folder already exists.' });
        } else {
            console.error('Error updating folder:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error.' });
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
            return res.status(404).json({ success: false, message: 'Folder not found or user not authorized to delete.' });
        }

        // 폴더 삭제 후, 해당 폴더에 속한 북스토리들의 folderIds 배열에서 이 폴더 ID를 제거합니다.
        await BookStory.updateMany(
            { folderIds: folderId },
            { $pull: { folderIds: folderId } }
        );

        res.status(200).json({ success: true, message: 'Folder and its references in BookStories deleted successfully.' });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};
