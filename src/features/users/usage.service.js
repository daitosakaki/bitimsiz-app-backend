// src/features/users/usage.service.js
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { tierLimits } = require('../../config/permissions');

/**
 * Kullanıcının belirli bir eylem için hakkı olup olmadığını kontrol eder ve hakkını düşürür.
 * @param {object} user - Mongoose User dokümanı
 * @param {string} actionType - 'swipes', 'superLikes', 'postShares' vb.
 */
const checkAndDecrementUsage = async (user, actionType) => {
    const userTier = user.subscription?.tier || 'free';
    const limit = tierLimits[userTier][`daily${actionType.charAt(0).toUpperCase() + actionType.slice(1)}s`];

    if (limit === 0) {
        throw new ApiError(httpStatus.FORBIDDEN, `You do not have permission to perform this action.`);
    }
    if (limit === Infinity) {
        return; // Sınırsız hak, kontrolü geç
    }

    let usage = user.usage[actionType];
    const now = new Date();
    const lastReset = new Date(usage.lastReset);

    // Son sıfırlamadan bu yana 24 saat geçtiyse, sayacı sıfırla
    if (now.getTime() - lastReset.getTime() >= 24 * 60 * 60 * 1000) {
        usage.count = 0;
        usage.lastReset = now;
    }

    if (usage.count >= limit) {
        throw new ApiError(httpStatus.FORBIDDEN, `You have reached your daily limit for ${actionType}. Upgrade to get more.`);
    }

    usage.count += 1;
    user.markModified(`usage.${actionType}`); // Mongoose'a bu alanı güncellemesi gerektiğini söyle
    await user.save();
};

/**
 * Kullanıcının belirli bir eylem için hakkını bir artırır (geri iade eder).
 * @param {object} user - Mongoose User dokümanı
 * @param {string} actionType - 'swipes', 'interactions' vb.
 */
const incrementUsage = async (user, actionType) => {
    let usage = user.usage[actionType];

    // Sadece sayaç 0'dan büyükse düşür, eksiye inmesini engelle
    if (usage.count > 0) {
        usage.count -= 1;
        user.markModified(`usage.${actionType}`);
        // Bu fonksiyon genellikle başka bir save() işlemiyle birlikte çağrılacağı için
        // burada ayrı bir user.save() yapmaya gerek olmayabilir,
        // ancak güvenli olması adına eklenebilir veya çağrıldığı yerde save() yapılabilir.
    }
};

module.exports = {
    checkAndDecrementUsage,
    incrementUsage, 
};