const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true, index: true },
    FC tokens: [
          { type: String }
    ],
    phoneNumber: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true }, // sparse: null değerler için unique kuralını esnetir
    password: { type: String, required: true, minlength: 8, private: true },

    // Temel Profil Bilgileri
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    profileImageUrl: { type: String },
    bio: { type: String, trim: true, maxlength: 160 },

    // Rol ve Durum Bilgileri
    role: {
        type: String,
        enum: ['customer', 'seller', 'admin'],
        default: 'customer',
    },
    isVerified: { type: Boolean, default: false }, // E-posta veya telefon doğrulaması değil, 'mavi tik' gibi
    isPrivate: { type: Boolean, default: false },

    // Sosyal Grafik (Denormalize Edilmiş Sayımlar)
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    // E-Ticaret Bilgileri
    // Stripe, Iyzico gibi ödeme sağlayıcısındaki müşteri ID'sini burada saklarız.
    // ASLA kredi kartı bilgisi saklamayın!
    paymentProviderCustomerId: { type: String, private: true },

    // Satıcıya Özel Bilgiler (Sadece rol 'seller' ise doldurulur)
    sellerProfile: {
        shopName: { type: String, trim: true },
        taxId: { type: String, trim: true },
        companyAddress: { type: String, trim: true },
        isApproved: { type: Boolean, default: false }, // Admin onayı
    }
}, { timestamps: true });

// Middleware ve Metodlar (Değişiklik yok)
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

userSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.paymentProviderCustomerId;
    return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;