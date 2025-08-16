const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    thumbnailUrl: { type: String }, // Videolar için
}, { _id: false });

const pollOptionSchema = new mongoose.Schema({
    _id: { // <-- ANKET GÜNCELLEMESİ İÇİN EKLENDİ
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
    },
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['post', 'reply', 'quote', 'repost'],
        required: true,
        default: 'post',
    },
    // Eğer bir reply, quote veya repost ise orijinal posta referans
    originalPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    content: {
        text: { type: String, trim: true, maxlength: 500 },
        media: {
            type: [mediaSchema],
            validate: [val => val.length <= 5, '{PATH} exceeds the limit of 5']
        },
        poll: {
            question: { type: String },
            options: {
                type: [pollOptionSchema],
                validate: [val => val.length <= 5, '{PATH} exceeds the limit of 5']
            },
            expiresAt: { type: Date },
        },
        audio: {
            url: { type: String },
            durationSeconds: { type: Number },
        },
    },
    // Sistem tarafından eklenecek meta veriler
    metadata: {
        deviceInfo: { type: String },
        ipAddress: { type: String, private: true },
        isSensitive: { type: Boolean, default: false },
        hasCopyright: { type: Boolean, default: false },
    },
    // Etkileşim istatistikleri (denormalize edilmiş)
    statistics: {
        bookmarkCount: { type: Number, default: 0 },
        dislikeCount: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        replyCount: { type: Number, default: 0 },
        reportCount: { type: Number, default: 0 },
        repostCount: { type: Number, default: 0 },
        quoteCount: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
    },
}, {
    timestamps: true,
});

// Ana akış (feed) sorgularının performansı için
postSchema.index({ author: 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;