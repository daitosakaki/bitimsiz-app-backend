const httpStatus = require('http-status');
const User = require('./user.model');
const Follow = require('./follow.model');
const Address = require('./address.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');
const { redisClient } = require('../../socket');

/**
 * Kullanıcı adına göre bir kullanıcıyı getirir. Gizlilik ve takip durumunu kontrol eder.
 * @param {string} username - Aranan kullanıcının adı
 * @param {object} [requestingUser] - İsteği yapan, giriş yapmış kullanıcı (opsiyonel)
 * @returns {Promise<object>}
 */
const getUserByUsername = async (username, requestingUser) => {
    const cacheKey = `user:${username}`;

    let userJson; // Kullanıcı verisini tutacak değişken

    // 1. Statik Kullanıcı Verisini Redis'ten Getir
    if (redisClient.isReady) {
        const cachedUser = await redisClient.get(cacheKey);
        if (cachedUser) {
            userJson = JSON.parse(cachedUser);
        }
    }

    // 2. Cache'te Yoksa Veritabanından Getir ve Cache'le
    if (!userJson) {
        const user = await User.findOne({ username });
        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        }
        userJson = user.toJSON(); // toJSON() ile hassas verileri temizle

        // Temel, statik kullanıcı verisini cache'le
        if (redisClient.isReady) {
            // Cache süresini (örn: 1 saat) ihtiyaca göre ayarla
            await redisClient.set(cacheKey, JSON.stringify(userJson), { 'EX': 3600 });
        }
    }

    // 3. Dinamik Veriyi (Takip Durumu) Her Zaman Ayrı Hesapla
    let followStatus = null;
    if (requestingUser) {
        // Bu sorgu oldukça hızlıdır ve her istekte çalışabilir
        const relation = await Follow.findOne({ follower: requestingUser.id, following: userJson._id }).select('status');
        if (relation) {
            followStatus = relation.status;
        }
    }

    // 4. Yetkilendirme ve Son Veriyi Oluşturma
    const isOwner = requestingUser ? userJson._id.toString() === requestingUser.id : false;

    // Gizli profil mantığı
    if (userJson.isPrivate && followStatus !== 'approved' && !isOwner) {
        // Sadece izin verilen alanları döndür
        return {
            _id: userJson._id,
            username: userJson.username,
            displayName: userJson.displayName,
            profileImageUrl: userJson.profileImageUrl,
            bio: userJson.bio,
            isPrivate: true,
            followerCount: userJson.followerCount,
            followingCount: userJson.followingCount,
            followStatus, // Dinamik olarak hesaplanan doğru durumu ekle
        };
    }

    // Herkese açık profil veya yetkili kullanıcı için tam veri
    userJson.followStatus = followStatus;
    return userJson;
};

/**
 * Kullanıcı profilini günceller ve cache'i temizler.
 * @param {string} userId - Güncellenecek kullanıcının ID'si
 * @param {object} updateBody - Güncellenecek alanlar
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

    delete updateBody.email;
    delete updateBody.password;
    delete updateBody.role;

    Object.assign(user, updateBody);
    await user.save();

    // --- IYILESTIRME: Cache Invalidation ---
    // Kullanıcı güncellendiğinde Redis cache'ini temizle
    if (redisClient.isReady) {
        await redisClient.del(`user:${user.username}`);
        await redisClient.set(cacheKey, JSON.stringify(user.toJSON()), { 'EX': 3600 });
        logger.info(`Cache invalidated for user: ${user.username}`);
    }

    return user;
};
/**
 * Bir kullanıcıyı takip etme veya takip isteği gönderme işlemini atomik olarak yönetir.
 * @param {string} userIdToFollow Takip edilecek kullanıcının ID'si
 * @param {string} followerId Takip eden kullanıcının ID'si
 */
const handleFollowAction = async (userIdToFollow, followerId) => {
    // --- IYILESTIRME: Ön Kontroller Eklendi ---
    if (userIdToFollow === followerId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot follow yourself.');
    }

    const targetUser = await User.findById(userIdToFollow);
    if (!targetUser) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User to follow not found.');
    }

    const existingFollow = await Follow.findOne({ follower: followerId, following: userIdToFollow });
    if (existingFollow) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You are already following or have a pending request for this user.');
    }

    // --- IYILESTIRME: Mongoose Transaction Kullanımı ---
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const status = targetUser.isPrivate ? 'pending' : 'approved';
        await Follow.create([{ follower: followerId, following: userIdToFollow, status }], { session });

        if (status === 'approved') {
            await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }, { session });
            await User.findByIdAndUpdate(userIdToFollow, { $inc: { followerCount: 1 } }, { session });
        }

        await session.commitTransaction();

        // --- IYILESTIRME: Cache Invalidation ---
        if (status === 'approved' && redisClient.isReady) {
            await Promise.all([
                redisClient.del(`user:${(await User.findById(followerId).select('username')).username}`),
                redisClient.del(`user:${targetUser.username}`)
            ]);
            logger.info(`Cache invalidated for users after follow action.`);
        }

        logger.info('Follow action successful', { followerId, followedId: userIdToFollow, status });
        return { status }; // Durum bilgisini döndür
    } catch (error) {
        await session.abortTransaction();
        logger.error('Follow action failed and transaction was aborted.', { error, followerId, followedId: userIdToFollow });
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not complete follow action.');
    } finally {
        session.endSession();
    }
};
/**
 * Onaylanmış bir takibi bırakır.
 */
const unfollowUser = async (userIdToUnfollow, followerId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let unfollowedUser = null;
    try {
        const deletedFollow = await Follow.findOneAndDelete(
            { follower: followerId, following: userIdToUnfollow, status: 'approved' },
            { session }
        );

        if (deletedFollow) {
            await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }, { session });
            unfollowedUser = await User.findByIdAndUpdate(userIdToUnfollow, { $inc: { followerCount: -1 } }, { session });
        } else {
            // Eğer böyle bir takip ilişkisi yoksa işlemi sonlandır.
            throw new ApiError(httpStatus.NOT_FOUND, 'You are not following this user.');
        }

        await session.commitTransaction();

        // --- IYILESTIRME: Cache Invalidation ---
        if (unfollowedUser && redisClient.isReady) {
            await Promise.all([
                redisClient.del(`user:${(await User.findById(followerId).select('username')).username}`),
                redisClient.del(`user:${unfollowedUser.username}`)
            ]);
            logger.info(`Cache invalidated for users after unfollow action.`);
        }
        logger.info('User unfollowed', { followerId, unfollowedId: userIdToUnfollow });
    } catch (error) {
        await session.abortTransaction();
        logger.error('Unfollow action failed and transaction was aborted.', { error, followerId, unfollowedId: userIdToUnfollow });
        // Eğer hata bizim ApiError'umuz değilse, genel bir hata fırlat
        if (!(error instanceof ApiError)) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not complete unfollow action.');
        }
        throw error;
    } finally {
        session.endSession();
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
    if (!redisClient.isReady) {
        logger.warn('Redis client is not ready for online status check.');
        // Redis hazır değilse, tüm kullanıcıları offline varsayabiliriz.
        const offlineStatuses = {};
        userIds.forEach(id => { offlineStatuses[id] = false; });
        return offlineStatuses;
    }
    const onlineStatuses = {};
    for (const userId of userIds) {
        onlineStatuses[userId] = await redisClient.sIsMember('online_users', userId.toString());
    }
    return onlineStatuses;
};
// --- E-TİCARET ADRES FONKSİYONLARI ---

const getAddressesByUserId = async (userId) => Address.find({ user: userId }).sort({ createdAt: -1 });
const addAddress = async (userId, addressBody) => Address.create({ ...addressBody, user: userId });
const updateAddress = async (userId, addressId, updateBody) => {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) {
        logger.warn('Failed attempt to update address.', { attempterId: userId, addressId });
        throw new ApiError(httpStatus.NOT_FOUND, 'Address not found or permission denied.');
    }
    Object.assign(address, updateBody);
    await address.save();
    return address;
};
const deleteAddress = async (userId, addressId) => {
    const result = await Address.deleteOne({ _id: addressId, user: userId });
    if (result.deletedCount === 0) {
        logger.warn('Failed attempt to delete address.', { attempterId: userId, addressId });
        throw new ApiError(httpStatus.NOT_FOUND, 'Address not found or permission denied.');
    };
}
/**
 * Kullanıcının cihazına ait FCM token'ını veritabanına ekler.
 * @param {string} userId - Kullanıcının ID'si
 * @param {string} token - Firebase'den gelen FCM token
 */
const addFcmToken = async (userId, token) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    // $addToSet operatörü, token zaten dizide varsa tekrar eklemez.
    await User.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token } });
    logger.info('FCM token added for user', { userId, token });
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
    addFcmToken,
};