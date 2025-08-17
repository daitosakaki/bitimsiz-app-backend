const Joi = require('joi');
const { objectId } = require('../../middlewares/validate.middleware');

const createChatSchema = {
  body: Joi.object().keys({
    // Yeni bir sohbet oluşturmak için en az bir kullanıcı ID'si gereklidir.
    userIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
    chatName: Joi.string().optional(), // Grup sohbetleri için
  }),
};

const getChatSchema = {
  params: Joi.object().keys({
    chatId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  chatValidation: {
    createChatSchema,
    getChatSchema,
  },
};