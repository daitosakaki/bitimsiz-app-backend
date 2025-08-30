// src/api/v1/dating.routes.js
const hasPermission = require('../../middlewares/permission.middleware');
const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const datingController = require('../../features/dating/dating.controller');
const { datingValidation } = require('../../features/dating/dating.validation');
const premium = require('../../middlewares/permission.middleware');

const router = express.Router();

router.route('/profile')
    .get(auth(), datingController.getDatingProfile)
    .put(auth(), validate(datingValidation.updateDatingProfileSchema), datingController.updateDatingProfile);

router.get('/profiles', auth(), datingController.getPotentialProfiles);

router.get('/likes-me', auth(), hasPermission('SEE_WHO_LIKED_YOU'), datingController.getLikes);

router.post('/swipe', auth(), validate(datingValidation.swipeSchema), datingController.handleSwipe);

router.post('/undo-swipe', auth(), datingController.undoLastSwipe);

module.exports = router;