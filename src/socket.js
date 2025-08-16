const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { logger } = require('./config/logger');
const config = require('./config');
const Message = require('./features/chats/message.model');
const Chat = require('./features/chats/chat.model');
const User = require('./features/users/user.model');

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
            } catch (error) {
                logger.error('Error sending message', { userId: socket.userId, error: error.message });
                socket.emit('sendMessageError', { message: 'Could not send message.' });
            }
        });

        socket.on('editMessage', async (data) => {
          const { messageId, chatId, newContent } = data;
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
          // ... (Daha önceki cevaptaki soft delete mantığı)
        });

        socket.on('reactToMessage', async (data) => {
          // ... (Daha önceki cevaptaki emoji tepki mantığı)
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

module.exports = initializeSocket;