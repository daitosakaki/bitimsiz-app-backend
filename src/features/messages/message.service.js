const MessageReport = require('../reports/messageReport.model');
const Message = require('../chats/message.model');
const { logger } = require('../../config/logger');

const reportMessage = async (messageId, reporterId, reason) => {
    const message = await Message.findById(messageId);
    if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Message not found.');
    }

    const report = await MessageReport.create({
        reporter: reporterId,
        message: messageId,
        chat: message.chat,
        reason,
    });

    // --- LOGLAMA ---
    logger.info('Message reported', { messageId, reporterId, reason });
    return report;
};

module.exports = { reportMessage };