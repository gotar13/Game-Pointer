const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
    {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
        teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
        organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        points: { type: Number, required: true },
        comment: { type: String },
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Helper function to recalculate team total score
const recalculateTeamScore = async (teamId) => {
    if (!teamId) return;

    try {
        const Team = mongoose.model('Team');
        const Score = mongoose.model('Score');

        // Calculate total from non-deleted scores
        const result = await Score.aggregate([
            { $match: { teamId: new mongoose.Types.ObjectId(teamId), deleted: false } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);

        const totalScore = result.length > 0 ? result[0].total : 0;
        await Team.findByIdAndUpdate(teamId, { totalScore }, { new: true });
    } catch (err) {
        console.error('Error recalculating team score:', err.message);
    }
};

// Auto-recalculate team total when score is saved
scoreSchema.post('save', async function () {
    await recalculateTeamScore(this.teamId);
});

// Auto-recalculate team total when score is updated
scoreSchema.post('findByIdAndUpdate', async function () {
    // Get the document that was updated
    const doc = await this.model.findById(this.getQuery()._id);
    if (doc) {
        await recalculateTeamScore(doc.teamId);
    }
});

// Auto-recalculate team total when score is deleted/soft-deleted
scoreSchema.post('findByIdAndUpdate', async function () {
    const doc = await this.model.findById(this.getQuery()._id);
    if (doc) {
        await recalculateTeamScore(doc.teamId);
    }
});

// Export with recalculate helper
const Score = mongoose.model('Score', scoreSchema);
Score.recalculateTeamScore = recalculateTeamScore;

module.exports = Score;