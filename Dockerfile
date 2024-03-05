ARG BASE="node:16-alpine"

FROM --platform=$BUILDPLATFORM ${BASE} AS builder

COPY . /app

WORKDIR /app

RUN npm install --unsafe-perm --verbose; \
  npm run build;

FROM ${BASE} AS server

EXPOSE 80

ENV PORT 80

COPY --from=builder /app /app

WORKDIR /app

CMD npm start;
