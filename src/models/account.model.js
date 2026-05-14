const mongoose = require('mongoose');
const User = require('./user.model');

const accountSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status:{
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    currency:{
        type: String,
        default: 'INR'
    }

}, { timestamps: true });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;