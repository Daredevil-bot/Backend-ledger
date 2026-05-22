const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

router.post('/', authMiddleware.authMiddleware, accountController.createAccount);

router.get(
    '/',
    authMiddleware.authMiddleware,
    cacheMiddleware('account:details', (req) => req.user._id),
    accountController.getAccountDetails
);

router.get(
    '/balance/:id',
    authMiddleware.authMiddleware,
    cacheMiddleware('account:balance', (req) => req.params.id),
    accountController.getAccountBalance
);

module.exports = router;
