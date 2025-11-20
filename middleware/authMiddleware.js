const jwt = require('jsonwebtoken');

const verifySession = (req, res, next) => {
    const token = req.cookies.session_token;
    if (!token) {
        return res.redirect('/auth/login');
    }
    try {
        jwt.verify(token, process.env.SESSION_SECRET);
        next();
    } catch (err) {
        res.redirect('/auth/login');
    }
};

const { checkRateLimit } = require('../utils/rateLimiter');

const rateLimit = (req, res, next) => {
    const ip = req.ip;
    const status = checkRateLimit(ip);

    if (!status.allowed) {
        return res.status(429).json({
            success: false,
            message: 'Locked out',
            lockedUntil: status.lockedUntil
        });
    }
    next();
};

module.exports = { verifySession, rateLimit };
