const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,'Email is required'],
        unique:[true,'Email already exists'],
        lowercase:true,
        trim:true,
        match:[/^\S+@\S+\.\S+$/,'Please provide a valid email address'],
    },
    password:{
        type:String,
        required:[true,'Password is required'],
        minlength:[6,'Password must be at least 6 characters long'],
        select:false
    },
    systemUser:{
        type:Boolean,
        default:false,
        immutable:true,
        select:false
    },
    name:{
        type:String,
        required:[true,'Name is required'],
        trim:true
    }
},{
    timestamps:true
});

userSchema.pre('save', async function(){
    if(!this.isModified('password')) return ;
   
        const hash=await bcrypt.hash(this.password,10);
        this.password=hash;
        return;
    
});

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}

const User = mongoose.model('User', userSchema);

module.exports = User;