const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    }}, { timestamps: true });

    blacklistSchema.index({ blacklistedAt: 1 }, { expireAfterSeconds: 60*60*24*3 });

    const Blacklist=mongoose.model('Blacklist', blacklistSchema);

    module.exports=Blacklist;