const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    type: { type: String, enum: ['like', 'dislike', 'bookmark'], required: true },
}, {
    timestamps: true,
});

interactionSchema.index({ user: 1, post: 1, type: 1 }, { unique: true });
const Interaction = mongoose.model('Interaction', interactionSchema);
module.exports = Interaction;