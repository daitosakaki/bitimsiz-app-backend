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

const getMatches = catchAsync(async (req, res) => {
    const matches = await datingService.getPotentialMatches(req.user.id);
    res.send(matches);
});

const handleSwipe = catchAsync(async (req, res) => {
    const { swipedUserId, action } = req.body;
    const result = await datingService.swipe(req.user.id, swipedUserId, action);
    res.status(httpStatus.CREATED).send(result);
});


module.exports = {
    updateDatingProfile,
    getDatingProfile,
    getMatches,
    handleSwipe,
};