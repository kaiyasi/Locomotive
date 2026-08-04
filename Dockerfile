# syntax=docker/dockerfile:1.7

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY app ./app
ENV NODE_ENV=production
ENV APP_PORT=3000
EXPOSE 3000
CMD ["sh", "-lc", "node app/server.js"]
