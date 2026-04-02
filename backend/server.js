require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI_TEST;
const PORT = 3000;

const app = express(); // Create Express application instance
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON request bodies

const User = require('./models/User'); // Load User model (currently unused in this file)
const Team = require('./models/Team'); // Load Team model (used for startup seed check)
const Task = require('./models/Task'); // Load Task model (currently unused in this file)
const Score = require('./models/Score'); // Load Score model (currently unused in this file)

app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

mongoose.connect(mongoUri)
    .then(async () => { // Run startup logic only if DB connection succeeds
        console.log('⚫ MongoDB connection successful'); // Confirm successful DB connection in logs
        // Start the HTTP server only after a successful DB connection

        // Insert demo data only if the Team collection is empty
        const count = await Team.countDocuments(); // Count existing team documents
        if (count === 0) { // Only insert demo data if no teams exist
            console.log('⚠️ No teams found in DB, inserting demo data...'); // Log demo data insertion
            const demoTeams = [
                { name: 'Team Alpha', totalScore: 150 },
                { name: 'Team Beta', totalScore: 120 },
                { name: 'Team Gamma', totalScore: 90 }
            ];
            await Team.insertMany(demoTeams); // Insert demo teams into the database
            console.log('✅ Demo teams inserted successfully'); // Confirm successful demo data insertion
        } else {
            console.log(`✅ ${count} teams already exist in DB, skipping demo data insertion`); // Log existing team count
        }

        app.listen(PORT, '0.0.0.0', () => { // Start server on all network interfaces
            console.log(`✅ Server is up and running on port ${PORT} ✅`); // Log successful server startup
        });
    })
    .catch(err => { // Handle MongoDB connection failures
        console.error('❗❗❗CRITICAL ERROR during Atlas connection:', err.message); // Log connection error details
        process.exit(1); // Exit process with failure code so deployment can detect startup failure
    });