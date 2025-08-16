const express = require('express');
const authController = require('../../features/auth/auth.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { authValidation } = require('../../features/auth/auth.validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Güvenlik: Giriş ve şifre sıfırlama gibi hassas endpoint'ler için istek limiti
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // Her IP'den 15 dakikada en fazla 10 istek
    standardHeaders: true,
    legacyHeaders: false,
});

// Kayıt Akışı
router.post(
    '/verify-phone',
    authLimiter,
    validate(authValidation.verifyPhoneSchema),
    authController.verifyPhone
);

router.post(
    '/register',
    validate(authValidation.registerSchema),
    authController.register
);

// Giriş Akışı
router.post(
    '/login',
    authLimiter,
    validate(authValidation.loginSchema),
    authController.login
);

// Şifremi Unuttum Akışı
router.post(
    '/forgot-password',
    authLimiter,
    validate(authValidation.forgotPasswordSchema),
    authController.forgotPassword
);

router.post(
    '/reset-password', // Rota adını basitleştirebiliriz
    authLimiter,
    validate(authValidation.resetPasswordSchema),
    authController.resetPassword
);

// Şifre Değiştirme (Giriş Yapmış Kullanıcı)
router.put(
    '/change-password',
    authMiddleware, // Bu rota KORUMALI!
    validate(authValidation.changePasswordSchema),
    authController.changePassword
);

module.exports = router;