const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const blacklist = require('../models/blacklist.model');

exports.authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const blacklistEntry = await blacklist.findOne({ token });
        if (blacklistEntry) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('+systemUser');
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

exports.systemAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const blacklistEntry = await blacklist.findOne({ token });
        if (blacklistEntry) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('+systemUser');
        if (!user || !user.systemUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
