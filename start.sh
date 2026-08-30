#!/bin/bash
echo "=============================================="
echo "🚀 STARTING DUOCORE SQUAD PLATFORM (PROD ENGINE)..."
echo "=============================================="

# 1. Kill any existing ports
fuser -k 5000/tcp >/dev/null 2>&1 || true
fuser -k 3000/tcp >/dev/null 2>&1 || true

# 2. Start Backend Server
echo "📡 Starting Backend Server on http://localhost:5000..."
node /home/sasidhar/Projects/duocore/backend/src/server.js > /tmp/duocore-backend.log 2>&1 &
BACKEND_PID=$!

# 3. Build & Start Production Frontend Server
echo "⚡ Building & Starting Frontend UI on http://localhost:3000..."
cd /home/sasidhar/Projects/duocore/frontend && npm run build && npx vite preview --host 0.0.0.0 --port 3000 > /tmp/duocore-frontend.log 2>&1 &
FRONTEND_PID=$!

# Trap signals to clean up background processes when script exits
trap "kill -9 $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM EXIT

sleep 3

# 4. Start Cloudflare Tunnel for Public Mobile/Web Access
echo "🌐 Starting Cloudflare Public Tunnel..."
/home/sasidhar/Projects/duocore/cloudflared tunnel --url http://127.0.0.1:3000

