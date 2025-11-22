const jwt = require('jsonwebtoken');
const { checkRateLimit } = require('../utils/rateLimiter');
const { getSession, updateSessionActivity } = require('../utils/db');

const verifySession = (req, res, next) => {
    const token = req.cookies.session_token;
    if (!token) {
        return res.redirect('/auth/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET);

        // Validate Session from DB
        if (decoded.sessionId) {
            getSession(decoded.sessionId, (err, session) => {
                if (err || !session) {
                    // Session revoked or invalid
                    res.clearCookie('session_token');
                    return res.redirect('/auth/login?error=Session Revoked');
                }

                // Update Activity
                updateSessionActivity(decoded.sessionId);

                // Sliding Session: Refresh the token
                const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 15;
                const newToken = jwt.sign({ user: decoded.user, sessionId: decoded.sessionId }, process.env.SESSION_SECRET, { expiresIn: `${sessionTimeout}m` });
                res.cookie('session_token', newToken, {
                    httpOnly: true,
                    maxAge: sessionTimeout * 60 * 1000,
                    path: '/',
                    sameSite: 'Lax'
                });

                req.user = decoded;
                next();
            });
        } else {
            // Legacy token support (optional, or force logout)
            next();
        }
    } catch (err) {
        console.error('Session verification failed:', err.message);
        res.redirect('/auth/login');
    }
};

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
