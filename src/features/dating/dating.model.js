// src/features/dating/dating.model.js
const mongoose = require('mongoose');

// Flört Profili Şeması
const datingProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    datingBio: { type: String, trim: true, maxlength: 500 },
    photos: [{ type: String }], // Fotoğraf URL'lerinin listesi
    interests: [{ type: String }],
    gender: { type: String, enum: ['male', 'female', 'other'] },
    lookingFor: { type: String, enum: ['male', 'female', 'everyone'] },
    agePreference: {
        min: { type: Number, default: 18 },
        max: { type: Number, default: 55 },
    },
    // Konum bilgisi, Happn gibi özellikler için önemli
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            index: '2dsphere' // Coğrafi sorgular için
        }
    },
    // Kullanıcının flört özelliğini aktif edip etmediği
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Kaydırma (Swipe) Şeması
const swipeSchema = new mongoose.Schema({
    swiper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    swiped: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['like', 'dislike', 'super_like'], required: true },
}, { timestamps: true });
swipeSchema.index({ swiper: 1, swiped: 1 }, { unique: true });

// Eşleşme (Match) Şeması
const matchSchema = new mongoose.Schema({
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Eşleşme sonrası bir sohbet odası oluşturulabilir
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
}, { timestamps: true });

const DatingProfile = mongoose.model('DatingProfile', datingProfileSchema);
const Swipe = mongoose.model('Swipe', swipeSchema);
const Match = mongoose.model('Match', matchSchema);

module.exports = {
    DatingProfile,
    Swipe,
    Match,
};