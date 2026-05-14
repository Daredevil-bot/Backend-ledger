const mongoose = require('mongoose');
const Account = require('./account.model');

const transactionSchema = new mongoose.Schema({
    fromAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    toAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    amount:{
        type: Number,
        required: true,
        index: true,
    },
    status:{
        type: String,
        enum: ['pending', 'completed', 'failed','reversed'],
        default: 'pending',
    },
    idempotencyKey:{
        type: String,
        required: true,
        unique: true,
        index: true,
    }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;   