const httpStatus = require('http-status');
const Interaction = require('./interaction.model');
const Post = require('../posts/post.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');

/**
 * Bir gönderi için bookmark (yer imi) işlemini yönetir.
 */
const handleBookmark = async (postId, userId) => {
    const interactionType = 'bookmark';
    const existingBookmark = await Interaction.findOne({ post: postId, user: userId, type: interactionType });

    if (existingBookmark) {
        await existingBookmark.remove();
        await Post.findByIdAndUpdate(postId, { $inc: { 'statistics.bookmarkCount': -1 } });
        return { message: 'Bookmark removed.' };
    } else {
        await Interaction.create({ post: postId, user: userId, type: interactionType });
        await Post.findByIdAndUpdate(postId, { $inc: { 'statistics.bookmarkCount': 1 } });
        return { message: 'Bookmark added.' };
    }
};

const handleInteraction = async (postId, userId, interactionType) => {
    const existingInteraction = await Interaction.findOne({ post: postId, user: userId });
    let message = '';

    if (existingInteraction) {
        if (existingInteraction.type === interactionType) {
            await existingInteraction.remove();
            await Post.findByIdAndUpdate(postId, { $inc: { [`statistics.${interactionType}Count`]: -1 } });
            message = 'Interaction removed.';
        } else {
            const oldType = existingInteraction.type;
            existingInteraction.type = interactionType;
            await existingInteraction.save();
            await Post.findByIdAndUpdate(postId, { $inc: { [`statistics.${oldType}Count`]: -1, [`statistics.${interactionType}Count`]: 1 } });
            message = 'Interaction updated.';
        }
    } else {
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