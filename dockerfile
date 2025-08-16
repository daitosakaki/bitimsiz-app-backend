# ===================================================================
# STAGE 2: Production (Üretim Aşaması)
# ===================================================================
# Daha küçük ve temiz bir Node.js imajıyla yeniden başlıyoruz
FROM node:18-slim

WORKDIR /usr/src/app

# Sadece production için gerekli olan bağımlılıkları bir önceki aşamadan kopyala
# Bu, nihai imajın boyutunu ciddi ölçüde küçültür.
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Uygulama kodunu bir önceki aşamadan kopyala
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./server.js

# Güvenlik: Uygulamayı root yerine daha az yetkili bir 'node' kullanıcısıyla çalıştır
# Bu kullanıcı Node.js imajlarında varsayılan olarak gelir
USER node

# Uygulamanın hangi portu dinlediğini belirt (bilgilendirme amaçlı)
EXPOSE 5000

# Konteyner başladığında çalıştırılacak olan nihai komut
# server.js dosyasının port'u process.env.PORT'tan okuduğundan emin olun.
CMD ["node", "src/server.js"]