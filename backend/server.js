require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoUri = process.env.MONGO_URI;
const gptKey = process.env.OPENAI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());

console.log(`A szerver a ${process.env.PORT} porton indul...`);