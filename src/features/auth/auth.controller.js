const httpStatus = require('http-status');
const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');
const { logger } = require('../../config/logger'); // Logger'ı import ediyoruz

const verifyPhone = catchAsync(async (req, res) => {
    const result = await authService.verifyPhoneAndGetRegToken(req.body.idToken);
    logger.info(`Phone verification successful, registration token issued for phone number ending with ...${req.body.phoneNumber?.slice(-4)}`, { ip: req.ip });
    res.status(httpStatus.OK).send(result);
});

const register = catchAsync(async (req, res) => {
    const registrationToken = req.headers.authorization?.split(' ')[1];
    if (!registrationToken) {
          logger.warn('Registration token is required.', { ip: req.ip });
  throw new ApiError(httpStatus.BAD_REQUEST, 'Registration token is required.');
    }
    const result = await authService.registerUser(registrationToken, req.body);
    // Güvenlik: Başarılı bir kayıt log kaydı.
    logger.info('New user registered successfully', { userId: result.user.id, ip: req.ip });
    res.status(httpStatus.CREATED).send(result);
});

const login = catchAsync(async (req, res) => {
    const { phoneNumber, password } = req.body;
    try {
        const result = await authService.loginWithPhoneAndPassword(phoneNumber, password);
        // Güvenlik: Başarılı bir giriş loglanır.
        logger.info('User logged in successfully', { userId: result.user.id, ip: req.ip });
        res.status(httpStatus.OK).send(result);
    } catch (error) {
        // Güvenlik: BAŞARISIZ giriş denemeleri KESİNLİKLE loglanmalıdır.
        logger.warn('Failed login attempt', { phoneNumber, ip: req.ip, reason: error.message });
        throw error; // Hatanın genel error handler'a gitmesine izin ver
    }
});

const forgotPassword = catchAsync(async (req, res) => {
    const { phoneNumber } = req.body;
    await authService.requestPasswordReset(phoneNumber);
    // Güvenlik: Şifre sıfırlama talepleri loglanmalıdır.
    logger.info('Password reset requested', { phoneNumber, ip: req.ip });
    res.send({ message: 'If a user with this phone number exists, an OTP will be sent.' });
});

const resetPassword = catchAsync(async (req, res) => {
    const { idToken, newPassword } = req.body;
    await authService.resetPasswordWithFirebase(idToken, newPassword);
    // Güvenlik: Başarılı bir şifre sıfırlama işlemi çok önemli bir olaydır.
    logger.info('Password has been reset successfully via Firebase token', { ip: req.ip });
    res.status(httpStatus.OK).send({ message: 'Password has been reset successfully.' });
});

const changePassword = catchAsync(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        await authService.changePassword(req.user.id, oldPassword, newPassword);
        // Güvenlik: Giriş yapmış bir kullanıcının şifresini değiştirmesi loglanmalıdır.
        logger.info('Password changed successfully by authenticated user', { userId: req.user.id, ip: req.ip });
        res.status(httpStatus.OK).send({ message: 'Password changed successfully.' });
    } catch (error) {
        // Güvenlik: Başarısız şifre değiştirme denemesi (örn: eski şifre yanlış) loglanmalıdır.
        logger.warn('Failed password change attempt', { userId: req.user.id, ip: req.ip, reason: error.message });
        throw error;
    }
});

module.exports = {
    verifyPhone,
    register,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
};