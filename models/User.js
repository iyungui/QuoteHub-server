// models/User.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  appleId: { type: String, unique: true, sparse: true },
  nickname: { type: String, default: "", unique: true },
  profileImage: { type: String, default: "" },
  statusMessage: { type: String, default: null },
  refreshToken: { type: String, default: "" },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // 차단한 사용자 목록
}, {
  timestamps: true // createdAt, updatedAt 자동 추가
});

module.exports = mongoose.model("User", userSchema);