const mongoose = require('mongoose');
const User = require('./user.model');
const ledgerEntry = require('./ledger.model');

const accountSchema = new mongoose.Schema({
   user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
   },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    currency: {
        type: String,
        default: 'INR'
    }

}, { timestamps: true });

accountSchema.methods.getBalance = async function () {
    const balanceData = await ledgerEntry.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalCredits: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
                totalDebits: { $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] } }
            }
        },
        { $project: { _id: 0, balance: { $subtract: ["$totalCredits", "$totalDebits"] } } }
    ]);
    if(balanceData.length === 0){
        return 0;
    }
    return balanceData[0].balance;
}

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;

