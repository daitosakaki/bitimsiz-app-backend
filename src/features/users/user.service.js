const httpStatus = require('http-status');
const User = require('./user.model');
const Follow = require('./follow.model');
const Address = require('./address.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');

/**
 * Kullanıcı adına göre bir kullanıcıyı getirir. Gizlilik ve takip durumunu kontrol eder.
 * @param {string} username - Aranan kullanıcının adı
 * @param {object} [requestingUser] - İsteği yapan, giriş yapmış kullanıcı (opsiyonel)
 * @returns {Promise<object>}
 */
const getUserByUsername = async (username, requestingUser) => {
    const user = await User.findOne({ username });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    let followStatus = null; // Takip durumu: null, 'pending', 'approved'
    if (requestingUser) {
        const relation = await Follow.findOne({ follower: requestingUser.id, following: user.id });
        if (relation) followStatus = relation.status;
    }
    
    const isOwner = requestingUser ? user.id === requestingUser.id : false;

    if (user.isPrivate && followStatus !== 'approved' && !isOwner) {
        return {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            bio: user.bio,
            isPrivate: true,
            followerCount: user.followerCount,
            followingCount: user.followingCount,
            followStatus,
        };
    }
    
    const userJson = user.toJSON();
    userJson.followStatus = followStatus;
    return userJson;
};

/**
 * Bir kullanıcının profilini günceller.
 * @param {string} userId - Güncellenecek kullanıcının ID'si
 * @param {object} updateBody - Güncellenecek alanlar
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

    delete updateBody.email;
    delete updateBody.password;
    delete updateBody.role; // Kullanıcı kendi rolünü değiştiremez

    Object.assign(user, updateBody);
    await user.save();
    return user;
};

/**
 * Bir kullanıcıyı takip etme veya takip isteği gönderme işlemini yönetir.
 */
const handleFollowAction = async (userIdToFollow, followerId) => {
    if (userIdToFollow === followerId) throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot follow yourself.');

    const targetUser = await User.findById(userIdToFollow);
    if (!targetUser) throw new ApiError(httpStatus.NOT_FOUND, 'User to follow not found.');
    
    const existingRelation = await Follow.findOne({ follower: followerId, following: userIdToFollow });
    if (existingRelation) throw new ApiError(httpStatus.BAD_REQUEST, 'A follow request already exists or is completed.');

    if (targetUser.isPrivate) {
        await Follow.create({ follower: followerId, following: userIdToFollow, status: 'pending' });
        logger.info('Follow request sent', { followerId, followedId: userIdToFollow });
    } else {
        await Follow.create({ follower: followerId, following: userIdToFollow, status: 'approved' });
        await Promise.all([
            User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
            User.findByIdAndUpdate(userIdToFollow, { $inc: { followerCount: 1 } }),
        ]);
        logger.info('User followed directly (public profile)', { followerId, followedId: userIdToFollow });
    }
};

/**
 * Onaylanmış bir takibi bırakır.
 */
const unfollowUser = async (userIdToUnfollow, followerId) => {
    const deletedFollow = await Follow.findOneAndDelete({ follower: followerId, following: userIdToUnfollow, status: 'approved' });
    if (deletedFollow) {
        await Promise.all([
            User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
            User.findByIdAndUpdate(userIdToUnfollow, { $inc: { followerCount: -1 } }),
        ]);
        logger.info('User unfollowed', { followerId, unfollowedId: userIdToUnfollow });
    }
};

/**
 * Bir kullanıcının bekleyen takip isteklerini listeler.
 */
const getPendingFollowRequests = async (userId) => {
    return Follow.find({ following: userId, status: 'pending' }).populate('follower', 'username displayName profileImageUrl');
};

/**
 * Bir takip isteğini onaylar.
 */
const approveFollowRequest = async (requestId, currentUserId) => {
    const request = await Follow.findById(requestId);
    if (!request || request.following.toString() !== currentUserId) {
        logger.warn('Unauthorized attempt to approve follow request', { attempterId: currentUserId, requestId });
        throw new ApiError(httpStatus.NOT_FOUND, 'Request not found or you do not have permission.');
    }
    if (request.status !== 'pending') throw new ApiError(httpStatus.BAD_REQUEST, 'Request is not pending.');

    request.status = 'approved';
    await request.save();

    await Promise.all([
        User.findByIdAndUpdate(request.follower, { $inc: { followingCount: 1 } }),
        User.findByIdAndUpdate(request.following, { $inc: { followerCount: 1 } }),
    ]);
    logger.info('Follow request approved', { approverId: currentUserId, requesterId: request.follower.toString(), requestId });
};

/**
 * Bir takip isteğini reddeder.
 */
const denyFollowRequest = async (requestId, currentUserId) => {
    const request = await Follow.findById(requestId);
    if (!request || request.following.toString() !== currentUserId) {
        logger.warn('Unauthorized attempt to deny follow request', { attempterId: currentUserId, requestId });
        throw new ApiError(httpStatus.NOT_FOUND, 'Request not found or you do not have permission.');
    }
    const requesterId = request.follower.toString();
    await request.remove();
    logger.info('Follow request denied and deleted', { denierId: currentUserId, requesterId, requestId });
};

// const redisClient = require('../../socket').redisClient; // Redis client'ı export etmeniz gerekir
const getOnlineStatus = async (userIds) => {
    const onlineStatuses = {};
    for (const userId of userIds) {
        // sIsMember, bir elemanın sette olup olmadığını kontrol eder
        onlineStatuses[userId] = await redisClient.sIsMember('online_users', userId);
    }
    return onlineStatuses;
};
// --- E-TİCARET ADRES FONKSİYONLARI ---

const getAddressesByUserId = async (userId) => Address.find({ user: userId }).sort({ createdAt: -1 });
const addAddress = async (userId, addressBody) => Address.create({ ...addressBody, user: userId });
const updateAddress = async (userId, addressId, updateBody) => {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found or permission denied.');
    Object.assign(address, updateBody);
    await address.save();
    return address;
};
const deleteAddress = async (userId, addressId) => {
    const result = await Address.deleteOne({ _id: addressId, user: userId });
    if (result.deletedCount === 0) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found or permission denied.');
};

module.exports = {
    getUserByUsername,
    updateUserById,
    handleFollowAction,
    unfollowUser,
    getPendingFollowRequests,
    approveFollowRequest,
    denyFollowRequest,
    getAddressesByUserId,
    addAddress,
    getOnlineStatus,
    updateAddress,
    deleteAddress,
};