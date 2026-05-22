const { z } = require('zod');

const registerSchema = z.object({
    name: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(100),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
});

const transactionSchema = z.object({
    fromAccount: z.string().length(24, 'Invalid account ID'),
    toAccount: z.string().length(24, 'Invalid account ID'),
    amount: z.number().positive('Amount must be positive'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});

const initialFundSchema = z.object({
    toAccount: z.string().length(24, 'Invalid account ID'),
    amount: z.number().positive('Amount must be positive'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required'),
});

module.exports = { registerSchema, loginSchema, transactionSchema, initialFundSchema };
