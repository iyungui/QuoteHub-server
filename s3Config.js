// s3Config.js
const { S3Client } = require("@aws-sdk/client-s3");
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION
});

function dynamicPathSetter(req, file, cb) {
    let prefix = '';
    if (req.path.includes('profile')) {
        prefix = 'profile-images/';
    } else if (req.path.includes('bookstories')) {
        prefix = 'story-images/';
    }
    cb(null, prefix + Date.now().toString() + '-' + file.originalname);
}

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        key: dynamicPathSetter
    })
});

module.exports = upload;
