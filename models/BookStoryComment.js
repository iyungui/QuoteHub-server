const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// BookStoryComment Schema
const bookStoryCommentSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookStoryId: { type: Schema.Types.ObjectId, ref: 'BookStory', required: true },
    content: { type: String, required: true },
    parentCommentId: { type: Schema.Types.ObjectId, ref: 'BookStoryComment' }, // 대댓글 기능을 위한 필드
}, { timestamps: true });

bookStoryCommentSchema.index({ userId: 1, bookStoryId: 1 });

module.exports = mongoose.model('BookStoryComment', bookStoryCommentSchema);
