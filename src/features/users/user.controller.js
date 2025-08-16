const httpStatus = require('http-status');
const userService = require('./user.service');
const catchAsync = require('../../utils/catchAsync');

// getMe, updateMe, getUserByUsername, follow, unfollow aynı kalır...
const getMe = catchAsync(async (req, res) => {
    res.send(req.user.toJSON());
});

const updateMe = catchAsync(async (req, res) => {
    const user = await userService.updateUserById(req.user.id, req.body);
    res.send(user);
});

const getUserByUsername = catchAsync(async (req, res) => {
    const user = await userService.getUserByUsername(req.params.username, req.user);
    res.send(user);
});

const follow = catchAsync(async (req, res) => {
    await userService.handleFollowAction(req.params.userId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
});

const unfollow = catchAsync(async (req, res) => {
    await userService.unfollowUser(req.params.userId, req.user.id);
    res.status(httpStatus.NO_CONTENT).send();
});
// --- YENİ ADRES CONTROLLER'LARI ---
const getAddresses = catchAsync(async (req, res) => {
    const addresses = await userService.getAddressesByUserId(req.user.id);
    res.send(addresses);
});

const addAddress = catchAsync(async (req, res) => {
    const address = await userService.addAddress(req.user.id, req.body);
    res.status(httpStatus.CREATED).send(address);
});

const updateAddress = catchAsync(async (req, res) => {
    const address = await userService.updateAddress(req.user.id, req.params.addressId, req.body);
    res.send(address);
});

const deleteAddress = catchAsync(async (req, res) => {
    await userService.deleteAddress(req.user.id, req.params.addressId);
    res.status(httpStatus.NO_CONTENT).send();
});


module.exports = {
    getMe,
    updateMe,
    getUserByUsername,
    follow,
    unfollow,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
};