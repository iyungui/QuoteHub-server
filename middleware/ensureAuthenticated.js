// middleware/ensureAuthenticated.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY;

module.exports = async function ensureAuthenticated(req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null; // 클라이언트는 액세스토큰 보냄

    if (!token) {
        return res.status(401).json({ error: 'No token provided. You must be logged in to access this resource.' });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET_KEY);     // 액세스 토큰 검증
        req.user = decodedToken; // 클라이언트에서 제공한 액세스 토큰이 유효한 경우
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
}