const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

const { globalLimiter, authLimiter, transactionLimiter } = require('./middleware/rateLimiter.middleware');
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const transactionRoutes = require('./routes/transaction.routes');

// ── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── Global rate limit (all routes) ───────────────────────────
app.use(globalLimiter);

// ── Routes (with route-specific limiters) ────────────────────
app.get('/', (req, res) => res.send('Welcome to the Ledger API'));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionLimiter, transactionRoutes);

module.exports = app;
