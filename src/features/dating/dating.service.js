// src/features/dating/dating.service.js
const httpStatus = require('http-status');
const { DatingProfile, Swipe, Match } = require('./dating.model');
const Chat = require('../chats/chat.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { sendNotificationToUser } = require('../notifications/notification.service');
const { checkAndDecrementUsage, incrementUsage } = require('../users/usage.service');
const { tierHierarchy, featurePermissions } = require('../../config/permissions');

/**
 * Kullanıcının flört profilini oluşturur veya günceller.
 */
const createOrUpdateDatingProfile = async (userId, profileBody) => {
    return DatingProfile.findOneAndUpdate({ user: userId }, profileBody, {
        new: true,
        upsert: true, // Eğer profil yoksa oluşturur
    });
};

/**
 * Kullanıcının tercihlerine ve abonelik seviyesine göre potansiyel eşleşmeleri getirir.
 */
const getPotentialMatches = async (userId, filters) => {
    const user = await User.findById(userId).select('subscription');
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const userProfile = await DatingProfile.findOne({ user: userId });
    if (!userProfile || !userProfile.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dating profile is not active or not found.');
    }

    const { maxDistance = 50 } = filters;
    const userTier = user.subscription?.tier || 'free';

    const swipedUserIds = (await Swipe.find({ swiper: userId })).map(s => s.swiped);

    const query = {
        user: { $nin: [...swipedUserIds, userId] },
        isActive: true,
        gender: userProfile.lookingFor === 'everyone' ? { $in: ['male', 'female', 'other'] } : userProfile.lookingFor,
    };

    if (userProfile.location && userProfile.location.coordinates) {
        query.location = {
            $near: {
                $geometry: { type: "Point", coordinates: userProfile.location.coordinates },
                $maxDistance: maxDistance * 1000,
            }
        };
    }

    if (tierHierarchy[userTier] >= tierHierarchy[featurePermissions.ADVANCED_DATING_FILTERS]) {
        if (filters.interest) {
             query.interests = filters.interest;
        }
    }

    const potentialMatches = await DatingProfile.find(query).populate('user', 'displayName profileImageUrl');
    return potentialMatches;
};

/**
 * Kaydırma işlemini yönetir, limitleri kontrol eder ve eşleşme olup olmadığını kontrol eder.
 */
const swipe = async (swiperUser, swipedUserId, action) => {
    const swiperId = swiperUser._id.toString();
    if (swiperId === swipedUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot swipe on yourself.");
    }

    if (action === 'super_like') {
        await checkAndDecrementUsage(swiperUser, 'superLike');
    } else {
        await checkAndDecrementUsage(swiperUser, 'swipe');
    }
    
    await Swipe.create({ swiper: swiperId, swiped: swipedUserId, action });

    const mutualAction = await Swipe.findOne({ swiper: swipedUserId, swiped: swiperId, action: { $in: ['like', 'super_like'] } });

    if ((action === 'like' || action === 'super_like') && mutualAction) {
        const match = await Match.create({ users: [swiperId, swipedUserId] });
        const chat = await Chat.create({ isGroupChat: false, members: [swiperId, swipedUserId] });
        match.chat = chat._id;
        await match.save();

        const swipedUserDoc = await User.findById(swipedUserId).select('displayName').lean();
        
        sendNotificationToUser(swipedUserId, {
            title: action === 'super_like' ? 'Süper! Biri seni çok beğendi! 🤩' : 'Yeni bir eşleşmen var! 🎉',
            body: `${swiperUser.displayName} ile eşleştin.`,
            data: { type: 'new_match', matchId: match._id.toString() }
        });
        sendNotificationToUser(swiperId, {
            title: 'Yeni bir eşleşmen var! 🎉',
            body: `${swipedUserDoc.displayName} ile eşleştin.`,
            data: { type: 'new_match', matchId: match._id.toString() }
        });

        return { matched: true, match };
    } else if (action === 'super_like') {
        sendNotificationToUser(swipedUserId, {
            title: `🤩 ${swiperUser.displayName} seni süper beğendi!`,
            body: 'Bir sonraki hamle sende!',
            data: { type: 'super_like', fromUserId: swiperId }
        });
    }

    return { matched: false };
};

/**
 * Bir kullanıcıyı beğenen (ancak henüz eşleşme olmayan) kişileri listeler.
 */
const getUsersWhoLikedMe = async (userId) => {
    const likes = await Swipe.find({
        swiped: userId,
        action: { $in: ['like', 'super_like'] }
    }).select('swiper -_id');

    const likerIds = likes.map(like => like.swiper);

    const mySwipes = await Swipe.find({ swiper: userId }).select('swiped -_id');
    const mySwipedIds = mySwipes.map(swipe => swipe.swiped.toString());

    const unreciprocatedLikerIds = likerIds.filter(id => !mySwipedIds.includes(id.toString()));

    return User.find({ _id: { $in: unreciprocatedLikerIds } }).select('displayName profileImageUrl bio');
};

/**
 * Son kaydırma işlemini geri alır ve harcanan hakları iade eder.
 */
const undoSwipe = async (user) => {
    await checkAndDecrementUsage(user, 'undoSwipe');
    
    const lastSwipe = await Swipe.findOne({ swiper: user._id }).sort({ createdAt: -1 });

    if (!lastSwipe) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No recent swipe to undo.');
    }

    if (lastSwipe.action === 'super_like') {
        await incrementUsage(user, 'superLike');
    } else {
        await incrementUsage(user, 'swipe');
    }
    
    await lastSwipe.deleteOne();
    await user.save();
    
    return { message: 'Your last swipe has been undone.' };
};

module.exports = {
    createOrUpdateDatingProfile,
    getPotentialMatches,
    swipe,
    getUsersWhoLikedMe,
    undoSwipe,
};