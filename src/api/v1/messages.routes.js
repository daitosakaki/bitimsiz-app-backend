const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const messageController = require('../../features/messages/message.controller');
// Gerekli validation'ları ekleyebilirsiniz.

const router = express.Router();

router.post(
    '/:messageId/report',
    auth(), // Sadece giriş yapmış kullanıcılar şikayet edebilir
    messageController.reportMessage
);

module.exports = router;