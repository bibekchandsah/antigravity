const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');

router.get('/', verifySession, (req, res) => {
    res.sendFile('index.html', { root: './views' });
});

module.exports = router;
