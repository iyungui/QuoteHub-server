// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    appleId: { type: String, unique: true },
    nickname: { type: String, default: '', unique: true },
    profileImage: { type: String, default: '' },
    statusMessage: { type: String, default: '' },
    monthlyReadingGoal: { type: Number, default: 1 },
    refreshToken: { type: String, default: '' },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('User', userSchema);
