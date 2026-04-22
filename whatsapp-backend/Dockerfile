FROM node:20-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY .env.example ./.env.example
RUN mkdir -p logs

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
