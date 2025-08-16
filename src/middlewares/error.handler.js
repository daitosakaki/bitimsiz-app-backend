const mongoose = require('mongoose');
const httpStatus = require('http-status');
const config = require('../config');
const { logger } = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Gelen hatayı, eğer bizim özel ApiError sınıfımızdan değilse, ona çevirir.
 * Bu, Joi, Mongoose gibi kütüphanelerden gelen hataları standartlaştırmamızı sağlar.
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Yakalanan tüm hataları istemciye (client) JSON formatında gönderen son katman.
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    // Sadece development ortamında hata detaylarını (stack trace) yanıta ekle
    ...(config.env === 'development' && { stack: err.stack }),
  };

  // Hatanın detaylarını logla
  logger.error(err);

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};