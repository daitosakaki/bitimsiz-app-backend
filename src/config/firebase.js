const admin = require('firebase-admin');

// Bu fonksiyon, config'den gelen base64 sırrını çözerek Firebase'i başlatır.
const initializeFirebase = (config) => {
    try {
        if (admin.apps.length) {
            return; // Zaten başlatıldıysa tekrar başlatma
        }

        const serviceAccountBase64 = config.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!serviceAccountBase64) {
            throw new Error('Firebase service account key is not configured.');
        }

        const serviceAccountString = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(serviceAccountString);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('Firebase Admin SDK initialized successfully.');

    } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
        // Uygulamanın bu kritik hata durumunda başlamaması için hatayı fırlatabiliriz.
        process.exit(1); 
    }
};

module.exports = initializeFirebase;