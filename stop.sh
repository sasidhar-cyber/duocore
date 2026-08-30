#!/bin/bash
echo "🛑 Stopping DUOCORE servers and public tunnels..."
fuser -k 5000/tcp >/dev/null 2>&1 || true
fuser -k 3000/tcp >/dev/null 2>&1 || true
pkill -f cloudflared >/dev/null 2>&1 || true
echo "✓ All DUOCORE servers and tunnels stopped cleanly."
