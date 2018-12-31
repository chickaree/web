# Service
FROM node:10
WORKDIR /app
COPY ./ /app
RUN npm --unsafe-perm --production install \
  && npm --production run-script build

CMD ["npm", "--production", "start"]
