const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reason: {
        type: String,
        enum: ['spam', 'nudity', 'hate_speech', 'violence', 'copyright', 'other'],
        required: true,
    },
    details: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

// Bir kullanıcının aynı postu tekrar tekrar şikayet etmesini önler
reportSchema.index({ user: 1, post: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;