# Stage 1: Build Frontend
FROM node:20-bullseye-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-bullseye-slim AS backend-builder
WORKDIR /app/backend
RUN apt-get update && apt-get install -y python3 make g++ gcc curl && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm install --production
RUN npm rebuild better-sqlite3
RUN mkdir -p bin && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp && chmod +x bin/yt-dlp
COPY backend/ ./

# Stage 3: Production Runtime
FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update && apt-get install -y python3 ca-certificates curl && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY --from=backend-builder /app/backend /app/backend

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.js"]
