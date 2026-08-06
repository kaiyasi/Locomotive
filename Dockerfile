# syntax=docker/dockerfile:1.7

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
ENV DATA_FILE=/app/data/parking.json
CMD ["node", "src/index.js"]
