const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const userService = require('./user.service'); // Ana user servisini kullanıyoruz
const { logger } = require('../../config/logger');

const getPendingRequests = catchAsync(async (req, res) => {
    const requests = await userService.getPendingFollowRequests(req.user.id);
    res.send(requests);
});

const approveRequest = catchAsync(async (req, res) => {
    await userService.approveFollowRequest(req.params.requestId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
});

const denyRequest = catchAsync(async (req, res) => {
    await userService.denyFollowRequest(req.params.requestId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    getPendingRequests,
    approveRequest,
    denyRequest,
};