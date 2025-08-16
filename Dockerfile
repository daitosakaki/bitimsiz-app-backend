FROM node:22-slim
>>>>>>> e0142896d269ee625e9f9b965f9fd49104f3a7f2
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./server.js
USER node
EXPOSE 5000
CMD ["node", "src/server.js"]