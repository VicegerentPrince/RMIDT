#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RMIDT — Real-time Market Intelligence & Decision Twin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Backend setup ─────────────────────────────────────────────────────────────

if [ ! -f "$BACKEND/.env" ]; then
  echo "⚠  $BACKEND/.env not found — copy .env.example and fill in your keys:"
  echo "   cp backend/.env.example backend/.env"
  echo ""
fi

echo "▸ Installing Python dependencies..."
cd "$BACKEND"
pip install -q -r requirements.txt
echo "  Dependencies installed"

echo "▸ Starting FastAPI backend on :8000..."
python3 -m uvicorn main:app --reload --port 8000 --log-level info &
BACKEND_PID=$!

# ── Frontend setup ────────────────────────────────────────────────────────────

echo ""
echo "▸ Starting Next.js frontend on :3000..."
cd "$FRONTEND"
pnpm dev &
FRONTEND_PID=$!

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend   →  http://localhost:3000"
echo "  Backend    →  http://localhost:8000"
echo "  API Docs   →  http://localhost:8000/docs"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C and kill both
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
