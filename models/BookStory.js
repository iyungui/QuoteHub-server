const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookStorySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    quotes: [
        {
            quote: { type: String, required: true },
            page: { type: Number, required: false }
        }
    ],
    content: { type: String, required: false },
    storyImageURLs: [{ type: String, required: false }],  // 여러 이미지 URL을 담기 위해 배열로 정의
    isPublic: { type: Boolean, default: true, required: true }, // 스토리의 공개 여부
    keywords: [{ type: String, required: false }],       // 핵심 키워드를 담을 수 있도록 함
    folderIds: [{ type: Schema.Types.ObjectId, ref: 'Folder', required: false }]     // 같은 북스토리가 여러개의 폴더에 포함될 수 있음.
}, { timestamps: true });

bookStorySchema.index({ userId: 1, isPublic: -1 }); // 공개된 스토리에 대한 빠른 쿼리를 위한 복합 인덱스

bookStorySchema.pre('save', function (next) {
    if (this.keywords) {
        this.keywords = [...new Set(this.keywords)];        // 중복된 키워드는 제거하고 save
    }
    next();
});

module.exports = mongoose.model('BookStory', bookStorySchema);
