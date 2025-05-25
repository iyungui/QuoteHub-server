// middleware/ensureAuthenticated.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY;

module.exports = async function ensureAuthenticated(req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'No token provided. You must be logged in to access this resource.' 
        });
    }

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        req.user = decodedToken;
        next();
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid token.' 
        });
    }
};