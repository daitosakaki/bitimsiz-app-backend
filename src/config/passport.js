const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../features/users/user.model');

// JWT'nin header'dan nasıl okunacağını belirleyen seçenekler
const jwtOptions = {
    secretOrKey: process.env.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

// Bu fonksiyon, passport bir token'ı başarıyla doğruladıktan sonra çalışır.
// payload: token içindeki veri (bizim durumumuzda { sub: userId, ... })
// done: bir sonraki adıma geçmek için çağrılan callback fonksiyonu
const jwtVerify = async (payload, done) => {
    try {
        // payload içindeki 'sub' (subject) alanından kullanıcı ID'sini al
        const user = await User.findById(payload.sub);
        if (!user) {
            // Kullanıcı veritabanında bulunamadıysa, kimlik doğrulamayı başarısız olarak bitir.
            return done(null, false);
        }
        // Kullanıcı bulunduysa, kimlik doğrulamayı başarılı olarak bitir ve kullanıcı nesnesini door.
        return done(null, user);
    } catch (error) {
        // Bir veritabanı hatası vb. olursa, hatayı passport'a bildir.
        return done(error, false);
    }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
    jwtStrategy,
};