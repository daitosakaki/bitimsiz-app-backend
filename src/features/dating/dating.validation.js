// src/features/dating/dating.validation.js
const Joi = require('joi');
const { objectId } = require('../../middlewares/validate.middleware');

const updateDatingProfileSchema = {
    body: Joi.object().keys({
        datingBio: Joi.string().max(500).allow(''),
        photos: Joi.array().items(Joi.string().uri()).max(6),
        interests: Joi.array().items(Joi.string()).max(10),
        gender: Joi.string().valid('male', 'female', 'other'),
        lookingFor: Joi.string().valid('male', 'female', 'everyone'),
        agePreference: Joi.object().keys({
            min: Joi.number().min(18),
            max: Joi.number().max(100),
        }),
        location: Joi.object().keys({
            coordinates: Joi.array().items(Joi.number()).length(2).required(),
        }),
        isActive: Joi.boolean(),
    }).min(1),
};

const swipeSchema = {
    body: Joi.object().keys({
        swipedUserId: Joi.string().custom(objectId).required(),
        action: Joi.string().valid('like', 'dislike').required(),
    }),
};

module.exports = {
    datingValidation: {
        updateDatingProfileSchema,
        swipeSchema,
    }
};