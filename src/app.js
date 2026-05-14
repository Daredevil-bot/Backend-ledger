const express = require('express');
const app=express();
const cookieParser=require('cookie-parser');
const authRoutes=require('./routes/auth.routes');
const accountRoutes=require('./routes/account.routes');
const transactionRoutes=require('./routes/transaction.routes');

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth',authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);


module.exports=app;