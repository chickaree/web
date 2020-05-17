FROM node:lts-alpine

COPY . /app

WORKDIR /app

RUN npm install --production --verbose;

CMD npm start;
