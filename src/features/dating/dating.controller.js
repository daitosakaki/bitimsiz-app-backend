// src/features/dating/dating.controller.js
const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const datingService = require('./dating.service');

const updateDatingProfile = catchAsync(async (req, res) => {
    const profile = await datingService.createOrUpdateDatingProfile(req.user.id, req.body);
    res.send(profile);
});

const getDatingProfile = catchAsync(async (req, res) => {
    const profile = await datingService.createOrUpdateDatingProfile(req.user.id, {});
    res.send(profile);
});

// getMatches'ı getPotentialProfiles olarak adlandırıp filtreleri alacak şekilde güncelleyelim
const getPotentialProfiles = catchAsync(async (req, res) => {
    const profiles = await datingService.getPotentialMatches(req.user.id, req.query);
    res.send(profiles);
});

const handleSwipe = catchAsync(async (req, res) => {
    const { swipedUserId, action } = req.body;
    const result = await datingService.swipe(req.user, swipedUserId, action); // req.user'ın tamamını gönder
    res.status(httpStatus.CREATED).send(result);
});

const getLikes = catchAsync(async (req, res) => {
    const users = await datingService.getUsersWhoLikedMe(req.user.id);
    res.send(users);
});

const undoLastSwipe = catchAsync(async (req, res) => {
    const result = await datingService.undoSwipe(req.user);
    res.send(result);
});
module.exports = {
    updateDatingProfile,
    getDatingProfile,
    getPotentialProfiles,
    handleSwipe,
    getLikes,
    undoLastSwipe,
};