const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const chatService = require('./chat.service');

const createChat = catchAsync(async (req, res) => {
  const { userIds, chatName } = req.body;
  const chat = await chatService.createChat(req.user.id, userIds, chatName);
  res.status(httpStatus.CREATED).send(chat);
});

const getUserChats = catchAsync(async (req, res) => {
  const chats = await chatService.getUserChats(req.user.id);
  res.send(chats);
});

module.exports = {
  createChat,
  getUserChats,
};