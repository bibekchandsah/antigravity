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
    const projectsJsonPath = path.join(projectsDir, 'projects.json');

    try {
        if (!fs.existsSync(projectsDir)) {
            return res.json([]);
        }

        // Read centralized metadata
        let projectsMetadata = [];
        if (fs.existsSync(projectsJsonPath)) {
            try {
                const fileContent = fs.readFileSync(projectsJsonPath, 'utf8');
                projectsMetadata = JSON.parse(fileContent);
            } catch (e) {
                console.error('Error reading projects.json:', e);
            }
        }

        const projects = fs.readdirSync(projectsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                // Find metadata for this project
                const metadata = projectsMetadata.find(p => p.name === dirent.name) || {};

                return {
                    name: dirent.name,
                    displayName: metadata.displayName || dirent.name.split('-').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' '),
                    // description: metadata.description || 'No description available.',
                    description: metadata.description || 'Click to view project.',
                    icon: metadata.icon || null,
                    hidden: metadata.hidden || false
                };
            })
            .filter(project => !project.hidden);

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
