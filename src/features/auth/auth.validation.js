const Joi = require('joi');

const verifyPhoneSchema = {
    body: Joi.object().keys({
        idToken: Joi.string().required(),
    }),
};

const registerSchema = {
    headers: Joi.object({
        authorization: Joi.string().required().regex(/^Bearer\s/),
    }).unknown(true),
    body: Joi.object().keys({
        password: Joi.string().required().min(8),
        username: Joi.string().required().min(3).max(30),
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
    }),
};

const loginSchema = {
    body: Joi.object().keys({
        phoneNumber: Joi.string().required(),
        password: Joi.string().required(),
    }),
};

const forgotPasswordSchema = {
    body: Joi.object().keys({
        phoneNumber: Joi.string().required(),
    }),
};

const resetPasswordSchema = {
    body: Joi.object().keys({
        idToken: Joi.string().required(),
        newPassword: Joi.string().required().min(8),
    }),
};

const changePasswordSchema = {
    body: Joi.object().keys({
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().required().min(8),
    }),
};

module.exports = {
    authValidation: {
        verifyPhoneSchema,
        registerSchema,
        loginSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
        changePasswordSchema,
    }
};