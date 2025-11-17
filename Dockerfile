FROM node:18-alpine

RUN apk add --no-cache \
    openssl \
    libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install 
COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
