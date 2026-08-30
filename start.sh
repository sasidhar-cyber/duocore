#!/bin/bash
set -e

echo "Starting DUOCORE Backend on port 5000..."
(cd backend && npm start) &

echo "Starting DUOCORE Frontend on port 3000..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 3000) &

wait
