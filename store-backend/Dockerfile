FROM node:22-bookworm

WORKDIR /app

COPY . .

RUN npm install

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
