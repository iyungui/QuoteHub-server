const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true }, // 폴더 이름 (문자열을 저장하기 전에 앞뒤 공백을 자동으로 제거)
    description: { type: String, trim: true, default: '' },           // 폴더에 대한 설명 (옵션)
    folderImageURL: { type: String, default: '' },                    // 폴더 대표 이미지 URL
    isPublic: { type: Boolean, default: true }
}, { timestamps: true });

folderSchema.index({ userId: 1 });

module.exports = mongoose.model('Folder', folderSchema);
