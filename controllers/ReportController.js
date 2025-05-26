// controllers/reportController.js
const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const BookStory = require('../models/BookStory');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const report = async (req, res, type, onModel) => {
    const reporterId = req.user._id;

    try {
        const { targetId, reason } = req.body;

        // 중복 신고 확인
        const existingReport = await Report.findOne({ reporterId, targetId, type });
        if (existingReport) {
            return sendError(res, 400, `You have already reported this ${onModel.toLowerCase()}.`);
        }

        const newReport = new Report({
            targetId,
            reporterId,
            type,
            reason,
            onModel
        });

        await newReport.save();
        return sendSuccess(res, 201, `${onModel} report submitted successfully.`);
    } catch (error) {
        return sendError(res, 500, `Error submitting ${onModel.toLowerCase()} report.`, error);
    }
};

const reportUser = async (req, res) => {
    await report(req, res, 'user', 'User');
};

const reportBookStory = async (req, res) => {
    await report(req, res, 'bookstory', 'BookStory');
};

// 사용자 신고 목록 조회 API
const getReportUsers = async (req, res) => {
    const reporterId = req.user._id;

    try {
        const userReports = await Report.find({ reporterId, type: 'user'})
            .populate('targetId')
            .select('-refreshToken -appleId -__v');
        
        return sendSuccess(res, 200, 'User reports retrieved successfully.', userReports);
    } catch (error) {
        return sendError(res, 500, 'Error retrieving user reports.', error);
    }
};

// 북스토리 신고 목록 조회 API
const getReportStories = async (req, res) => {
    const reporterId = req.user._id;

    try {
        const storyReports = await Report.find({ reporterId, type: 'bookstory' })
            .populate('targetId');
        
        return sendSuccess(res, 200, 'Story reports retrieved successfully.', storyReports);
    } catch (error) {
        return sendError(res, 500, 'Error retrieving story reports.', error);
    }
};

module.exports = {
    reportUser,
    reportBookStory,
    getReportUsers,
    getReportStories
};