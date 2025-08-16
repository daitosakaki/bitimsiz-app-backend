const mongoose = require('mongoose');

const messageReportSchema = new mongoose.Schema({
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    reason: {
        type: String,
        enum: ['spam', 'harassment', 'inappropriate_content', 'other'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending',
    }
}, { timestamps: true });

messageReportSchema.index({ reporter: 1, message: 1 }, { unique: true });

const MessageReport = mongoose.model('MessageReport', messageReportSchema);
module.exports = MessageReport;