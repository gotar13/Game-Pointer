const mongoose = require('mongoose');
const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    maxPoints: { type: Number, default: 100 },
    assignedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comment: { type: String }
});
module.exports = mongoose.model('Task', taskSchema);