// controllers/userController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const { sendSuccess, sendError } = require('../utils/responseHelper');

// 사용자 프로필 조회
const getUserProfile = async (req, res) => {
  try {
    let query;

    if (req.params.userId) {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
        return sendError(res, 400, "Invalid user ID");
      }
      query = { _id: req.params.userId };
    } else {
      // Get logged-in user's profile
      query = { _id: req.user._id };
    }

    const user = await User.findOne(query).select(
      "-refreshToken -appleId -__v"
    );
    
    if (user) {
      return sendSuccess(res, 200, "User profile retrieved successfully.", user);
    } else {
      return sendError(res, 404, "User not found");
    }
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "Internal Server Error");
  }
};

// 사용자 프로필 업데이트
const updateUserProfile = async (req, res) => {
  try {
    const updateFields = ["nickname", "statusMessage"];
    let updatedData = {};

    // Validate and update fields
    updateFields.forEach((field) => {
      if (req.body[field]) {
        updatedData[field] = req.body[field];
      }
    });

    // Check for duplicate nickname
    if (updatedData.nickname) {
      const existingUser = await User.findOne({
        nickname: updatedData.nickname,
      });
      if (
        existingUser &&
        existingUser._id.toString() !== req.user._id.toString()
      ) {
        return sendError(res, 400, "Nickname is already taken!");
      }
    }

    if (req.file) {
      updatedData.profileImage = req.file.location;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updatedData,
      { new: true }
    ).select("-refreshToken -appleId -__v -followers -following");
    
    return sendSuccess(res, 200, "User profile updated successfully.", updatedUser);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message || "Failed to update user!");
  }
};

// for testing purposes, get a list of users
const getUserList = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ _id: -1 })
      .limit(10)
      .select("-appleId -refreshToken");

    return sendSuccess(res, 200, "User list retrieved successfully.", users);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "Server error");
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserList
};