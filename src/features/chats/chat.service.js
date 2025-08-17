const httpStatus = require('http-status');
const Chat = require('./chat.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');

/**
 * Yeni bir birebir veya grup sohbeti oluşturur.
 * @param {string} creatorId - Sohbeti oluşturan kullanıcının ID'si
 * @param {string[]} memberIds - Sohbete eklenecek diğer kullanıcıların ID'leri
 * @param {string} [chatName] - Eğer bir grup sohbetiyse, grubun adı
 * @returns {Promise<Chat>}
 */
const createChat = async (creatorId, memberIds, chatName) => {
  const allMembers = [creatorId, ...memberIds];

  // Eğer grup sohbeti değilse (sadece 2 kişi varsa) ve bu iki kişi arasında zaten bir sohbet varsa, onu döndür.
  if (!chatName && allMembers.length === 2) {
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      members: { $all: allMembers, $size: 2 },
    });
    if (existingChat) {
      return existingChat;
    }
  }

  const isGroupChat = allMembers.length > 2 || !!chatName;

  const chat = await Chat.create({
    chatName: isGroupChat ? chatName : undefined,
    isGroupChat,
    members: allMembers,
    groupAdmin: isGroupChat ? creatorId : undefined,
  });

  logger.info('New chat created', { chatId: chat.id, creatorId, members: memberIds });
  return chat;
};

/**
 * Belirli bir kullanıcının dahil olduğu tüm sohbetleri listeler.
 * @param {string} userId - Kullanıcının ID'si
 * @returns {Promise<Chat[]>}
 */
const getUserChats = async (userId) => {
  const chats = await Chat.find({ members: userId })
    .populate('members', 'username displayName profileImageUrl')
    .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName' }
    })
    .sort({ updatedAt: -1 });
  return chats;
};


module.exports = {
  createChat,
  getUserChats,
};