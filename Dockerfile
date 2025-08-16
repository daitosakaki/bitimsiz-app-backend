# ----------------------------------------------------------------
# 1. AŞAMA: İNŞAATÇI (BUILDER) - Bağımlılıklar burada kurulur
# BU SATIR ÇOK ÖNEMLİ: Aşamayı "builder" olarak isimlendiriyoruz
# ----------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /usr/src/app

# Sadece package.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları kur (production bağımlılıkları yeterliyse --omit=dev kullan)
RUN npm install

# Kaynak kodun geri kalanını kopyala
COPY . .

# Eğer projenizde bir build adımı varsa (TypeScript, React vs. için)
# RUN npm run build

# ----------------------------------------------------------------
# 2. AŞAMA: NİHAİ (FINAL) - Sadece gerekli dosyalar buraya gelir
# ----------------------------------------------------------------
FROM node:22-slim

WORKDIR /usr/src/app

# ÖNCEKİ "builder" AŞAMASINDAN SADECE GEREKLİ DOSYALARI KOPYALA
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Eğer bir build adımınız varsa, build çıktısını kopyalayın
# COPY --from=builder /usr/src/app/dist ./dist
# Eğer build adımınız yoksa, kaynak kodun tamamını kopyalayın
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./server.js

# Uygulamanın çalışacağı port
ENV PORT 8080

# Uygulamayı başlat
CMD [ "node", "server.js" ]