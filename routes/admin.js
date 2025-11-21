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

module.exports = router;
