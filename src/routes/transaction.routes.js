const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transaction.controller');
const { cacheMiddleware } = require('../middleware/cache.middleware');

router.post('/', authMiddleware.authMiddleware, transactionController.createTransaction);

router.post('/initial-funds', authMiddleware.systemAuthMiddleware, transactionController.createInitialFundsTransaction);

router.get(
    '/history/:accountId',
    authMiddleware.authMiddleware,
    cacheMiddleware('txn:history', (req) => `${req.params.accountId}:${req.query.page || 1}`),
    transactionController.getTransactionHistory
);

module.exports = router;
