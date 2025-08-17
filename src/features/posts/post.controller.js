const httpStatus = require('http-status');
const postReportService = require('../reports/postReport.service');
const postService = require('./post.service');
const interactionService = require('../interactions/interaction.service');
const catchAsync = require('../../utils/catchAsync');
const { logger } = require('../../config/logger');

const generateUploadUrl = catchAsync(async (req, res) => {
    const { fileName } = req.body;
    const url = await postService.generateUploadUrl(fileName);
    res.send({ url });
});

const createPost = catchAsync(async (req, res) => {
    const reqMetadata = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const post = await postService.createPost(req.user.id, req.body, reqMetadata);
    logger.info('New post created', { postId: post.id, authorId: req.user.id, ip: req.ip });
    res.status(httpStatus.CREATED).send(post);
});

const getFeed = catchAsync(async (req, res) => {
    const posts = await postService.getFeedForUser(req.user.id, req.query);
    res.send(posts);
});

const getPost = catchAsync(async (req, res) => {
    const post = await postService.getPostById(req.params.postId, req.user);
    res.send(post);
});

const deletePost = catchAsync(async (req, res) => {
    await postService.deletePostById(req.params.postId, req.user.id);
    logger.info('Post deleted', { postId: req.params.postId, userId: req.user.id, ip: req.ip });
    res.status(httpStatus.NO_CONTENT).send();
});

const likePost = catchAsync(async (req, res) => {
    const result = await interactionService.handleInteraction(req.params.postId, req.user.id, 'like');
    res.send(result);
});

const dislikePost = catchAsync(async (req, res) => {
    const result = await interactionService.handleInteraction(req.params.postId, req.user.id, 'dislike');
    res.send(result);
});

const bookmarkPost = catchAsync(async (req, res) => {
    const result = await interactionService.handleBookmark(req.params.postId, req.user.id);
    res.send(result);
});

const reportPost = catchAsync(async (req, res) => {
    const { reason, details } = req.body;
    await postReportService.createPostReport(req.params.postId, req.user.id, reason, details);
    res.status(httpStatus.CREATED).send({ message: 'Post has been reported successfully.' });
});

const voteOnPoll = catchAsync(async (req, res) => {
    const { optionId } = req.body;
    const updatedPost = await postService.voteOnPoll(req.params.postId, req.user.id, optionId);
    res.send(updatedPost.content.poll); // Sadece anketin güncel halini dönmek yeterli
});

module.exports = {
    generateUploadUrl, createPost, getFeed, getPost, deletePost, likePost, dislikePost, bookmarkPost,
    reportPost,
    voteOnPoll
};