const Transaction = require('./transaction.model');
const Account = require('./account.model');
const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
    account:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    transaction:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        index: true,
    },
    amount:{
        type: Number,
        required: true,
    },
    type:{
        type: String,
        enum: ['debit', 'credit'],
        required: true,
    }
}, { timestamps: true });

function preventModification() {
    return new Error('Ledger entries cannot be modified or deleted');
}

ledgerEntrySchema.pre('findOneAndUpdate', preventModification);
ledgerEntrySchema.pre('updateOne', preventModification);
ledgerEntrySchema.pre('deleteOne', preventModification);
ledgerEntrySchema.pre('deleteMany', preventModification);
ledgerEntrySchema.pre('remove', preventModification);
ledgerEntrySchema.pre('updateMany', preventModification);
ledgerEntrySchema.pre('findOneAndDelete', preventModification);
ledgerEntrySchema.pre('findOneAndRemove', preventModification);

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);

module.exports = LedgerEntry;