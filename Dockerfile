# Service
FROM node:10

# Development Tools
RUN apt-get update && apt-get install -y \
		  sqlite3 \
    --no-install-recommends && rm -r /var/lib/apt/lists/*

WORKDIR /app

COPY ./ /app

RUN npm --unsafe-perm --production install \
  && npm --production run-script build

CMD ["npm", "--production", "start"]
