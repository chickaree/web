FROM node:lts-alpine

ENV PORT 80

COPY . /app

WORKDIR /app

RUN npm install --production --verbose; \
  npm run build;

CMD npm start;
