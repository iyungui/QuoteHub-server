// models/Report.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'onModel' },
    reporterId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true, enum: ['user', 'bookstory'] },
    reason: { type: String, required: true, default: "부적절한 콘텐츠" },
    onModel: { type: String, required: true, enum: ['User', 'BookStory'] }
}, { timestamps: true });

// 중복 신고 방지를 위한 복합 인덱스
reportSchema.index({ reporterId: 1, targetId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);