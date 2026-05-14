const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middleware/auth.middleware');


router.post('/', authMiddleware.authMiddleware, accountController.createAccount);

module.exports = router;