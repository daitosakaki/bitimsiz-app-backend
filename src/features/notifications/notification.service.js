// src/features/notifications/notification.service.js
const admin = require('firebase-admin');
const User = require('../users/user.model');
const { logger } = require('../../config/logger');

/**
 * Belirli bir kullanıcıya anlık bildirim gönderir.
 * @param {string} userId - Bildirim gönderilecek kullanıcının ID'si
 * @param {object} payload - Bildirim başlığı, içeriği ve ek verileri
 * @param {string} payload.title - Bildirim başlığı
 * @param {string} payload.body - Bildirim metni
 * @param {object} [payload.data] - Bildirimle birlikte gönderilecek ek veri (örn: { chatId: '123' })
 */
const sendNotificationToUser = async (userId, payload) => {
    const user = await User.findById(userId).select('fcmTokens').lean();

    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        logger.warn('No FCM tokens found for user to send notification', { userId });
        return;
    }

    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: payload.data || {},
        tokens: user.fcmTokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        logger.info('Successfully sent FCM message', { successCount: response.successCount, failureCount: response.failureCount, userId });
        
        // TODO: Başarısız olan ve "NotRegistered" hatası dönen token'ları veritabanından temizle.
        // Bu, veritabanınızı temiz tutar ve gereksiz denemeleri önler.

    } catch (error) {
        logger.error('Error sending FCM message', { error: error.message, userId });
    }
};

module.exports = {
    sendNotificationToUser,
};