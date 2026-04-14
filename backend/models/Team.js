const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        members: [
            {
                name: { type: String, required: true },
                type: { type: String, enum: ['CSK', 'CSKH', 'MEMBER'], default: 'MEMBER' } // CSK/CSKH = leaders (max 1 each), MEMBER = regular players
            }
        ],
        totalScore: { type: Number, default: 0 },
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Index for fast leaderboard queries
teamSchema.index({ totalScore: -1, deleted: -1 });

module.exports = mongoose.model('Team', teamSchema);