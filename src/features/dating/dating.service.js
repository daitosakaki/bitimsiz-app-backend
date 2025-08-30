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
 * Kullanıcının tercihlerine göre potansiyel eşleşmeleri getirir.
 */
const getPotentialMatches = async (userId) => {
    const userProfile = await DatingProfile.findOne({ user: userId });
    if (!userProfile || !userProfile.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Dating profile is not active or not found.');
    }

    // Kullanıcının daha önce kaydırdığı kişileri bul
    const swipedUserIds = (await Swipe.find({ swiper: userId })).map(s => s.swiped);

    // Kriterlere uyan ve daha önce kaydırılmamış profilleri getir
    const potentialMatches = await DatingProfile.find({
        user: { $nin: [...swipedUserIds, userId] }, // Kendini ve daha önce kaydırdıklarını hariç tut
        isActive: true,
        gender: userProfile.lookingFor === 'everyone' ? { $in: ['male', 'female', 'other'] } : userProfile.lookingFor,
        // TODO: Yaş ve konum tercihlerine göre filtreleme ekle
    }).populate('user', 'displayName profileImageUrl');

    return potentialMatches;
};

/**
 * Kaydırma işlemini yönetir ve eşleşme olup olmadığını kontrol eder.
 */
const swipe = async (swiperId, swipedUserId, action) => {
    if (swiperId === swipedUserId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You cannot swipe on yourself.");
    }
    // Önce kaydı oluştur
    const swipe = await Swipe.create({ swiper: swiperId, swiped: swipedUserId, action });

    // Eğer "like" ise, karşı tarafın da "like" yapıp yapmadığını kontrol et
    if (action === 'like') {
        const mutualLike = await Swipe.findOne({ swiper: swipedUserId, swiped: swiperId, action: 'like' });
        if (mutualLike) {
            // EŞLEŞME!
            const match = await Match.create({ users: [swiperId, swipedUserId] });
            // Eşleşme sonrası otomatik bir sohbet odası da oluşturabiliriz.
            const chat = await Chat.create({
                isGroupChat: false,
                members: [swiperId, swipedUserId],
            });
            match.chat = chat._id;
            await match.save();

            const swiperUser = await User.findById(swiperId).select('displayName').lean();
            const swipedUser = await User.findById(swipedUserId).select('displayName').lean();

            // Karşı tarafa bildirim gönder
            sendNotificationToUser(swipedUserId, {
                title: 'Yeni bir eşleşmen var! 🎉',
                body: `${swiperUser.displayName} ile eşleştin.`,
                data: { type: 'new_match', matchId: match._id.toString() }
            });

            // Beğeniyi atana bildirim gönder
            sendNotificationToUser(swiperId, {
                title: 'Yeni bir eşleşmen var! 🎉',
                body: `${swipedUser.displayName} ile eşleştin.`,
                data: { type: 'new_match', matchId: match._id.toString() }
            });

            return { matched: true, match };
        }
    }
    return { matched: false };
};


module.exports = {
    createOrUpdateDatingProfile,
    getPotentialMatches,
    swipe,
};