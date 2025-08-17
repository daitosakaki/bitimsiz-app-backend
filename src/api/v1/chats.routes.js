const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const chatController = require('../../features/chats/chat.controller');
const { chatValidation } = require('../../features/chats/chat.validation');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(chatValidation.createChatSchema), chatController.createChat)
  .get(auth(), chatController.getUserChats);

// Gelecekteki rotalar için örnekler:
// router.get('/:chatId', auth(), validate(chatValidation.getChatSchema), chatController.getChat);
// router.put('/:chatId/members', auth(), chatController.addMembers);

module.exports = router;