// src/config/permissions.js

// Abonelik seviyelerinin hiyerarşisi. Yüksek sayı, daha fazla yetki anlamına gelir.
const tierHierarchy = {
    free: 0,
    gold: 1,
    platinum: 2,
};

// Uygulamadaki tüm premium özellikleri ve gerektirdikleri minimum seviye.
const featurePermissions = {
    // Dating Features
    SEE_WHO_LIKED_YOU: 'platinum',
    ADVANCED_DATING_FILTERS: 'platinum',

    // Post Features
    PIN_POST_TO_PROFILE: 'gold',
    ADVANCED_POST_ANALYTICS: 'platinum',
};

// Her abonelik seviyesi için günlük etkileşim limitleri.
// `Infinity` sınırsız anlamına gelir.
const tierLimits = {
    free: {
        dailySwipes: 25,
        dailySuperLikes: 1,
        dailyUndoSwipes: 0,
        dailyPostShares: 3,
        dailyInteractions: 30, // Beğeni, yorum vb.
    },
    gold: {
        dailySwipes: Infinity,
        dailySuperLikes: 5,
        dailyUndoSwipes: 5,
        dailyPostShares: 10,
        dailyInteractions: 100,
    },
    platinum: {
        dailySwipes: Infinity,
        dailySuperLikes: 10,
        dailyUndoSwipes: Infinity,
        dailyPostShares: Infinity,
        dailyInteractions: Infinity,
    },
};

module.exports = {
    tierHierarchy,
    featurePermissions,
    tierLimits,
};