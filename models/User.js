// models/User.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  appleId: { type: String, unique: true, sparse: true },
  nickname: { type: String, default: "", unique: true },
  profileImage: { type: String, default: "" },
  statusMessage: { type: String, default: null },
  monthlyReadingGoal: { type: Number, default: null },
  refreshToken: { type: String, default: "" },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, {
  timestamps: true // createdAt, updatedAt 자동 추가
});

module.exports = mongoose.model("User", userSchema);