const Joi = require('joi');
const { objectId } = require('../../middlewares/validate.middleware');

// Sadece URL'deki :postId parametresini doğrulamak için
const postIdSchema = {
  params: Joi.object().keys({
    postId: Joi.string().custom(objectId).required(),
  }),
};

// Gönderiyi şikayet etme isteğini doğrulamak için
const reportPostSchema = {
  params: Joi.object().keys({
    postId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().required().valid('spam', 'nudity', 'hate_speech', 'violence', 'copyright', 'other'),
    details: Joi.string().max(500).allow(''),
  }),
};

// Anketi yanıtlama isteğini doğrulamak için
const pollVoteSchema = {
  params: Joi.object().keys({
    postId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    optionId: Joi.string().custom(objectId).required(),
  }),
};

// Yeni post oluşturma (bu şema projenizin ihtiyacına göre daha da detaylandırılabilir)
const createPostSchema = {
  body: Joi.object().keys({
    type: Joi.string().valid('post', 'reply', 'quote', 'repost').required(),
    originalPost: Joi.string().custom(objectId).when('type', { is: Joi.valid('reply', 'quote', 'repost'), then: Joi.required(), otherwise: Joi.forbidden() }),
    content: Joi.object().keys({
        text: Joi.string().max(500).allow(''),
        // media, poll, audio için daha detaylı doğrulamalar eklenebilir
    }).required(),
    metadata: Joi.object().keys({
        isSensitive: Joi.boolean(),
        hasCopyright: Joi.boolean(),
    }),
  }),
};


module.exports = {
    postValidation: {
        postIdSchema,
        reportPostSchema,
        pollVoteSchema,
        createPostSchema,
    }
};