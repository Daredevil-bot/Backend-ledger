const Account = require('../models/account.model');
const { invalidateCache, cacheKey } = require('../middleware/cache.middleware');

exports.createAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        const account = new Account({ user: userId });
        await account.save();
        await invalidateCache(cacheKey('account:details', userId));
        res.status(201).json({ account });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create account' });
    }
};

exports.getAccountDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const accounts = await Account.find({ user: userId });
        if (!accounts.length) {
            return res.status(404).json({ message: 'No accounts found' });
        }
        res.json({ accounts });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch accounts' });
    }
};

exports.getAccountBalance = async (req, res) => {
    try {
        const accountId = req.params.id;
        const account = await Account.findOne({ _id: accountId, user: req.user._id });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }
        const balance = await account.getBalance();
        res.json({ balance });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch balance' });
    }
};
