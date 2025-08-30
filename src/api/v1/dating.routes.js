// src/api/v1/dating.routes.js
const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const datingController = require('../../features/dating/dating.controller');
const { datingValidation } = require('../../features/dating/dating.validation');

const router = express.Router();

// Flört profili yönetimi
router.route('/profile')
    .get(auth(), datingController.getDatingProfile)
    .put(auth(), validate(datingValidation.updateDatingProfileSchema), datingController.updateDatingProfile);

// Potansiyel eşleşmeleri getirme
router.get('/matches', auth(), datingController.getMatches);

// Kaydırma (like/dislike)
router.post('/swipe', auth(), validate(datingValidation.swipeSchema), datingController.handleSwipe);

module.exports = router;