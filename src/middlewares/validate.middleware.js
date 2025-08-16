const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

// Gelen isteği (body, params, query) verilen şemaya göre doğrulayan middleware
const validate = (schema) => (req, res, next) => {
  const validSchema = Joi.compile(schema);
  const object = {
    params: req.params,
    query: req.query,
    body: req.body,
  };
  const { value, error } = validSchema.validate(object, {
    abortEarly: false, // Tüm hataları aynı anda göster
    allowUnknown: true, // Bilinmeyen alanlara izin ver (örn: headers)
    stripUnknown: true, // Bilinmeyen alanları temizle
  });

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  
  // Doğrulanmış ve temizlenmiş veriyi req nesnesine ata
  Object.assign(req, value);
  return next();
};

// MongoDB ObjectId formatını doğrulayan özel bir Joi kuralı
const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};


module.exports = {
  validate,
  objectId,
};