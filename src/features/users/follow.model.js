const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // YENİ ALAN: Takip ilişkisinin durumunu tutar
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'approved', // Varsayılan değer, herkese açık profillerin anında takibi için
        index: true,
    },
}, {
    timestamps: true,
});

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, status: 1 });

const Follow = mongoose.model('Follow', followSchema);

module.exports = Follow;