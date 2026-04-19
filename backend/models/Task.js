const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        maxPoints: { type: Number, default: 100 },
        assignedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        note: { type: String },

        // Day grouping
        day: {
            type: String,
            enum: ['Day 1', 'Day 2', 'Day 3'],
            required: true
        },

        // Time handling
        isAllDay: { type: Boolean, default: false },
        startTime: {
            type: String, // HH:mm format or ISO 8601 timestamp
            required: function () {
                return !this.isAllDay;
            }
        },
        endTime: {
            type: String, // HH:mm format or ISO 8601 timestamp
            required: function () {
                return !this.isAllDay;
            }
        },

        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Middleware to validate time intervals
taskSchema.pre('save', function (next) {
    if (!this.isAllDay) {
        if (!this.startTime || !this.endTime) {
            return next(new Error('startTime and endTime are required for non-all-day tasks'));
        }
        if (this.startTime >= this.endTime) {
            return next(new Error('startTime must be before endTime'));
        }
    }
    next();
});

module.exports = mongoose.model('Task', taskSchema);