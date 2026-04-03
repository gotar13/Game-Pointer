const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true }, // Hashed with bcrypt
        role: {
            type: String,
            enum: ['ADMIN', 'ORGANIZER', 'VOLUNTEER'],
            default: 'ORGANIZER'
        },
        deleted: { type: Boolean, default: false }
    },
    { timestamps: true } // Adds createdAt and updatedAt
);

module.exports = mongoose.model('User', userSchema);