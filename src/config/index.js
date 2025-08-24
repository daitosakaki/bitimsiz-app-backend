const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

console.log('************');
console.log(process.env.CORS_ORIGIN);
// Sadece 'production' olmayan ortamlarda .env dosyasını yükle.
if (process.env.NODE_ENV !== 'production') {
  console.log('.env dosyası YÜKLENİYOR...');
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} else {
  console.log('.env dosyası ATLANDI (production ortamı).');
}

// Tüm ortam değişkenlerini Joi ile doğrulayarak bir şema oluşturalım.
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('production'),
    PORT: Joi.number().default(8080),
    MONGODB_URI: Joi.string().required().description('Mongo DB url'),
    REDIS_URL: Joi.string().required().description('Redis url'),
    // ... (diğer değişkenleriniz aynı kalacak)
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_EXPIRES_IN: Joi.string().default('15m').description('minutes for access token'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh secret key'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d').description('days for refresh token'),
    GCS_BUCKET_NAME: Joi.string().required().description('Google Cloud Storage bucket name'),
    CORS_ORIGIN: Joi.string().required().description('Allowed CORS origin'),
    FIREBASE_SERVICE_ACCOUNT_BASE64: Joi.string().required().description('Firebase service account key'),
    PAYMENT_PROVIDER_SECRET_KEY: Joi.string().description('Payment provider secret key'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  console.error('Joi validation hatası oluştu!');
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URI,
    options: {},
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
};