// controllers/bookstoryCommentController.js
const mongoose = require('mongoose');
const User = require('../models/User'); 
const BookStoryComment = require('../models/BookStoryComment');
const BookStory = require('../models/BookStory');
const { paginateQuery, calculateTotalPages } = require('../utils/pagination');
const { sendSuccess, sendError } = require('../utils/responseHelper');

exports.addCommentToBookStory = async (req, res, next) => {
    const { bookStoryId, content, parentCommentId } = req.body; 
    const userId = req.user._id;

    // Check if bookStoryId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookStoryId)) {
        return sendError(res, 400, 'Invalid bookStoryId format');
    }

    try {
        // Check if bookStory exists
        const bookStoryExists = await BookStory.exists({ _id: bookStoryId });
        if (!bookStoryExists) {
            return sendError(res, 404, 'BookStory not found');
        }
        
        // 부모 댓글의 유효성 검사
        if (parentCommentId) {
            const parentComment = await BookStoryComment.findById(parentCommentId);
            if (!parentComment) {
                return sendError(res, 404, 'Parent comment not found.');
            }
            // 부모 댓글이 이미 다른 댓글의 대댓글인 경우, 에러 응답
            if (parentComment.parentCommentId) {
                return sendError(res, 400, 'Replies to replies are not allowed.');
            }
            // 새로운 검증 로직 추가: 부모 댓글이 현재 BookstoryId에 속해 있는지 확인
            if (parentComment.bookStoryId.toString() !== bookStoryId) {
                return sendError(res, 400, 'Parent comment does not belong to the same book story.');
            }
        }

        const comment = new BookStoryComment({
            userId,
            bookStoryId,
            content,
            parentCommentId: parentCommentId || null
        });

        const savedComment = await comment.save();

        // 사용자 정보 가져오기
        const user = await User.findById(userId, 'nickname profileImage');

        if (!user) {
            return sendError(res, 404, 'User not found');
        }

        const commentResponse = {
            ...savedComment.toObject(),
            userId: {
                _id: userId,
                nickname: user.nickname,
                profileImage: user.profileImage
            }
        };

        return sendSuccess(res, 201, 'Comment added successfully.', commentResponse);
    } catch (error) {
        console.error('Error adding comment:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

exports.getCommentsForBookStory = async (req, res, next) => {
    const { bookStoryId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const replyPageSize = parseInt(req.query.replyPageSize, 10) || 3;

    try {    
        // Validate bookStoryId
        if (!mongoose.Types.ObjectId.isValid(bookStoryId)) {
            return sendError(res, 400, 'Invalid bookStoryId format');
        }
        
        // Check if bookStory exists
        const bookStoryExists = await BookStory.exists({ _id: bookStoryId });
        if (!bookStoryExists) {
            return sendError(res, 404, 'BookStory not found');
        }
        
        // Fetch root comments
        const rootCommentsQuery = BookStoryComment.find({
            bookStoryId,
            parentCommentId: null
        }).sort({ createdAt: -1 });

        // Pagination for root comments
        const rootComments = await paginateQuery(rootCommentsQuery, page, pageSize);

        // Prepare the response
        const commentsWithReplies = await Promise.all(
            rootComments.map(async (comment) => {
                // Fetch replies for each comment with a separate pagination
                const repliesQuery = BookStoryComment.find({
                    parentCommentId: comment._id
                }).sort({ createdAt: 1 });

                const replies = await paginateQuery(repliesQuery, 1, replyPageSize);

                // Populate user details for each reply
                const populatedReplies = await Promise.all(
                    replies.map(async (reply) => {
                        const user = await User.findById(reply.userId, 'nickname profileImage');
                        return { ...reply.toObject(), userId: user };
                    })
                );
                const user = await User.findById(comment.userId, 'nickname profileImage');

                return {
                    ...comment.toObject(),
                    userId: user,
                    replies: populatedReplies
                };
            })
        );

        const totalRootComments = await BookStoryComment.countDocuments({ bookStoryId, parentCommentId: null });
        const totalPages = calculateTotalPages(totalRootComments, pageSize);

        const responseData = {
            data: commentsWithReplies,
            page,
            pageSize,
            totalRootComments,
            totalPages
        };

        return sendSuccess(res, 200, 'Comments retrieved successfully.', responseData);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return sendError(res, 500, 'Internal Server Error');
    }
};

exports.deleteComment = async (req, res, next) => {
    const commentId = req.params.commentId;
    const userId = req.user._id;

    // 시작: 트랜잭션을 사용하여 모든 작업이 또는 작업이 없도록 보장합니다.
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const comment = await BookStoryComment.findById(commentId);

        if (!comment) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 404, 'Comment not found.');
        }

        if (comment.userId.toString() !== userId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 403, 'You do not have permission to delete this comment.');
        }

        // 대댓글을 포함하여 삭제합니다.
        await BookStoryComment.deleteMany({ 
            $or: [
                { _id: commentId },
                { parentCommentId: commentId }
            ]
        }, { session });

        await session.commitTransaction();
        session.endSession();

        return sendSuccess(res, 200, 'Comment and any replies deleted successfully.');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting comment:', error);
        return sendError(res, 500, 'Internal Server Error.');
    }
};

exports.getCommentCountForBookStory = async (req, res) => {
    try {
        const bookStoryId = req.params.bookStoryId;
        if (!mongoose.Types.ObjectId.isValid(bookStoryId)) {
            return sendError(res, 400, 'Invalid BookStory ID');
        }

        const commentCount = await BookStoryComment.countDocuments({ bookStoryId: bookStoryId });
        return sendSuccess(res, 200, 'Comment count retrieved successfully.', commentCount);
    } catch (error) {
        return sendError(res, 500, 'Server error while fetching comment count');
    }
};