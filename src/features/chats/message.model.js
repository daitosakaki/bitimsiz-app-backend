const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Mesaj özellikleri
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isForwarded: { type: Boolean, default: false },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Zengin içerik
    mediaUrl: { type: String }, // Resim, video, ses dosyası
    mediaType: { type: String, enum: ['image', 'video', 'audio'] },
    linkPreview: {
        url: String,
        title: String,
        description: String,
        image: String,
    },
    
    // Tepkiler
    reactions: [reactionSchema],

    // Otomatik silme için (kaybolan mesajlar)
    expireAt: { type: Date, index: { expires: '1s' } },

}, { timestamps: true });
messageSchema.index({ chat: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;