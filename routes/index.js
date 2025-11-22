const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');

// Root route - Project Navigation Page
router.get('/', verifySession, (req, res) => {
    res.render('index');
});

// Admin Dashboard Route
router.get('/admin', verifySession, (req, res) => {
    res.render('admin');
});

// API endpoint to list projects
router.get('/api/projects', verifySession, (req, res) => {
    const projectsDir = path.join(__dirname, '../projects');

    try {
        if (!fs.existsSync(projectsDir)) {
            return res.json([]);
        }

        const projects = fs.readdirSync(projectsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => ({
                name: dirent.name,
                displayName: dirent.name.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
            }));

        res.json(projects);
    } catch (err) {
        console.error('Error reading projects directory:', err);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// Session keep-alive endpoint
router.get('/api/ping', verifySession, (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Session configuration endpoint
router.get('/api/session-config', verifySession, (req, res) => {
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 15;
    res.json({ sessionTimeout });
});

module.exports = router;
