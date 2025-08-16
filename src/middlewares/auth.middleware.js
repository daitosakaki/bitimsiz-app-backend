const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Passport'un 'jwt' stratejisini kullanarak kimlik doğrulama yapan bir middleware.
 */
const auth = () => async (req, res, next) => {
    return new Promise((resolve, reject) => {
        // session: false -> Cookie tabanlı oturumlar kullanmadığımızı belirtir.
        passport.authenticate('jwt', { session: false }, (err, user, info) => {
            if (err || info || !user) {
                // Hata varsa veya kullanıcı bulunamadıysa, 401 hatası oluştur
                return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
            }
            
            // Kimlik doğrulama başarılı, kullanıcıyı req nesnesine ekle
            req.user = user;
            
            resolve();
        })(req, res, next);
    })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;