require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const useragent = require('useragent');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Proxy for Render/Heroku
app.set('trust proxy', true);

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
const uploadRoutes = require('./routes/upload');
const { verifySession } = require('./middleware/authMiddleware');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Serve projects folder with authentication and script injection
app.use('/projects', verifySession, (req, res, next) => {
    // Check if request is for HTML or directory (which might serve index.html)
    const isHtml = req.path.endsWith('.html');
    const isDir = req.path.endsWith('/') || !path.extname(req.path);
    let filePath = path.join(__dirname, 'projects', req.path);

    // 1. Handle Directory/HTML requests (with script injection)
    if (isHtml || isDir) {
        // Handle directory index
        if (isDir) {
            // Redirect to trailing slash if missing, to ensure relative assets work
            if (!req.path.endsWith('/') && fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
                return res.redirect(req.originalUrl + '/');
            }

            // If it's a directory, try to find index.html or public/index.html
            if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
                if (fs.existsSync(path.join(filePath, 'index.html'))) {
                    filePath = path.join(filePath, 'index.html');
                } else if (fs.existsSync(path.join(filePath, 'public', 'index.html'))) {
                    filePath = path.join(filePath, 'public', 'index.html');
                }
            } else if (!path.extname(filePath)) {
                // If it's a path without extension that isn't a dir (e.g. /projects/foo), try adding .html
                if (fs.existsSync(filePath + '.html')) {
                    filePath = filePath + '.html';
                }
            }
        }

        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile() && filePath.endsWith('.html')) {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) return next(err);

                // Inject script before closing body tag
                const injectedContent = data.replace('</body>', '<script src="/js/session-keepalive.js"></script></body>');
                res.send(injectedContent);
            });
            return;
        }
    }

    // 2. Handle Asset requests (CSS, JS, Images) - Check public folder if not found in root
    if (!fs.existsSync(filePath)) {
        // Try to find it in a 'public' subdirectory of the project
        // Assumption: req.path is like /projectName/style.css
        const parts = req.path.split('/').filter(p => p);
        if (parts.length >= 2) {
            const projectName = parts[0];
            const assetPath = parts.slice(1).join('/');
            const publicFilePath = path.join(__dirname, 'projects', projectName, 'public', assetPath);

            if (fs.existsSync(publicFilePath)) {
                return res.sendFile(publicFilePath);
            }
        }
    }

    next();
}, express.static(path.join(__dirname, 'projects')));

// Mount upload routes (for API endpoints like /upload, /api/folders)
app.use('/', uploadRoutes);

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
