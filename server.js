require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const User = require('./models/User'); 
const app = express();

// --- 1. Middleware ---
app.use(cors());
app.use(bodyParser.json());

// Security (CSP) Fix
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self' http://localhost:3000 http://localhost:5500; connect-src 'self' http://localhost:3000 http://localhost:5500; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
    next();
});

// --- 2. MONGODB CONNECTION ---
mongoose.connect('mongodb://127.0.0.1:27017/protrade')
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- 3. NODEMAILER SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER, 
        pass: process.env.GMAIL_PASS  
    }
});

transporter.verify((error) => {
    if (error) {
        console.log("❌ Gmail Setup Fail: .env file ya App Password check karein!");
    } else {
        console.log("✅ Email Server Ready!");
    }
});

// --- 4. API ROUTES ---

// SIGNUP
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Database update (Naya user banaye ga ya update karega)
        await User.findOneAndUpdate({ email }, { password, otp: otpCode }, { upsert: true });

        await transporter.sendMail({
            from: `"ProTrade Support" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Verify Your Account - Signup OTP",
            text: `ProTrade mein khush-aamdeed! Aapka Signup OTP code ye hai: ${otpCode}`
        });
        
        res.json({ success: true, message: "Signup successful! OTP sent." });
    } catch (err) { 
        res.status(500).json({ success: false, error: "Email failed." }); 
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ error: "Ghalat Email ya Password!" });
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otpCode;
        await user.save();

        await transporter.sendMail({
            from: `"ProTrade Security" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Login Verification - OTP",
            text: `Aapka Login OTP code ye hai: ${otpCode}`
        });

        res.json({ success: true, message: "OTP sent to Gmail!" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// VERIFY OTP (Sahi wala: Jo balance DB se uthaye)
app.post('/api/verify-otp', async (req, res) => {
    const { email, userOtp } = req.body;
    try {
        const user = await User.findOne({ email, otp: userOtp });
        if (user) {
            user.otp = null; 
            await user.save();
            // User ka actual balance bhej raha hai taake reset na ho
            res.json({ success: true, balance: user.balance }); 
        } else {
            res.status(400).json({ error: "Invalid OTP" });
        }
    } catch (err) { res.status(500).json({ error: "Verification failed" }); }
});

// TRADE (Sahi wala: Jo balance update aur save kare)
app.post('/api/trade', async (req, res) => {
    const { email, type, amount, price, symbol } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Balance calculation
        if (type === 'BUY') {
            user.balance -= amount;
        } else if (type === 'SELL') {
            user.balance += amount;
        }

        user.trades.push({ type, amount, price, symbol, timestamp: new Date() });
        
        await user.save(); // Pakka save in MongoDB
        res.json({ success: true, newBalance: user.balance });
    } catch (err) { 
        res.status(500).json({ error: "Trade failed" }); 
    }
});

// --- 5. SERVER START ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log("------------------------------------------");
    console.log(`🚀 Server is live on: http://localhost:${PORT}`);
    console.log("------------------------------------------");
});