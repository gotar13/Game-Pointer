const mongoose = require('mongoose');
const teamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    members: [String],
    totalScore: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false }
});
module.exports = mongoose.model('Team', teamSchema);