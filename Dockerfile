FROM node:20-alpine

WORKDIR /app

# install deps first for better layer caching
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# copy source
COPY server.js extract.js ./
COPY views ./views

# 'data' directory is mounted as a persistent volume in Coolify
RUN mkdir -p /app/data

# Build template + initial content from views/original.html on first build.
# At runtime, /app/data is volume-mounted; we copy the seed JSON only if
# the volume is empty so admin edits survive redeploys.
RUN node extract.js && cp data/content.json /app/seed-content.json

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Seed data volume on first run, then start
CMD ["sh", "-c", "[ -f /app/data/content.json ] || cp /app/seed-content.json /app/data/content.json; node server.js"]
