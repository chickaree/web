FROM node:lts-alpine

ENV PORT 80

COPY . /app

WORKDIR /app

RUN npm install --unsafe-perm --verbose; \
  npm run build;

CMD npm start;
