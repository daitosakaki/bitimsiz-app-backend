# 1. Adım: Temel Node.js imajını seç
# Projenizle uyumlu bir Node.js sürümü kullanın (22-slim iyi bir başlangıç)
FROM node:22-slim

# 2. Adım: Uygulama için çalışma dizini oluştur
# Konteyner içindeki tüm işlemler bu klasörde yapılacak
WORKDIR /app

# 3. Adım: Bağımlılık dosyalarını kopyala
# 'npm install' komutunu sadece bu dosyalar değiştiğinde çalıştırmak performansı artırır
COPY package*.json ./

# 4. Adım: Proje bağımlılıklarını kur
# Sadece production için gerekli paketleri kurar, imaj boyutunu küçültür
RUN npm install --omit=dev

# 5. Adım: Proje dosyalarının geri kalanını kopyala
# Kaynak kodunuzu (src klasörü vb.) konteynere kopyala
COPY . .

# 6. Adım: Uygulamanın çalışacağı portu belirt
# Cloud Run bu portu dinamik olarak ayarlayacaktır
ENV PORT 8080

# 7. Adım: Uygulamayı başlat
# Node.js'e 'src' klasörünün içindeki 'app.js' dosyasını çalıştırmasını söyle
CMD [ "node", "src/app.js" ]