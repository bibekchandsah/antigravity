const jwt = require('jsonwebtoken');

const verifySession = (req, res, next) => {
    const token = req.cookies.session_token;
    if (!token) {
        return res.redirect('/auth/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET);

        // Sliding Session: Refresh the token
        const sessionTimeout = process.env.SESSION_TIMEOUT || 15;
        const newToken = jwt.sign({ user: decoded.user }, process.env.SESSION_SECRET, { expiresIn: `${sessionTimeout}m` });
        res.cookie('session_token', newToken, { httpOnly: true, maxAge: sessionTimeout * 60 * 1000 });

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
