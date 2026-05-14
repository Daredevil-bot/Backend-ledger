const express = require('express');
const router=express.Router();

router.post('/',(req,res)=>{
    res.json({message:'Transaction created successfully'});
});

module.exports=router;