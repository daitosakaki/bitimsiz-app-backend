// src/features/interactions/interaction.service.js
const httpStatus = require('http-status');
const Interaction = require('./interaction.model');
const Post = require('../posts/post.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');
const { checkAndDecrementUsage, incrementUsage } = require('../users/usage.service');

/**
 * Bir gönderi için bookmark (yer imi) işlemini yönetir. Bu işlem limitlere tabi değildir.
 */
const handleBookmark = async (postId, userId) => {
    const interactionType = 'bookmark';
    const existingBookmark = await Interaction.findOne({ post: postId, user: userId, type: interactionType });

    if (existingBookmark) {
        await existingBookmark.deleteOne();
        await Post.findByIdAndUpdate(postId, { $inc: { 'statistics.bookmarkCount': -1 } });
        return { message: 'Bookmark removed.' };
    } else {
        await Interaction.create({ post: postId, user: userId, type: interactionType });
        await Post.findByIdAndUpdate(postId, { $inc: { 'statistics.bookmarkCount': 1 } });
        return { message: 'Bookmark added.' };
    }
};

/**
 * Bir gönderi için like (beğeni) veya dislike (beğenmeme) işlemini yönetir.
 * Bu işlem, kullanıcının abonelik seviyesine göre günlük limitlere tabidir.
 */
const handleInteraction = async (postId, userId, interactionType) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const existingInteraction = await Interaction.findOne({ post: postId, user: userId });
    let message = '';

    if (existingInteraction) {
        // Kullanıcı mevcut etkileşimini geri alıyor veya değiştiriyor.
        if (existingInteraction.type === interactionType) {
            // Etkileşim geri çekildiğinde harcanan hakkı iade et
            if (interactionType === 'like' || interactionType === 'dislike') {
                await incrementUsage(user, 'interaction');
                await user.save(); // Hak iadesi sonrası kullanıcıyı kaydet
            }

            await existingInteraction.deleteOne();
            await Post.findByIdAndUpdate(postId, { $inc: { [`statistics.${interactionType}Count`]: -1 } });
            message = 'Interaction removed.';
        } else {
            // Etkileşimi 'like'tan 'dislike'a (veya tam tersi) çeviriyor.
            // Bu yeni bir etkileşim sayılmaz, sadece mevcut olanı günceller.
            const oldType = existingInteraction.type;
            existingInteraction.type = interactionType;
            await existingInteraction.save();
            await Post.findByIdAndUpdate(postId, { $inc: { [`statistics.${oldType}Count`]: -1, [`statistics.${interactionType}Count`]: 1 } });
            message = 'Interaction updated.';
        }
    } else {
        // Yeni bir etkileşim oluşturulurken limit kontrolü yapılır.
        if (interactionType === 'like' || interactionType === 'dislike') {
            await checkAndDecrementUsage(user, 'interaction'); // Bu fonksiyon zaten user.save() yapıyor.
        }

        await Interaction.create({ post: postId, user: userId, type: interactionType });
        await Post.findByIdAndUpdate(postId, { $inc: { [`statistics.${interactionType}Count`]: 1 } });
        message = 'Interaction created.';
    }

    logger.info(`Post interaction handled: ${message}`, { postId, userId, type: interactionType });
    return { message };
};

module.exports = {
    handleInteraction,
    handleBookmark,
};