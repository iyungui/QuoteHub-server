// middleware/optionalAuthentication.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET_KEY;

/**
 * 선택적 인증 미들웨어
 * Authorization 헤더가 있으면 사용자 인증을 수행하고, 없으면 그냥 통과
 * 인증에 실패해도 에러를 반환하지 않고 req.user를 null로 설정
 */
const optionalAuthentication = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.split('Bearer ')[1] 
        : null;

    // 토큰이 없으면 그냥 통과
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        // 토큰 검증
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 사용자 정보 조회 (차단 목록 포함)
        const user = await User.findById(decoded._id).select('-appleRefreshToken -appleId');
        
        if (user) {
            req.user = user;
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        // 토큰이 유효하지 않아도 에러를 반환하지 않고 null로 설정
        req.user = null;
        next();
    }
};

module.exports = optionalAuthentication;