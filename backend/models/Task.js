const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: { type: String, required: false }, // Task category for organization
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
            required: false
        },
        endTime: {
            type: String, // HH:mm format or ISO 8601 timestamp
            required: false
        },

        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Middleware to validate time intervals (only if times are provided)
taskSchema.pre('save', function (next) {
    if (this.startTime && this.endTime) {
        // Convert HH:mm to minutes for proper comparison
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const startMinutes = timeToMinutes(this.startTime);
        const endMinutes = timeToMinutes(this.endTime);

        if (startMinutes >= endMinutes) {
            return next(new Error('startTime must be before endTime'));
        }
    }
    next();
});

module.exports = mongoose.model('Task', taskSchema);