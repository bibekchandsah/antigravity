const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { getStats } = require('../utils/db');

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
        res.json(stats);
    });
});

module.exports = router;
