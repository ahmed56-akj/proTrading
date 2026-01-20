const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    balance: { 
        type: Number, 
        default: 10000.00 // Shuruati demo balance
    },
    otp: { 
        type: String 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    trades: [{
        symbol: { type: String, default: 'BTC/USDT' },
        type: { type: String }, // BUY ya SELL
        amount: Number,
        price: Number,
        status: { type: String, default: 'Closed' },
        time: { type: Date, default: Date.now }
    }]
});

// Is model ko export karein taake server.js mein use ho sake
module.exports = mongoose.model('User', userSchema);