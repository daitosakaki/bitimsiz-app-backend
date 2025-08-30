// src/middlewares/permission.middleware.js
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { tierHierarchy, featurePermissions } = require('../config/permissions');
const { logger } = require('../config/logger');

const hasPermission = (featureName) => async (req, res, next) => {
    const user = req.user;
    const requiredTier = featurePermissions[featureName];

    if (!requiredTier) {
        logger.error(`Permission check failed: Feature '${featureName}' is not defined in permissions.js`);
        return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error.'));
    }

    const userTier = user.subscription?.tier || 'free';

    if (tierHierarchy[userTier] >= tierHierarchy[requiredTier]) {
        if (userTier !== 'free' && user.subscription.expiresAt && user.subscription.expiresAt < new Date()) {
            user.subscription.tier = 'free';
            await user.save();
            return next(new ApiError(httpStatus.FORBIDDEN, 'Your subscription has expired.'));
        }
        return next();
    }
    
    return next(new ApiError(httpStatus.FORBIDDEN, `This feature requires a '${requiredTier}' subscription.`));
};

module.exports = hasPermission;