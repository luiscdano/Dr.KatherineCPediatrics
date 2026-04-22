FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "server/index.mjs"]
