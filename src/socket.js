const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { logger } = require('./config/logger');
const config = require('./config');
const Message = require('./features/chats/message.model');
const Chat = require('./features/chats/chat.model');
const User = require('./features/users/user.model');
const { sendNotificationToUser } = require('./features/notifications/notification.service');

// Redis'te online kullanıcıları takip etmek için
const redisClient = createClient({ url: config.redis.url });
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

async function setUserOnline(userId) {
    await redisClient.sAdd('online_users', userId);
}

async function setUserOffline(userId) {
    await redisClient.sRem('online_users', userId);
    // Kullanıcının "son görülme" zamanını güncelle
    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
}

function initializeSocket(httpServer) {
    const io = new Server(httpServer, { cors: { origin: config.cors.origin } });

    redisClient.connect().then(() => {
        const subClient = redisClient.duplicate();
        io.adapter(createAdapter(redisClient, subClient));
        logger.info('Socket.IO Redis adapter connected.');
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: Token not provided.'));
        try {
            const payload = jwt.verify(token, config.jwt.secret);
            socket.userId = payload.sub;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token.'));
        }
    });

    io.on('connection', async (socket) => {
        logger.info('User connected via socket', { userId: socket.userId, socketId: socket.id });
        await setUserOnline(socket.userId);
        socket.join(socket.userId);

        // Olay Yöneticileri
        socket.on('joinRoom', (chatId) => {
            socket.join(chatId);
            logger.info('User joined chat room', { userId: socket.userId, chatId });
        });

        socket.on('leaveRoom', (chatId) => {
            socket.leave(chatId);
            logger.info('User left chat room', { userId: socket.userId, chatId });
        });

        socket.on('sendMessage', async (data) => {
            try {
                const { chatId, content, replyTo } = data;

                // --- YETKİLENDİRME KONTROLÜ ---
                const chat = await Chat.findOne({ _id: chatId, members: socket.userId });
                if (!chat) {
                    logger.warn('Unauthorized attempt to send message to chat', { userId: socket.userId, chatId });
                    return socket.emit('sendMessageError', { message: 'You are not a member of this chat.' });
                }
                // --- KONTROL SONU ---

                // TODO: Kullanıcının bu chat'e üye olup olmadığını kontrol et
                const message = await Message.create({
                    chat: chatId,
                    sender: socket.userId,
                    content,
                    replyTo: replyTo || null,
                    readBy: [socket.userId]
                });
                const populatedMessage = await message.populate('sender', 'username displayName profileImageUrl');

                await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });
                io.to(chatId).emit('newMessage', populatedMessage);
                logger.info('New message sent', { senderId: socket.userId, chatId });
                // --- BİLDİRİM GÖNDERME ---
                const recipientMembers = chat.members.filter(memberId => memberId.toString() !== socket.userId);
                recipientMembers.forEach(recipientId => {
                    sendNotificationToUser(recipientId.toString(), {
                        title: `Yeni Mesaj: ${populatedMessage.sender.displayName}`,
                        body: populatedMessage.content,
                        data: { type: 'new_message', chatId: chatId.toString() }
                    });
                });
                // --- BİTTİ ---
            } catch (error) {
                logger.error('Error sending message', { userId: socket.userId, error: error.message });
                socket.emit('sendMessageError', { message: 'Could not send message.' });
            }
        });

        socket.on('editMessage', async (data) => {
            const { messageId, chatId, newContent } = data;

            // --- IYILESTIRME: Yetkilendirme Kontrolü ---
            const chat = await Chat.findOne({ _id: chatId, members: socket.userId });
            if (!chat) {
                logger.warn('Unauthorized attempt to edit message in a chat they are not part of', { userId: socket.userId, chatId });
                return socket.emit('editMessageError', { message: 'Authorization failed.' });
            }

            const message = await Message.findById(messageId);
            if (message && message.sender.toString() === socket.userId) {
                message.content = newContent;
                message.isEdited = true;
                message.editedAt = new Date();
                await message.save();
                io.to(chatId).emit('messageEdited', { messageId, newContent });
                logger.info('Message edited', { userId: socket.userId, messageId });
            }
        });

        socket.on('deleteMessage', async (data) => {
            try {
                const { messageId, chatId } = data;

                // --- IYILESTIRME: Yetkilendirme Kontrolü ---
                const chat = await Chat.findOne({ _id: chatId, members: socket.userId });
                if (!chat) {
                    logger.warn('Unauthorized attempt to delete message in a chat they are not part of', { userId: socket.userId, chatId });
                    return socket.emit('deleteMessageError', { message: 'Authorization failed.' });
                }

                const message = await Message.findById(messageId);

                if (!message || message.sender.toString() !== socket.userId) {
                    logger.warn('Unauthorized attempt to delete message', { messageId, attempterId: socket.userId });
                    return socket.emit('deleteMessageError', { message: 'You are not authorized to delete this message.' });
                }

                message.isDeleted = true;
                message.deletedAt = new Date();
                message.content = 'Bu mesaj silindi';
                await message.save();

                io.to(chatId).emit('messageDeleted', { messageId: message._id, chatId: message.chat });
                logger.info('Message soft-deleted by owner', { messageId, userId: socket.userId, chatId });
            } catch (error) {
                logger.error('Error deleting message', { userId: socket.userId, error: error.message });
                socket.emit('deleteMessageError', { message: 'Could not delete the message.' });
            }
        });

        // --- DOLDURULMUŞ KISIM: EMOJİ İLE TEPKİ VERME ---
        socket.on('reactToMessage', async (data) => {
            try {
                const { messageId, chatId, emoji } = data;
                const userId = socket.userId;
                const message = await Message.findById(messageId);

                if (!message || message.isDeleted) {
                    socket.emit('reactToMessageError', { message: 'Message not found.' });
                    return;
                }

                const existingReactionIndex = message.reactions.findIndex(
                    (reaction) => reaction.user.toString() === userId
                );

                if (existingReactionIndex > -1) {
                    if (message.reactions[existingReactionIndex].emoji === emoji) {
                        message.reactions.splice(existingReactionIndex, 1); // Tepkiyi kaldır
                    } else {
                        message.reactions[existingReactionIndex].emoji = emoji; // Tepkiyi değiştir
                    }
                } else {
                    message.reactions.push({ user: userId, emoji: emoji }); // Yeni tepki ekle
                }

                await message.save();

                io.to(chatId).emit('messageReactionUpdated', {
                    messageId: message._id,
                    reactions: message.reactions,
                });
                logger.info('User reacted to message', { userId, messageId, emoji });
            } catch (error) {
                logger.error('Error reacting to message', { userId: socket.userId, error: error.message });
                socket.emit('reactToMessageError', { message: 'Could not react to the message.' });
            }
        });

        socket.on('startTyping', (data) => {
            socket.to(data.chatId).emit('typing', { userId: socket.userId });
        });

        socket.on('stopTyping', (data) => {
            socket.to(data.chatId).emit('stopTyping', { userId: socket.userId });
        });

        socket.on('disconnect', async () => {
            logger.info('User disconnected from socket', { userId: socket.userId, socketId: socket.id });
            await setUserOffline(socket.userId);
        });
    });
}

module.exports = {
    initializeSocket,
    redisClient
};