require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Environment variables
const mongoUri = process.env.MONGO_URI_TEST;
const PORT = process.env.PORT_BACKEND || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

// CORS: Allow frontend and local requests
app.use(cors({
    origin: [
        `http://localhost:${process.env.PORT_FRONTEND || 3000}`,
        'http://frontend:3000',
        `http://localhost:${process.env.PORT_BACKEND || 3001}`
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware: Parse JSON request bodies
app.use(express.json());

// Models
const User = require('./models/User');
const Team = require('./models/Team');
const Task = require('./models/Task');
const Score = require('./models/Score');

// API: Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// Middleware: Verify JWT token for protected routes
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// API: User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const user = await User.findOne({ username, deleted: false });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({
            token,
            user: { id: user._id, username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get all teams (protected)
app.get('/api/teams', verifyToken, async (req, res) => {
    try {
        const teams = await Team.find({ deleted: false });
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Database connection and server startup
mongoose.connect(mongoUri)
    .then(async () => {
        console.log('✅ MongoDB connected');

        // Insert demo teams if database is empty
        if (await Team.countDocuments() === 0) {
            const demoTeams = [
                { name: 'Team Alpha', totalScore: 150 },
                { name: 'Team Beta', totalScore: 120 },
                { name: 'Team Gamma', totalScore: 90 }
            ];
            await Team.insertMany(demoTeams);
            console.log('✅ Demo teams created');
        }

        // Insert demo users if database is empty
        if (await User.countDocuments() === 0) {
            const demoUsers = [
                { username: 'admin', password: await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, 10), role: 'ADMIN' },
                { username: 'user', password: await bcrypt.hash(process.env.INITIAL_USER_PASSWORD, 10), role: 'ORGANIZER' }
            ];
            await User.insertMany(demoUsers);
            console.log('✅ Demo users created (passwords hashed)');
        }

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    });