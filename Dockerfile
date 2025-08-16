FROM node:18-slim
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./server.js
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]