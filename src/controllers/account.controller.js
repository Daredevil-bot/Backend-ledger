const Account = require('../models/account.model');

exports.createAccount = async (req, res) => {
   const userId = req.user._id;

   const account= new Account({
    user: userId,
   });
    await account.save();

   res.status(201).json({account});
}