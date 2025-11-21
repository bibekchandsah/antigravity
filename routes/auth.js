const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('../middleware/authMiddleware');

router.get('/login', (req, res) => {
    res.sendFile('login.html', { root: './views' });
});

const { recordFailedAttempt, resetAttempts } = require('../utils/rateLimiter');
const { sendNotification } = require('../utils/notifications');

router.post('/login', rateLimit, async (req, res) => {
    const { token } = req.body;
    const secret = process.env.TOTP_SECRET;
    let ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    const userAgent = req.get('User-Agent');

    if (!secret) {
        return res.status(500).json({ success: false, message: 'TOTP secret not configured' });
    }

    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds leeway
    });

    if (verified) {
        resetAttempts(ip);
        const sessionToken = jwt.sign({ user: 'admin' }, process.env.SESSION_SECRET, { expiresIn: '15m' });
        res.cookie('session_token', sessionToken, { httpOnly: true, maxAge: 900000 }); // 15 mins

        // Send Notification
        sendNotification('Successful Login', {
            ip,
            userAgent,
            language: req.headers['accept-language'],
            session: sessionToken.substring(0, 10) + '...'
        });

        res.json({ success: true });
    } else {
        recordFailedAttempt(ip);
        res.status(401).json({ success: false, message: 'Invalid code' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('session_token');
    res.json({ success: true });
});

const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

router.get('/google', (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/userinfo.email'];
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });
    res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        if (data.email === process.env.ALLOWED_EMAIL) {
            const sessionToken = jwt.sign({ user: data.email }, process.env.SESSION_SECRET, { expiresIn: '15m' });
            res.cookie('session_token', sessionToken, { httpOnly: true, maxAge: 900000 });

            sendNotification('Successful Google Login', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                language: req.headers['accept-language'],
                session: sessionToken.substring(0, 10) + '...'
            });

            res.redirect('/');
        } else {
            sendNotification('Unauthorized Google Login Attempt', { ip: req.ip, userAgent: req.get('User-Agent'), email: data.email });
            res.redirect('/auth/login?error=Unauthorized Email');
        }
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.redirect('/auth/login?error=Authentication Failed');
    }
});

module.exports = router;
