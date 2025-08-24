const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

if (process.env.NODE_ENV !== 'production') {
  // .env dosyasını projenin ana dizininde ara ve yükle
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}
// Tüm ortam değişkenlerini Joi ile doğrulayarak bir şema oluşturalım.
// Bu, eksik veya yanlış formatta bir değişken olduğunda uygulamanın
// anlamlı bir hatayla başlamasını sağlar.
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(8080),
    MONGODB_URI: Joi.string().required().description('Mongo DB url'),
    REDIS_URL: Joi.string().required().description('Redis url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_EXPIRES_IN: Joi.string().default('15m').description('minutes for access token'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh secret key'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d').description('days for refresh token'),
    GCS_BUCKET_NAME: Joi.string().required().description('Google Cloud Storage bucket name'),
    // Diğer zorunlu olmayan değişkenler buraya .optional() ile eklenebilir.
    PAYMENT_PROVIDER_SECRET_KEY: Joi.string().description('Payment provider secret key'),
    FIREBASE_SERVICE_ACCOUNT_BASE64: Joi.string().required().description('Firebase service account key'),
  })
  .unknown(); // Bilinmeyen değişkenlere izin ver (örn: FIREBASE_... gibi)

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Tüm yapılandırmayı tek bir nesne altında export edelim
module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URI,
    options: {
      // MongoDB ayarları (gerekirse)
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    },
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  gcs: {
    bucketName: envVars.GCS_BUCKET_NAME,
  },
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  FIREBASE_SERVICE_ACCOUNT_BASE64: envVars.FIREBASE_SERVICE_ACCOUNT_BASE64,
  // Diğer konfigürasyonlar da bu nesneye eklenebilir
};