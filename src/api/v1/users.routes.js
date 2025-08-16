const express = require('express');
const auth = require('../../middlewares/auth.middleware'); // Passport versiyonunu import ettiğimizi varsayalım
const userController = require('../../features/users/user.controller');
const { addressValidation } = require('../../features/users/user.validation');
const router = express.Router();

// Bu rota artık korunuyor. Sadece geçerli bir token'a sahip kullanıcılar erişebilir.
// auth() middleware'i başarılı olursa, req.user nesnesi userController.getMe'ye ulaşır.
// Giriş yapmış kullanıcının kendi profilini alması ve güncellemesi için rotalar
router.route('/me')
    .get(auth(), userController.getMe)
    .put(auth(), validate(userValidation.updateUserSchema), userController.updateMe);

// Bir kullanıcıyı takip etme ve takipten çıkma rotaları
// Bu işlemler için giriş yapmış olmak zorunludur.
router.route('/:userId/follow')
    .post(auth(), userController.follow)
    .delete(auth(), userController.unfollow);

// Herhangi bir kullanıcının profilini kullanıcı adına göre getirme rotası
// Bu rota halka açıktır, ancak auth() middleware'i olmadan da çalışabilir.
// Servis katmanındaki gizlilik mantığı korumayı sağlar.
// İsteğe bağlı kimlik doğrulama için auth(true) gibi bir yapı da kurulabilir.
router.get('/@:username', userController.getUserByUsername);

router.route('/me/addresses')
    .get(auth(), userController.getAddresses)
    .post(auth(), validate(addressValidation.addressSchema), userController.addAddress);

router.route('/me/addresses/:addressId')
    .put(auth(), validate(addressValidation.addressSchema), userController.updateAddress)
    .delete(auth(), validate(addressValidation.addressIdSchema), userController.deleteAddress);

module.exports = router;