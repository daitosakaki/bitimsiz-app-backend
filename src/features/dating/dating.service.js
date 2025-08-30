// src/features/dating/dating.service.js
const httpStatus = require('http-status');
const { DatingProfile, Swipe, Match } = require('./dating.model');
const Chat = require('../chats/chat.model'); // Eşleşme sonrası sohbet için
const ApiError = require('../../utils/ApiError');
const User = require('../users/user.model');
const { sendNotificationToUser } = require('../notifications/notification.service');

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
 * Kullanıcının tercihlerine ve mesafeye göre potansiyel eşleşmeleri getirir.
 */
const getPotentialMatches = async (userId, filters) => {
    const userProfile = await DatingProfile.findOne({ user: userId });
    if (!userProfile || !userProfile.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dating profile is not active or not found.');
    }

    const { maxDistance = 50 } = filters; // Varsayılan 50 km

    // Kullanıcının daha önce kaydırdığı kişileri bul
    const swipedUserIds = (await Swipe.find({ swiper: userId })).map(s => s.swiped);

    // Ana sorgu kriterleri
    const query = {
        user: { $nin: [...swipedUserIds, userId] },
        isActive: true,
        gender: userProfile.lookingFor === 'everyone' ? { $in: ['male', 'female', 'other'] } : userProfile.lookingFor,
    };

    // Mesafe filtresi ekle
    if (userProfile.location && userProfile.location.coordinates) {
        query.location = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: userProfile.location.coordinates
                },
                $maxDistance: maxDistance * 1000 // Metreye çevir
            }
        };
    }

    const potentialMatches = await DatingProfile.find(query).populate('user', 'displayName profileImageUrl');
    return potentialMatches;
};
/**
 * Super Like hakkını kontrol eder ve düşürür.
 */
const checkAndDecrementSuperLikes = async (user) => {
    const now = new Date();
    // 24 saat geçtiyse hakları yenile
    if (now - user.superLikes.lastRefreshed > 24 * 60 * 60 * 1000) {
        user.superLikes.count = user.subscription.status === 'premium' ? 5 : 1; // Premium: 5, Free: 1
        user.superLikes.lastRefreshed = now;
    }

    if (user.superLikes.count <= 0) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You have no Super Likes left.');
    }

    user.superLikes.count -= 1;
    await user.save();
};
/**
 * Kaydırma işlemini yönetir ve eşleşme olup olmadığını kontrol eder.
 */
const swipe = async (swiperUser, swipedUserId, action) => {
    const swiperId = swiperUser._id.toString();
    if (swiperId === swipedUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot swipe on yourself.");
    }

    if (action === 'super_like') {
        if (swiperUser.subscription.status !== 'premium') {
             throw new ApiError(httpStatus.FORBIDDEN, 'Super Like is a premium feature.');
        }
        await checkAndDecrementSuperLikes(swiperUser);
    }
    
    await Swipe.create({ swiper: swiperId, swiped: swipedUserId, action });

    const mutualAction = await Swipe.findOne({ swiper: swipedUserId, swiped: swiperId, action: { $in: ['like', 'super_like'] } });

    if ( (action === 'like' || action === 'super_like') && mutualAction) {
        // EŞLEŞME!
        const match = await Match.create({ users: [swiperId, swipedUserId] });
        const chat = await Chat.create({ isGroupChat: false, members: [swiperId, swipedUserId] });
        match.chat = chat._id;
        await match.save();

        const swipedUser = await User.findById(swipedUserId).select('displayName').lean();
        
        // Bildirimler
        sendNotificationToUser(swipedUserId, {
            title: action === 'super_like' ? 'Süper! Biri seni çok beğendi! 🤩' : 'Yeni bir eşleşmen var! 🎉',
            body: `${swiperUser.displayName} ile eşleştin.`,
            data: { type: 'new_match', matchId: match._id.toString() }
        });
        sendNotificationToUser(swiperId, {
            title: 'Yeni bir eşleşmen var! 🎉',
            body: `${swipedUser.displayName} ile eşleştin.`,
            data: { type: 'new_match', matchId: match._id.toString() }
        });

        return { matched: true, match };
    }
    return { matched: false };
};

/**
 * Bir kullanıcıyı beğenen kişileri listeler.
 */
const getUsersWhoLikedMe = async (userId) => {
    // Beni beğenen veya süper beğenen swipe kayıtlarını bul
    const likes = await Swipe.find({
        swiped: userId,
        action: { $in: ['like', 'super_like'] }
    }).select('swiper -_id');

    const likerIds = likes.map(like => like.swiper);

    // Benim daha önce kaydırdığım (beğendiğim veya beğenmediğim) kişileri bul
    const mySwipes = await Swipe.find({ swiper: userId }).select('swiped -_id');
    const mySwipedIds = mySwipes.map(swipe => swipe.swiped.toString());

    // Eşleşme olmayanları filtrele: Beni beğenen ama benim henüz görmediğim/kaydırmadığım kişiler
    const unreciprocatedLikerIds = likerIds.filter(id => !mySwipedIds.includes(id.toString()));

    // Bu kişilerin profillerini getir
    return User.find({ _id: { $in: unreciprocatedLikerIds } }).select('displayName profileImageUrl bio');
};


module.exports = {
    createOrUpdateDatingProfile,
    getPotentialMatches,
    swipe,
    getUsersWhoLikedMe,
};