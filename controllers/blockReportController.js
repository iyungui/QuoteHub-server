// controllers/blockReportController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Report = require('../models/Report');
const { sendSuccess, sendError } = require('../utils/responseHelper');

// 사용자 차단
const blockUser = async (req, res) => {
    const userId = req.user._id;
    const { targetUserId } = req.body;

    // 자기 자신을 차단할 수 없음
    if (userId.toString() === targetUserId) {
        return sendError(res, 400, "자기 자신을 차단할 수 없습니다.");
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return sendError(res, 400, '잘못된 사용자 ID입니다.');
    }

    try {
        // 대상 사용자가 존재하는지 확인
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return sendError(res, 404, '사용자를 찾을 수 없습니다.');
        }

        // 이미 차단된 사용자인지 확인
        const user = await User.findById(userId);
        if (user.blockedUsers.includes(targetUserId)) {
            return sendError(res, 400, '이미 차단된 사용자입니다.');
        }

        // 차단 목록에 추가
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { blockedUsers: targetUserId } }
        );

        return sendSuccess(res, 200, '사용자를 차단했습니다.');
    } catch (error) {
        console.error('Block user error:', error);
        return sendError(res, 500, '차단 처리 중 오류가 발생했습니다.');
    }
};

// 사용자 차단 해제
const unblockUser = async (req, res) => {
    const userId = req.user._id;
    const { targetUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return sendError(res, 400, '잘못된 사용자 ID입니다.');
    }

    try {
        // 차단 목록에서 제거
        const result = await User.findByIdAndUpdate(
            userId,
            { $pull: { blockedUsers: targetUserId } },
            { new: true }
        );

        if (!result.blockedUsers || !result.blockedUsers.includes(targetUserId)) {
            return sendSuccess(res, 200, '사용자 차단을 해제했습니다.');
        } else {
            return sendError(res, 404, '차단되지 않은 사용자입니다.');
        }
    } catch (error) {
        console.error('Unblock user error:', error);
        return sendError(res, 500, '차단 해제 처리 중 오류가 발생했습니다.');
    }
};

// 신고 및 차단 (통합)
const reportAndBlock = async (req, res) => {
    const reporterId = req.user._id;
    const { targetId, type, reason } = req.body;

    // type 검증
    if (!['user', 'bookstory'].includes(type)) {
        return sendError(res, 400, '잘못된 신고 유형입니다.');
    }

    // 자기 자신을 신고할 수 없음 (사용자 신고의 경우)
    if (type === 'user' && reporterId.toString() === targetId) {
        return sendError(res, 400, "자기 자신을 신고할 수 없습니다.");
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return sendError(res, 400, '잘못된 대상 ID입니다.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 중복 신고 확인
        const existingReport = await Report.findOne({ 
            reporterId, 
            targetId, 
            type 
        }).session(session);

        if (existingReport) {
            await session.abortTransaction();
            return sendError(res, 400, '이미 신고한 대상입니다.');
        }

        // onModel 설정
        const onModel = type === 'user' ? 'User' : 'BookStory';

        // 신고 저장
        const newReport = new Report({
            targetId,
            reporterId,
            type,
            reason: reason || "부적절한 콘텐츠",
            onModel
        });

        await newReport.save({ session });

        // 사용자 신고의 경우 차단 목록에도 추가
        if (type === 'user') {
            await User.findByIdAndUpdate(
                reporterId,
                { $addToSet: { blockedUsers: targetId } },
                { session }
            );
        }
        // 북스토리 신고의 경우 해당 북스토리 작성자를 차단
        else if (type === 'bookstory') {
            // 북스토리 작성자 찾기
            const BookStory = require('../models/BookStory');
            const bookStory = await BookStory.findById(targetId).session(session);
            if (bookStory && bookStory.userId) {
                await User.findByIdAndUpdate(
                    reporterId,
                    { $addToSet: { blockedUsers: bookStory.userId } },
                    { session }
                );
            }
        }

        await session.commitTransaction();
        return sendSuccess(res, 201, '신고가 접수되었습니다.');
    } catch (error) {
        await session.abortTransaction();
        console.error('Report and block error:', error);
        return sendError(res, 500, '신고 처리 중 오류가 발생했습니다.');
    } finally {
        session.endSession();
    }
};

// 신고 취소
const cancelReport = async (req, res) => {
    const reporterId = req.user._id;
    const { targetId, type } = req.body;

    if (!['user', 'bookstory'].includes(type)) {
        return sendError(res, 400, '잘못된 신고 유형입니다.');
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return sendError(res, 400, '잘못된 대상 ID입니다.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 신고 기록 삭제
        const deletedReport = await Report.findOneAndDelete({
            reporterId,
            targetId,
            type
        }).session(session);

        if (!deletedReport) {
            await session.abortTransaction();
            return sendError(res, 404, '신고 기록을 찾을 수 없습니다.');
        }

        // 차단도 해제 (사용자 신고의 경우)
        if (type === 'user') {
            await User.findByIdAndUpdate(
                reporterId,
                { $pull: { blockedUsers: targetId } },
                { session }
            );
        }
        // 북스토리 신고 취소의 경우 해당 작성자 차단 해제
        else if (type === 'bookstory') {
            const BookStory = require('../models/BookStory');
            const bookStory = await BookStory.findById(targetId).session(session);
            if (bookStory && bookStory.userId) {
                await User.findByIdAndUpdate(
                    reporterId,
                    { $pull: { blockedUsers: bookStory.userId } },
                    { session }
                );
            }
        }

        await session.commitTransaction();
        return sendSuccess(res, 200, '신고를 취소했습니다.');
    } catch (error) {
        await session.abortTransaction();
        console.error('Cancel report error:', error);
        return sendError(res, 500, '신고 취소 처리 중 오류가 발생했습니다.');
    } finally {
        session.endSession();
    }
};

// 차단 목록 조회
const getBlockedUsers = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId)
            .populate('blockedUsers', 'nickname profileImage statusMessage')
            .select('blockedUsers');

        return sendSuccess(res, 200, '차단 목록을 조회했습니다.', user.blockedUsers);
    } catch (error) {
        console.error('Get blocked users error:', error);
        return sendError(res, 500, '차단 목록 조회 중 오류가 발생했습니다.');
    }
};

// 신고 목록 조회
const getReports = async (req, res) => {
    const reporterId = req.user._id;

    try {
        const reports = await Report.find({ reporterId })
            .populate('targetId')
            .sort({ createdAt: -1 });

        return sendSuccess(res, 200, '신고 목록을 조회했습니다.', reports);
    } catch (error) {
        console.error('Get reports error:', error);
        return sendError(res, 500, '신고 목록 조회 중 오류가 발생했습니다.');
    }
};

module.exports = {
    blockUser,
    unblockUser,
    reportAndBlock,
    cancelReport,
    getBlockedUsers,
    getReports
};