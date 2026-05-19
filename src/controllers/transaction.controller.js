const Transaction = require('../models/transaction.model');
const Account = require('../models/account.model');
const LedgerEntry = require('../models/ledger.model');
const mongoose = require('mongoose');
const e = require('express');
const emailService = require('../services/email.service');
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
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    // validate request
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

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
    console.log("From account document:", fromAccountDoc);
    console.log("To account document:", toAccountDoc);

    if (!fromAccountDoc || !toAccountDoc) {
        return res.status(404).json({ message: 'One or both accounts not found' });
    }

    if (fromAccountDoc.status !== 'active' || toAccountDoc.status !== 'active') {
        return res.status(400).json({ message: 'One or both accounts are not active' });
    }

    const balance = await fromAccountDoc.getBalance();
    console.log(`Balance for account ${fromAccount}: ${balance}`);
    if (balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
    }

    let transaction
try{
    const session = await mongoose.startSession();
    session.startTransaction();


    
    transaction = await Transaction.create([{
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: 'pending'
    }], { session });

    const debitLedgerEntry = await LedgerEntry.create([{
        account: fromAccount,
        type: 'debit',
        amount,
        transaction: transaction._id

    }], { session });

    const creditLedgerEntry = await LedgerEntry.create([{
        account: toAccount,
        type: 'credit',
        amount,
        transaction: transaction._id

    }], { session });

   await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' }, { session });

    await session.commitTransaction();
    session.endSession();
    }
    catch(error){
        await session.abortTransaction();
        session.endSession();
        console.error('Transaction failed:', error);
        return res.status(500).json({ message: 'Transaction is pending, please try again later' });
    }

  

    const userEmail=await fromAccountDoc.populate('user').then(doc => doc.user.email);
    const userName=await fromAccountDoc.populate('user').then(doc => doc.user.name);

    const receiverEmail=await toAccountDoc.populate('user').then(doc => doc.user.email);
    const receiverName=await toAccountDoc.populate('user').then(doc => doc.user.name);

    await emailService.sendTransactionEmail(userEmail, userName, amount, toAccountDoc._id);
    await emailService.sendTransactionEmail(receiverEmail, receiverName, amount, toAccountDoc._id);

    return res.status(201).json(transaction);
}

exports.createInitialFundsTransaction = async (req, res) => {
    
    const { toAccount, amount, idempotencyKey } = req.body;
    console.log("To account details:", toAccount);

    // validate request
    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

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

    const fromAccount = await Account.findOne({ user: req.user._id});

   
    if (!fromAccount) {
        return res.status(404).json({ message: 'System account not found for user' });
    }
   

    const toAccountDoc = await Account.findById(toAccount);
    console.log("To account document:", toAccountDoc);

    if (!toAccountDoc) {
        return res.status(404).json({ message: 'Account not found' });
    }

    if (toAccountDoc.status !== 'active') {
        return res.status(400).json({ message: 'Account is not active' });
    }
    let transaction
try{
const session = await mongoose.startSession();
    session.startTransaction();

    transaction = await Transaction.create([{
        fromAccount: fromAccount._id,
        toAccount: toAccountDoc._id,
        amount,
        idempotencyKey,
        status: 'pending'
    }], { session });

    const debitLedgerEntry = await LedgerEntry.create([{
        account: fromAccount._id,
        type: 'debit',
        amount,
        transaction: transaction._id
    }], { session });

    const creditLedgerEntry = await LedgerEntry.create([{
        account: toAccountDoc._id,
        type: 'credit',
        amount,
        transaction: transaction._id

    }], { session });

    await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' }, { session });

    await session.commitTransaction();
    session.endSession();
}
catch(error){
    await session.abortTransaction();
    session.endSession();
    console.error('Transaction failed:', error);
    return res.status(500).json({ message: 'Transaction is pending, please try again later' });
}

     const userEmail=await toAccountDoc.populate('user').then(doc => doc.user.email);
     const userName=await toAccountDoc.populate('user').then(doc => doc.user.name);
    

    await emailService.sendTransactionEmail(userEmail, userName, amount, toAccountDoc._id);

    return res.status(201).json(transaction);
}