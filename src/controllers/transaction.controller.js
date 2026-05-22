const Transaction = require('../models/transaction.model');
const Account = require('../models/account.model');
const LedgerEntry = require('../models/ledger.model');
const mongoose = require('mongoose');
const emailService = require('../services/email.service');
const { invalidateCache, invalidateCachePattern, cacheKey } = require('../middleware/cache.middleware');
const { transactionSchema, initialFundSchema } = require('../validationSchema');
/**
 * vaidate req
 * validate idompetency
 * validate account status
 * derive sender balance
 * create transaction with pending status
 * create ledger entry for sender
 * create ledger entry for receiver
 * update transaction to completed
 * mongodb commit transaction
 * send email notification to sender and receiver
 * handle errors and rollback if necessary
 */


exports.createTransaction = async (req, res) => {
    const result = transactionSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    const { fromAccount, toAccount, amount, idempotencyKey } = result.data;

    const existingTransaction = await Transaction.findOne({ idempotencyKey });
    if (existingTransaction) {
        if (existingTransaction.status === 'completed') {
            return res.status(200).json(existingTransaction);
        }
        else if (existingTransaction.status === 'pending') {
            return res.status(202).json({ message: 'Transaction is still pending' });
        }
        else if (existingTransaction.status === 'failed') {
            return res.status(500).json({ message: 'Previous transaction failed, please try again' });
        }
        else {
            return res.status(500).json({ message: "Transaction reversed, please try again" });
        }
    }

    const fromAccountDoc = await Account.findById(fromAccount);
    const toAccountDoc = await Account.findById(toAccount);

    if (!fromAccountDoc || !toAccountDoc) {
        return res.status(404).json({ message: 'One or both accounts not found' });
    }

    if (fromAccountDoc.status !== 'active' || toAccountDoc.status !== 'active') {
        return res.status(400).json({ message: 'One or both accounts are not active' });
    }

    const balance = await fromAccountDoc.getBalance();
    if (balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
    }

    let transaction;
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        transaction = await Transaction.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: 'pending'
        }], { session });

        await LedgerEntry.create([{
            account: fromAccount,
            type: 'debit',
            amount,
            transaction: transaction[0]._id
        }], { session });

        await LedgerEntry.create([{
            account: toAccount,
            type: 'credit',
            amount,
            transaction: transaction[0]._id
        }], { session });

        await Transaction.findByIdAndUpdate(transaction[0]._id, { status: 'completed' }, { session });

        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Transaction failed:', error);
        return res.status(500).json({ message: 'Transaction is pending, please try again later' });
    }

    await invalidateCache(
        cacheKey('account:balance', fromAccount),
        cacheKey('account:balance', toAccount),
        cacheKey('account:details', fromAccountDoc.user),
        cacheKey('account:details', toAccountDoc.user),
    );
    await invalidateCachePattern(cacheKey('txn:history', fromAccount));
    await invalidateCachePattern(cacheKey('txn:history', toAccount));

    const userEmail = await fromAccountDoc.populate('user').then(doc => doc.user.email);
    const userName = await fromAccountDoc.populate('user').then(doc => doc.user.name);
    const receiverEmail = await toAccountDoc.populate('user').then(doc => doc.user.email);
    const receiverName = await toAccountDoc.populate('user').then(doc => doc.user.name);

    emailService.sendTransactionEmail(userEmail, userName, amount, toAccountDoc._id).catch((err) =>
        console.error('Transaction email failed:', err.message)
    );
    emailService.sendTransactionEmail(receiverEmail, receiverName, amount, toAccountDoc._id).catch((err) =>
        console.error('Transaction email failed:', err.message)
    );

    return res.status(201).json(transaction[0]);
};

exports.createInitialFundsTransaction = async (req, res) => {
        const result = initialFundSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
    }
    const { toAccount, amount, idempotencyKey } = result.data;

    const existingTransaction = await Transaction.findOne({ idempotencyKey });
    if (existingTransaction) {
        if (existingTransaction.status === 'completed') {
            return res.status(200).json(existingTransaction);
        }
        else if (existingTransaction.status === 'pending') {
            return res.status(202).json({ message: 'Transaction is still pending' });
        }
        else if (existingTransaction.status === 'failed') {
            return res.status(500).json({ message: 'Previous transaction failed, please try again' });
        }
        else {
            return res.status(500).json({ message: "Transaction reversed, please try again" });
        }
    }

    const fromAccount = await Account.findOne({ user: req.user._id });
    if (!fromAccount) {
        return res.status(404).json({ message: 'System account not found for user' });
    }

    const toAccountDoc = await Account.findById(toAccount);
    if (!toAccountDoc) {
        return res.status(404).json({ message: 'Account not found' });
    }

    if (toAccountDoc.status !== 'active') {
        return res.status(400).json({ message: 'Account is not active' });
    }

    let transaction;
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        transaction = await Transaction.create([{
            fromAccount: fromAccount._id,
            toAccount: toAccountDoc._id,
            amount,
            idempotencyKey,
            status: 'pending'
        }], { session });

        await LedgerEntry.create([{
            account: fromAccount._id,
            type: 'debit',
            amount,
            transaction: transaction[0]._id
        }], { session });

        await LedgerEntry.create([{
            account: toAccountDoc._id,
            type: 'credit',
            amount,
            transaction: transaction[0]._id
        }], { session });

        await Transaction.findByIdAndUpdate(transaction[0]._id, { status: 'completed' }, { session });

        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Transaction failed:', error);
        return res.status(500).json({ message: 'Transaction is pending, please try again later' });
    }

    await invalidateCache(
        cacheKey('account:balance', toAccountDoc._id),
        cacheKey('account:details', toAccountDoc.user),
    );
    await invalidateCachePattern(cacheKey('txn:history', toAccountDoc._id));

    const userEmail = await toAccountDoc.populate('user').then(doc => doc.user.email);
    const userName = await toAccountDoc.populate('user').then(doc => doc.user.name);

    emailService.sendTransactionEmail(userEmail, userName, amount, toAccountDoc._id).catch((err) =>
        console.error('Transaction email failed:', err.message)
    );

    return res.status(201).json(transaction[0]);
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const { accountId } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        // Verify account belongs to logged-in user
        const account = await Account.findOne({ _id: accountId, user: req.user._id });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const [entries, total] = await Promise.all([
            LedgerEntry.find({ account: accountId })
                .populate({
                    path: 'transaction',
                    populate: [
                        { path: 'fromAccount', select: '_id' },
                        { path: 'toAccount', select: '_id' },
                    ]
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            LedgerEntry.countDocuments({ account: accountId }),
        ]);

        res.json({
            entries,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch transaction history' });
    }
};
