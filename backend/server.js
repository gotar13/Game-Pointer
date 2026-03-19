require('dotenv').config(); // Load environment variables from .env into process.env

const express = require('express'); // Import Express framework
const cors = require('cors'); // Import CORS middleware
const mongoUri = process.env.MONGO_URI_TEST; // Read test Mongo URI from env (currently unused)
const gptKey = process.env.OPENAI_API_KEY; // Read OpenAI API key from env (currently unused)
const mongoose = require('mongoose'); // Import Mongoose for MongoDB connection and models

const app = express(); // Create Express application instance
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse incoming JSON request bodies

const User = require('./models/User'); // Load User model (currently unused in this file)
const Team = require('./models/Team'); // Load Team model (used for startup seed check)
const Task = require('./models/Task'); // Load Task model (currently unused in this file)
const Score = require('./models/Score'); // Load Score model (currently unused in this file)

const PORT = process.env.PORT; // Read server port from environment

// Diagnostic checks before attempting DB connection
const dns = require('dns'); // Import DNS module for connectivity diagnostics
dns.lookup('google.com', (err, address) => { // Resolve google.com to verify general DNS works
    console.log('DNS Test (google.com):', address || 'ERROR: ' + err.message); // Print DNS result or error
});
dns.lookup('GotharDB.mongodb.net', (err, address) => { // Resolve MongoDB host to verify Atlas DNS resolution
    console.log('MongoDB DNS Test:', address || 'ERROR: ' + err.message); // Print MongoDB DNS result or error
});

mongoose.connect(process.env.MONGO_URI) // Connect to MongoDB using main connection string
    .then(async () => { // Run startup logic only if DB connection succeeds
        console.log('MongoDB connection successful'); // Confirm successful DB connection in logs
        // Start the HTTP server only after a successful DB connection

        // Insert demo data only if the Team collection is empty
        const count = await Team.countDocuments(); // Count existing team documents

        if (count === 0) { // Check if there are no teams yet
            console.log('Database is empty, creating test teams...');
            await Team.insertMany([ // Insert initial sample teams
                { name: 'Red Team', totalScore: 10, deleted: false }, 
                { name: 'Blue Team', totalScore: 25, deleted: true }, 
                { name: 'Green Team', totalScore: 0, deleted: false } 
            ]);

            console.log('✅ 3 test teams inserted successfully'); // Log seed completion message

        } else { // Run if teams already exist
            console.log(`There are already ${count} teams in the database.`); // Log existing team count
        } 

        app.listen(PORT, '0.0.0.0', () => { // Start server on all network interfaces
            console.log(`✅ Server is up and running on port ${PORT} ✅`); // Log successful server startup
        }); 
    }) 
    .catch(err => { // Handle MongoDB connection failures
        console.error('❗❗❗CRITICAL ERROR during Atlas connection:', err.message); // Log connection error details
        process.exit(1); // Exit process with failure code so deployment can detect startup failure
    });