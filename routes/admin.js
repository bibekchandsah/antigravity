const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { getStats, getActivityLogs } = require('../utils/db');

router.use(verifySession);

router.get('/setup-totp', (req, res) => {
    const secret = speakeasy.generateSecret({ length: 20 });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) {
            return res.status(500).json({ error: 'Error generating QR code' });
        }
        res.json({ secret: secret.base32, qr_code: data_url });
    });
});

router.get('/stats', (req, res) => {
    getStats((err, stats) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ ...stats, uptime: process.uptime() });
    });
});

router.get('/activity-logs', (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;

    getActivityLogs(offset, limit, (err, logs) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ logs, offset, limit });
    });
});

const { getLockedUsers, resetAttempts } = require('../utils/rateLimiter');

router.get('/locked-users', (req, res) => {
    const lockedUsers = getLockedUsers();
    res.json(lockedUsers);
});

router.post('/unlock-user', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });



    resetAttempts(ip);
    res.json({ success: true, message: `User ${ip} unlocked` });
});

const { getUserSessions, revokeSession } = require('../utils/db');

router.get('/sessions', (req, res) => {
    // In a real app, get user ID from req.user
    const userId = 'admin';
    getUserSessions(userId, (err, sessions) => {
        if (err) return res.status(500).json({ error: err.message });

        // Mark current session
        const currentSessionId = req.user ? req.user.sessionId : null;
        const sessionsWithCurrent = sessions.map(s => ({
            ...s,
            isCurrent: s.session_id === currentSessionId
        }));

        res.json(sessionsWithCurrent);
    });
});

router.post('/revoke-session', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

    revokeSession(sessionId, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
