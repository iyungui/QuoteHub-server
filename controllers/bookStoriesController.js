const mongoose = require('mongoose');
const BookStory = require('../models/BookStory');
const Book = require('../models/Book');
const BookStoryComment = require('../models/BookStoryComment');
const User = require('../models/User');
const { paginateQuery, calculateTotalPages } = require('../utils/pagination');

// 북스토리 생성
exports.createBookStory = async (req, res, next) => {
    const { 
        bookId, quote, content, isPublic, keywords 
    } = req.body;

    const userId = req.user._id;
    const folderIds = req.body.folderIds || [];

    const storyImageURLs = req.files ? req.files.map(file => file.location) : [];

    try {
        // 책의 유효성 확인
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found.' });
        }

        const bookStory = new BookStory({
            userId,
            bookId,
            quote, 
            content, 
            storyImageURLs, 
            isPublic,
            keywords,
            folderIds
        });

        const savedBookStory = await bookStory.save();

        const populatedBookStory = await BookStory.findById(savedBookStory._id)
        .populate('userId', 'nickname profileImage statusMessage')
        .populate('bookId');

        res.status(200).json({ success: true, data: populatedBookStory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// Get the count of BookStories for a specific user or the logged-in user
exports.getUserBookStoryCount = async (req, res, next) => {
    let query = {};

    // 특정 사용자의 ID로 조회
    if (req.params.userId) {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        query.userId = req.params.userId;
    } else {
        // 로그인한 사용자의 ID로 조회
        if (req.user && req.user._id) {
            query.userId = req.user._id;
        } else {
            // 인증된 사용자 정보가 없는 경우 오류 반환
            return res.status(401).json({ success: false, message: 'No authenticated user found.' });
        }
    }

    try {
        const count = await BookStory.countDocuments(query);
        return res.status(200).json({ success: true, count: count });
    } catch (error) {
        console.error('Error counting book stories:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// 조회 (전체)
// 모든 사용자의 공개된 북스토리 조회 with pagination
exports.getAllPublicBookStories = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        const baseQuery = BookStory.find({ isPublic: true })
            .populate('userId', 'nickname profileImage statusMessage')
            .populate('bookId')
            .sort({ createdAt: -1 });
        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);
            

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error('Error retrieving all public book stories:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal Server Error.' 
        });
    }
};

// 분류 x 친구 서재에서의 공개된 북스토리 조회 with pagination
exports.getFriendPublicBookStories = async (req, res, next) => {
    const friendId = req.params.friendId;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        const baseQuery = BookStory.find({ userId: friendId, isPublic: true })
            .populate('userId', 'nickname profileImage statusMessage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            BookStory.countDocuments({ userId: friendId, isPublic: true }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error(`Error retrieving friend's public book stories:`, error);
        res.status(500).json({ 
            success: false,
            message: 'Internal Server Error.' 
        });
    }
};

// 분류 x 해당 유저(내 서재)의 모든 북스토리 조회 (공개, 비공개 모두) with pagination
exports.getMyBookStories = async (req, res, next) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    try {
        // folderIds가 빈 배열인 문서만 조회하도록 쿼리 수정
        const baseQuery = BookStory.find({ userId })
            .populate('userId', 'nickname profileImage statusMessage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        const [totalItems, bookStories] = await Promise.all([
            // countDocuments 쿼리도 동일하게 수정
            BookStory.countDocuments({ userId }),
            paginateQuery(baseQuery, page, pageSize)
        ]);

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error(`Error retrieving user's book stories without folders:`, error);
        res.status(500).json({ 
            success: false,
            message: 'Internal Server Error.' 
        });
    }
};


// 조회(키워드)
// 로그인한 사용자의 북스토리 키워드 검색 with pagination
exports.getMyPublicBookStoriesWithKeyword = async (req, res, next) => {
    const userId = req.user._id;
    const keyword = req.query.keyword;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!keyword) {
        return res.status(400).json({ success: false, message: 'Keyword is required.' });
    }

    // Define the base query condition for reuse
    const queryCondition = {
        userId: userId,
        keywords: { $regex: keyword, $options: 'i' } 
    };

    try {
        // Separately create queries for count and find operations
        const totalItemsPromise = BookStory.countDocuments(queryCondition);
        const bookStoriesQuery = BookStory.find(queryCondition)
            .populate('userId', 'nickname profileImage statusMessage')
            .populate('bookId')
            .sort({ createdAt: -1 });

        // Execute the paginated query
        const bookStoriesPromise = paginateQuery(bookStoriesQuery, page, pageSize);

        // Use Promise.all to execute both queries in parallel
        const [totalItems, bookStories] = await Promise.all([totalItemsPromise, bookStoriesPromise]);

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error('Error retrieving user\'s book stories with keyword:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

// 친구 서재에서의 공개된 북스토리 키워드 검색 with pagination
exports.getFriendPublicBookStoriesWithKeyword = async (req, res, next) => {
    const friendId = req.params.friendId;
    const keyword = req.query.keyword;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!keyword) {
        return res.status(400).json({ success: false, message: 'Keyword is required.' });
    }

    // Check if friendId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({ success: false, message: 'Invalid friend ID format.' });
    }

    try {
        // Check if the friendId corresponds to an existing user
        const friendExists = await User.exists({ _id: friendId });
        if (!friendExists) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        // Define the query conditions separately
        const queryCondition = {
            userId: friendId,
            isPublic: true,
            keywords: { $regex: keyword, $options: 'i' }
        };

        // Use the conditions for both the count and the find queries
        const totalItemsPromise = BookStory.countDocuments(queryCondition);
        const bookStoriesQuery = BookStory.find(queryCondition)
            .populate('userId', 'nickname profileImage statusMessage') 
            .populate('bookId')
            .sort({ createdAt: -1 });

        // Execute the paginated query
        const bookStoriesPromise = paginateQuery(bookStoriesQuery, page, pageSize);

        // Use Promise.all to execute both queries in parallel
        const [totalItems, bookStories] = await Promise.all([totalItemsPromise, bookStoriesPromise]);

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error('Error retrieving friend\'s public book stories with keyword:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// 모든 사용자의 공개된 북스토리 키워드 검색 with pagination
exports.getAllPublicBookStoriesWithKeyword = async (req, res, next) => {
    const keyword = req.query.keyword;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;

    if (!keyword) {
        return res.status(400).json({ success: false, message: 'Keyword is required.' });
    }

    try {
        const queryCondition = { 
            isPublic: true,
            keywords: { $regex: keyword, $options: 'i' } // case-insensitive search
        };
        
        // 분리된 count 쿼리
        const totalItems = await BookStory.countDocuments(queryCondition);

        // 별도의 find 쿼리로 변경됩니다.
        const bookStoriesQuery = BookStory.find(queryCondition)
        .populate('userId', 'nickname profileImage statusMessage') 
        .populate('bookId')
        .sort({ createdAt: -1 });

        // 페이지네이션을 적용하여 데이터를 조회합니다.
        const bookStories = await paginateQuery(bookStoriesQuery, page, pageSize);

        res.status(200).json({
            success: true,
            data: bookStories,
            currentPage: page,
            totalPages: calculateTotalPages(totalItems, pageSize),
            pageSize: pageSize,
            totalItems: totalItems
        });
    } catch (error) {
        console.error('Error retrieving all public book stories with keyword:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

exports.updateBookStory = async (req, res, next) => {
    const bookStoryId = req.params.id;
    const userId = req.user._id;

    const { quote, content, isPublic } = req.body;
    let { keywords, folderIds } = req.body;
    const updatedStoryImageURLs = req.files ? req.files.map(file => file.location) : [];

    // Ensure folderIds is an array
    folderIds = Array.isArray(folderIds) ? folderIds : (folderIds ? [folderIds] : []);

    // Ensure keywords is an array
    keywords = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);

    // Construct update object
    const update = {
        ...(quote && { quote }),
        ...(content && { content }),
        ...(isPublic !== undefined && { isPublic }),
        ...(keywords.length && { keywords }),
        ...(folderIds.length && { folderIds }),
        ...(updatedStoryImageURLs.length && { storyImageURLs: updatedStoryImageURLs }),
    };

    try {
        // Update the document
        const bookStory = await BookStory.findOneAndUpdate(
            { _id: bookStoryId, userId: userId },
            { $set: update },
            { new: true, runValidators: true }
        ).populate('userId', 'nickname profileImage statusMessage')
          .populate('bookId');

        if (!bookStory) {
            return res.status(404).json({ success: false, message: 'BookStory not found or you are not the owner.' });
        }

        res.status(200).json({ success: true, data: bookStory });
    } catch (error) {
        console.error('Error updating book story:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

exports.getBookStoryById = async (req, res, next) => {
    const bookStoryId = req.params.id;

    try {
        const bookStory = await BookStory.findById(bookStoryId)
            .populate('userId', 'nickname profileImage statusMessage')
            .populate('bookId');

        if (!bookStory) {
            return res.status(404).json({ success: false, message: 'BookStory not found.' });
        }

        res.status(200).json({ success: true, data: bookStory });
    } catch (error) {
        console.error('Error retrieving book story:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

exports.deleteBookStory = async (req, res, next) => {
    const bookStoryId = req.params.id;
    const userId = req.user._id;

    try {
        // 트랜잭션 시작
        const session = await mongoose.startSession();
        session.startTransaction();

        // findOneAndDelete로 문서를 찾고 삭제
        const bookStory = await BookStory.findOneAndDelete({ _id: bookStoryId, userId: userId }, { session });

        // 문서가 존재하지 않거나, 사용자의 문서가 아닌 경우 동일한 메시지 반환
        if (!bookStory) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'BookStory not found or not authorized to delete.' });
        }

        // 해당 북스토리에 연관된 댓글들 삭제
        await BookStoryComment.deleteMany({ bookStoryId: bookStoryId }, { session });

        // 트랜잭션 완료
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: 'BookStory and related comments deleted successfully.' });
    } catch (error) {
        console.error('Error deleting book story:', error);
        // 트랜잭션 중 에러 발생 시 롤백
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};


// 다중 삭제
exports.deleteMultipleBookStories = async (req, res, next) => {
    const { bookStoryIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(bookStoryIds) || !bookStoryIds.every(mongoose.Types.ObjectId.isValid)) {
        return res.status(400).json({ success: false, message: 'Invalid book story IDs.' });
    }

    try {
        const result = await BookStory.deleteMany({
            _id: { $in: bookStoryIds },
            userId: userId
        });

        if (result.deletedCount !== bookStoryIds.length) {
            return res.status(404).json({ success: false, message: 'Some BookStories were not found, or you are not authorized to delete them.' });
        }

        res.status(200).json({ success: true, message: `${result.deletedCount} BookStory(ies) deleted successfully.` });
    } catch (error) {
        console.error('Error deleting multiple book stories:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid book story IDs.' });
        }
        res.status(500).json({ success: false, message: 'Internal Server Error.' });
    }
};

