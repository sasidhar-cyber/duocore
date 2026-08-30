#!/bin/bash
echo "=============================================="
echo "🚀 STARTING DUOCORE SQUAD PLATFORM..."
echo "=============================================="

# 1. Kill any existing ports
fuser -k 5000/tcp >/dev/null 2>&1 || true
fuser -k 3000/tcp >/dev/null 2>&1 || true

# 2. Start Backend Server
echo "📡 Starting Backend Server on http://localhost:5000..."
node /home/sasidhar/Projects/duocore/backend/src/server.js > /tmp/duocore-backend.log 2>&1 &
BACKEND_PID=$!

# 3. Start Frontend Dev Server
echo "⚡ Starting Frontend UI on http://localhost:3000..."
cd /home/sasidhar/Projects/duocore/frontend && npx vite --host 0.0.0.0 --port 3000 > /tmp/duocore-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

# 4. Start Cloudflare Tunnel for Public Mobile/Web Access
echo "🌐 Starting Cloudflare Public Tunnel..."
/home/sasidhar/Projects/duocore/cloudflared tunnel --protocol http2 --url http://localhost:3000
