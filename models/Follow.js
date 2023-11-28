// models/Follow.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followSchema = new Schema({
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // 팔로우 하는 사람
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // 팔로우 당하는 사람
    status: {
        type: String,
        enum: ['FOLLOWING', 'BLOCKED'],
        default: 'FOLLOWING'
    }
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true }); // 팔로워와 팔로우 대상의 조합은 유니크해야 함

module.exports = mongoose.model('Follow', followSchema);
