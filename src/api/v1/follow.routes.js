const express = require('express');
const auth = require('../../middlewares/auth.middleware');
// Gerekli controller fonksiyonları buraya import edilecek.
// Bunun için de bir follow.controller.js oluşturmak gerekir.

const router = express.Router();

// Giriş yapmış kullanıcının bekleyen takip isteklerini listeler
router.get('/requests/pending', auth(), followController.getPendingRequests);

// Bir takip isteğini onaylar
router.post('/requests/:requestId/approve', auth(), followController.approveRequest);

// Bir takip isteğini reddeder
router.post('/requests/:requestId/deny', auth(), followController.denyRequest);

module.exports = router;