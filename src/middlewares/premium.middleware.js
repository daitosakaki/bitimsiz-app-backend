// src/middlewares/premium.middleware.js
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const premium = () => async (req, res, next) => {
    const user = req.user;

    if (user.subscription && user.subscription.status === 'premium') {
        // Abonelik süresinin dolup dolmadığını kontrol et
        if (user.subscription.expiresAt && user.subscription.expiresAt < new Date()) {
            // Süre dolduysa kullanıcıyı 'free' olarak güncelle (opsiyonel)
            user.subscription.status = 'free';
            await user.save();
            return next(new ApiError(httpStatus.FORBIDDEN, 'Your premium subscription has expired.'));
        }
        return next();
    }
    
    return next(new ApiError(httpStatus.FORBIDDEN, 'This feature requires a premium subscription.'));
};

module.exports = premium;