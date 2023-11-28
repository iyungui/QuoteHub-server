// models/Report.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'onModel' },
    reporterId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true, enum: ['user', 'bookstory'] },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
    onModel: { type: String, required: true, enum: ['User', 'BookStory'] }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
