const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ['CREATE', 'UPDATE', 'DELETE', 'OVERRIDE'],
            required: true
        },
        entityType: {
            type: String,
            enum: ['USER', 'TASK', 'SCORE', 'TEAM'],
            required: true
        },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
        entityName: { type: String }, // For easier UI display
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        adminUsername: { type: String }, // Cache admin username for display
        previousValues: { type: mongoose.Schema.Types.Mixed }, // Original data before change
        newValues: { type: mongoose.Schema.Types.Mixed }, // New data after change
        description: { type: String }, // Human-readable description
        ipAddress: { type: String },
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
