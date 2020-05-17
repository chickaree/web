FROM node:lts-alpine

COPY . /app

WORKDIR /app

RUN npm install --production --verbose; \
  npm run build;

CMD npm start;
