const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    // Grup sohbetleri için admin bilgisi
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

messageSchema.index({ members: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;