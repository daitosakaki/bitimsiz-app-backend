const Joi = require('joi');
const { objectId } = require('../../middlewares/validate.middleware'); // ID formatı için özel bir validator

const updateUserSchema = {
    body: Joi.object().keys({
        firstName: Joi.string().trim().max(50),
        lastName: Joi.string().trim().max(50),
        displayName: Joi.string().trim().min(2).max(50),
        bio: Joi.string().trim().max(160).allow(''),
        isPrivate: Joi.boolean(),
    }).min(1),
};

const addressSchema = {
    body: Joi.object().keys({
        addressTitle: Joi.string().required(),
        fullName: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        country: Joi.string().required(),
        province: Joi.string().required(),
        district: Joi.string().required(),
        fullAddress: Joi.string().required(),
        postalCode: Joi.string().allow(''),
        isDefaultShipping: Joi.boolean(),
        isDefaultBilling: Joi.boolean(),
    }),
};

const addressIdSchema = {
    params: Joi.object().keys({
        addressId: Joi.string().custom(objectId).required(),
    }),
};


module.exports = {
    userValidation: {
        updateUserSchema,
    },
    addressValidation: {
        addressSchema,
        addressIdSchema,
    }
};