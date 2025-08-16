// ...
const userService = require('./user.service');

// getMe, updateMe, getUserByUsername, follow, unfollow aynı kalır...

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
    // ...
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
};