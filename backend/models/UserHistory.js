const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String }, // Cache for display
        role: { type: String, enum: ['ADMIN', 'ORGANIZER'], default: 'ORGANIZER' }, // Track user role
        action: {
            type: String,
            enum: ['CREATE_TASK', 'SUBMIT_SCORE', 'UPDATE_SCORE', 'UPDATE_TASK', 'DELETE_SCORE'],
            required: true
        },
        entityType: {
            type: String,
            enum: ['TASK', 'SCORE'],
            required: true
        },
        details: {
            taskName: String,
            teamName: String,
            points: Number,
            maxPoints: Number,
            comment: String,
            previousPoints: Number
        },
        description: { type: String }, // Human-readable description
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Index for fast queries
userHistorySchema.index({ userId: 1, createdAt: -1 });
userHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('UserHistory', userHistorySchema);
