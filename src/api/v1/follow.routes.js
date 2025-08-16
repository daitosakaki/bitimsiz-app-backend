const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const followController = require('../../features/users/follow.controller'); // <-- DÜZELTİLDİ

const router = express.Router();

// Giriş yapmış kullanıcının bekleyen takip isteklerini listeler
router.get('/requests/pending', auth(), followController.getPendingRequests);

// Bir takip isteğini onaylar
router.post('/requests/:requestId/approve', auth(), followController.approveRequest);

// Bir takip isteğini reddeder
router.delete('/requests/:requestId/deny', auth(), followController.denyRequest); // Metodu DELETE olarak değiştirmek daha doğru

module.exports = router;