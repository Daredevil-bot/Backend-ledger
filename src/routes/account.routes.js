const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middleware/auth.middleware');


router.post('/', authMiddleware.authMiddleware, accountController.createAccount);

router.get('/', authMiddleware.authMiddleware, accountController.getAccountDetails);

router.get('/balance/:id', authMiddleware.authMiddleware, accountController.getAccountBalance);

module.exports = router;