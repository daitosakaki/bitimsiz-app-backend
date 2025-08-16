const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    addressTitle: { type: String, required: true, trim: true }, // 'Ev Adresim', 'İş Adresim' vb.
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'Türkiye' },
    province: { type: String, required: true, trim: true }, // İl
    district: { type: String, required: true, trim: true }, // İlçe
    neighbourhood: { type: String, trim: true }, // Mahalle
    street: { type: String, trim: true },
    fullAddress: { type: String, required: true, trim: true }, // Açık adres
    postalCode: { type: String, trim: true },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
}, {
    timestamps: true,
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;