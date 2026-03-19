require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoUri = process.env.MONGO_URI_TEST;
const gptKey = process.env.OPENAI_API_KEY;
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const User = require('./models/User');
const Team = require('./models/Team');
const Task = require('./models/Task');
const Score = require('./models/Score');

const PORT = process.env.PORT;

const dns = require('dns');
dns.lookup('google.com', (err, address) => {
    console.log('DNS Teszt (google.com):', address || 'HIBA: ' + err.message);
});
dns.lookup('GotharDB.mongodb.net', (err, address) => {
    console.log('MongoDB DNS Teszt:', address || 'HIBA: ' + err.message);
});

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Sikeres MongoDB csatlakozás');
        // Csak a sikeres csatlakozás UTÁN indítjuk a szervert

        // --- TESZT ADATOK BETÉTELE ---
        const count = await Team.countDocuments();
        if (count === 0) {
            console.log('Üres az adatbázis, teszt csapatok létrehozása...');
            await Team.insertMany([
                { name: 'Piros Csapat', totalScore: 10 },
                { name: 'Kék Csapat', totalScore: 25 },
                { name: 'Zöld Csapat', totalScore: 0 }
            ]);
            console.log('3 teszt csapat bekerült!');
        } else {
            console.log(`Már van ${count} csapat az adatbázisban.`);
        }
        // ----------------------------

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`A szerver ÉL és fut a ${PORT} porton`);
        });
    })
    .catch(err => {
        console.error('KRITIKUS HIBA az Atlas csatlakozáskor:', err.message);
        process.exit(1); // Itt szándékosan hibával lépünk ki, hogy lásd a piros üzenetet
    });