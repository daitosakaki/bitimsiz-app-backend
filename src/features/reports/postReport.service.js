const Report = require('./postReport.model');
const Post = require('../posts/post.model');
const { logger } = require('../../config/logger');

const createPostReport = async (postId, userId, reason, details) => {
    const report = await Report.create({
        post: postId,
        user: userId,
        reason,
        details,
    });
    await Post.findByIdAndUpdate(postId, { $inc: { 'statistics.reportCount': 1 } });
    logger.info('Post reported', { postId, userId, reason });
    return report;
};

module.exports = { createPostReport };