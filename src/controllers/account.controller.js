const Account = require('../models/account.model');

exports.createAccount = async (req, res) => {
   const userId = req.user._id;

   const account= new Account({
    user: userId,
   });
    await account.save();

   res.status(201).json({account});
}

exports.getAccountDetails = async (req, res) => {
    const userId = req.user._id;
    const account = await Account.findOne({ user: userId });
    if (!account) {
        return res.status(404).json({ message: 'Account not found' });
    }
    const balance = await account.getBalance();
    res.json({ account, balance });
}  

exports.getAccountBalance = async (req, res) => {
    const accountId = req.params.id;
    const account = await Account.findOne({ _id: accountId, user: req.user._id });
    if (!account) {
        return res.status(404).json({ message: 'Account not found' });
    }
    const balance = await account.getBalance();
    res.json({ balance });
};