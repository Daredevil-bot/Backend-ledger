const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const Blacklist= require('../models/blacklist.model');
const { registerSchema, loginSchema } = require('../validationSchema');

exports.register = async (req, res) => {
    try {
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: result.error.format() });
        }
        const { email, password, name } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(422).json({ error: 'User already exists' });
        }
        const user = new User({ email, password, name });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        res.status(201).json({ user: { id: user._id, email: user.email, name: user.name }, token });

        emailService.sendRegistrationEmail(user.email, user.name).catch((err) =>
            console.error('Registration email failed:', err.message)
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login=async(req,res)=>{
    try{
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: result.error.format() });
        }
        const {email,password}= req.body;
        if(!email || !password){
            return res.status(400).json({error:'Email and password are required'});
        }
        const user=await User.findOne({email}).select('+password +systemUser');
        if(!user){
            return res.status(401).json({error:'Invalid credentials'});
        }
        const isValidPassword=await user.comparePassword(password);
        if(!isValidPassword){
            return res.status(401).json({error:'Invalid credentials'});
        }
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'1h'});
        res.cookie('token',token,{
            httpOnly:true,
            sameSite:'strict',
        });
        res.json({user:{id:user._id,email:user.email,name:user.name,isSystemUser:user.systemUser??false},token});
    }catch(err){
        console.error(err);
        res.status(500).json({error:'Server error'});
    }
}

exports.me = async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
            isSystemUser: req.user.systemUser ?? false,
        }
    });
};

exports.logout = async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }
    await Blacklist.create({ token });
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
}