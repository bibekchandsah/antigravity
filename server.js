require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const useragent = require('useragent');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup (using simple HTML files served from views)
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const indexRoutes = require('./routes/index');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', indexRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    if (!process.env.TOTP_SECRET) {
        const secret = speakeasy.generateSecret({ length: 20 });
        console.log('\n==================================================');
        console.log('WARNING: No TOTP Secret found in .env');
        console.log('Generated Temporary Secret for Setup:');
        console.log(`Secret Key: ${secret.base32}`);
        console.log('--------------------------------------------------');
        console.log('Scan this QR Code with your Authenticator App:');

        qrcode.toString(secret.otpauth_url, { type: 'terminal', small: true }, (err, url) => {
            if (err) console.log('Error generating QR code');
            else console.log(url);
            console.log('==================================================\n');
            console.log('IMPORTANT: Please add this Secret Key to your .env file as TOTP_SECRET=... and restart the server.');
        });
    }
});
