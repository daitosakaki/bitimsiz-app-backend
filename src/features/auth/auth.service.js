const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const config = require('../../config');

/**
 * Verilen bir payload için JWT oluşturur.
 * @param {object} payload - Token'ın içine gömülecek veri
 * @param {string} secret - Token'ı imzalamak için kullanılacak gizli anahtar
 * @param {string} expiresIn - Token'ın geçerlilik süresi
 * @returns {string}
 */
const generateToken = (payload, secret, expiresIn) => {
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Telefon numarasını doğrulamak ve kayıt için geçici bir token almak üzere Firebase idToken'ını kullanır.
 * @param {string} idToken - Firebase Client SDK'sından gelen idToken.
 * @returns {Promise<{registrationToken: string}>}
 */
const verifyPhoneAndGetRegToken = async (idToken) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { phone_number, uid } = decodedToken;

    const userExists = await User.findOne({ phoneNumber: phone_number });
    if (userExists) {
        throw new ApiError(httpStatus.CONFLICT, 'This phone number is already registered.');
    }

    // Sadece bu amaç için kullanılacak 10 dakikalık geçici bir token oluştur
    const registrationToken = generateToken(
        { phoneNumber: phone_number, firebaseUid: uid, purpose: 'registration' },
        config.jwt.secret,
        '10m'
    );
    return { registrationToken };
};

/**
 * Geçici kayıt token'ı ve kullanıcı bilgileriyle yeni bir kullanıcı oluşturur.
 * @param {string} registrationToken - Önceki adımdan gelen geçici token.
 * @param {object} userData - Kullanıcının şifre, kullanıcı adı gibi bilgileri.
 * @returns {Promise<{user: object, tokens: object}>}
 */
const registerUser = async (registrationToken, userData) => {
    let payload;
    try {
        payload = jwt.verify(registrationToken, config.jwt.secret);
        if (payload.purpose !== 'registration') throw new Error('Invalid token purpose');
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired registration token.');
    }

    const { phoneNumber, firebaseUid } = payload;
    const { username, password, firstName, lastName } = userData;

    // Modeldeki pre-save hook, şifreyi otomatik olarak hash'leyecektir.
    const user = await User.create({
        firebaseUid,
        phoneNumber,
        username,
        password,
        firstName,
        lastName,
    });

    const accessToken = generateToken({ sub: user.id }, config.jwt.secret, config.jwt.expiresIn);
    const refreshToken = generateToken({ sub: user.id }, config.jwt.refreshSecret, config.jwt.refreshExpiresIn);

    return { user, tokens: { accessToken, refreshToken } };
};

/**
 * Telefon numarası ve şifre ile kullanıcı girişi yapar.
 * @param {string} phoneNumber
 * @param {string} password
 * @returns {Promise<{user: object, tokens: object}>}
 */
const loginWithPhoneAndPassword = async (phoneNumber, password) => {
    const user = await User.findOne({ phoneNumber });
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect phone number or password.');
    }

    const accessToken = generateToken({ sub: user.id }, config.jwt.secret, config.jwt.expiresIn);
    const refreshToken = generateToken({ sub: user.id }, config.jwt.refreshSecret, config.jwt.refreshExpiresIn);

    return { user, tokens: { accessToken, refreshToken } };
};

/**
 * Şifre sıfırlama talebini doğrular.
 * @param {string} phoneNumber
 * @returns {Promise<{message: string}>}
 */
const requestPasswordReset = async (phoneNumber) => {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User with this phone number not found.');
    }
    return { message: 'User found. You can proceed to request an OTP.' };
};

/**
 * Firebase idToken'ı ile kullanıcının şifresini sıfırlar.
 * @param {string} idToken
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const resetPasswordWithFirebase = async (idToken, newPassword) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { phone_number } = decodedToken;

    const user = await User.findOne({ phoneNumber: phone_number });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
    }

    user.password = newPassword;
    await user.save();
    logger.info(`Password reset successfully for user ${user.id}`);
};

/**
 * Giriş yapmış bir kullanıcının şifresini değiştirir.
 * @param {string} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
const changePassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId).select('+password');
    if (!user) {
        logger.warn(`User not found for password change attempt.`, { userId, ip: req.ip }); 
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
    }

    if (!(await user.isPasswordMatch(oldPassword))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect old password.');
    }

    user.password = newPassword;
    await user.save();
    logger.info(`Password changed successfully for user ${user.id}`);
};

module.exports = {
    registerUser,
    loginWithPhoneAndPassword,
    verifyPhoneAndGetRegToken,
    requestPasswordReset,
    resetPasswordWithFirebase,
    changePassword,
};