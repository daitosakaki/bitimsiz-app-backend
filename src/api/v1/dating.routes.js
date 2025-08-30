// src/api/v1/dating.routes.js
const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const datingController = require('../../features/dating/dating.controller');
const { datingValidation } = require('../../features/dating/dating.validation');
const premium = require('../../middlewares/premium.middleware');

const router = express.Router();

// Flört profili yönetimi
router.route('/profile')
    .get(auth(), datingController.getDatingProfile)
    .put(auth(), validate(datingValidation.updateDatingProfileSchema), datingController.updateDatingProfile);

// Potansiyel profilleri/eşleşmeleri getirme
router.get('/profiles', auth(), datingController.getPotentialProfiles);

// Seni beğenenleri görme (Sadece Premium)
router.get('/likes-me', auth(), premium(), datingController.getLikes); // <-- YENİ

// Kaydırma (like/dislike/super_like)
router.post('/swipe', auth(), validate(datingValidation.swipeSchema), datingController.handleSwipe);

module.exports = router;