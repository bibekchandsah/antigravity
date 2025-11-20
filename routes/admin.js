const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

router.use(verifySession);

router.get('/setup-totp', (req, res) => {
    const secret = speakeasy.generateSecret({ length: 20 });
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.json({ secret: secret.base32, qr_code: data_url });
    });
});

module.exports = router;
