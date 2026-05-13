const mongoose = require('mongoose');

function connectDB() {
    const mongoURI = process.env.MONGO_URI;
    mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));
}

module.exports = connectDB;