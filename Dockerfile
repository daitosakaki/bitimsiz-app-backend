# ----------------------------------------------------------------
# 1. AŞAMA: İNŞAATÇI (BUILDER) - Bağımlılıklar kurulur ve kod derlenir
# ----------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /usr/src/app

# Sadece package.json dosyalarını kopyala
COPY package*.json ./

# Hem production hem de development bağımlılıklarını kur (typescript'i kurmak için)
RUN npm install

# Kaynak kodun geri kalanını kopyala
COPY . .

# TypeScript kodunu JavaScript'e derle
# Bu komut package.json dosyanızdaki "build" script'ini çalıştırır
# Genellikle "tsc" komutunu çalıştırarak /dist klasörü oluşturur.
RUN npm run build

# Sadece production bağımlılıklarını yeniden kurarak imaj boyutunu küçült
RUN npm prune --production

# ----------------------------------------------------------------
# 2. AŞAMA: NİHAİ (FINAL) - Sadece çalışan uygulama buraya gelir
# ----------------------------------------------------------------
FROM node:22-slim

WORKDIR /usr/src/app

# "builder" aşamasından SADECE GEREKLİ dosyaları kopyala
# 1. Production node_modules klasörünü kopyala
COPY --from=builder /usr/src/app/node_modules ./node_modules
# 2. Derlenmiş JavaScript kodunun bulunduğu "dist" klasörünü kopyala
COPY --from=builder /usr/src/app/dist ./dist

# Uygulamanın çalışacağı port
ENV PORT 8080

# Uygulamayı, derlenmiş JavaScript dosyasıyla başlat
# Ana dosyanız dist/index.js ise bu satır doğrudur. Farklıysa güncelleyin.
CMD [ "node", "dist/index.js" ]