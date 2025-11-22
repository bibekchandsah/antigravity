const express = require('express');
const router = express.Router();
const { verifySession } = require('../middleware/authMiddleware');

router.get('/', verifySession, (req, res) => {
    const sessionTimeout = process.env.SESSION_TIMEOUT || 15;
    res.render('index', { sessionTimeout });
});

module.exports = router;
