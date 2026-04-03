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

module.exports = mongoose.model('Score', scoreSchema);