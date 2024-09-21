// models/User.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  appleId: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
  kakaoId: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String }, // 이메일 로그인용
  nickname: { type: String, default: "", unique: true },
  profileImage: { type: String, default: "" },
  refreshToken: { type: String, default: "" },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

const generateNickname = () => {
  return `user_${Math.floor(Math.random() * 10000)}`; // 예시로 랜덤 숫자를 사용
};

// 사용자 저장 전 닉네임 생성
userSchema.pre("save", function (next) {
  if (!this.nickname) {
    this.nickname = generateNickname();
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
