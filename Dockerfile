FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/app/server/data

EXPOSE 8787

VOLUME ["/app/server/data"]

CMD ["npm", "start"]
