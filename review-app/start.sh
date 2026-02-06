#!/bin/bash
# BLE Post Review Dashboard launcher

PORT=3847
DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill any existing instance
lsof -ti:$PORT 2>/dev/null | xargs kill 2>/dev/null

# Start server in background
cd "$DIR"
nohup node server.js > /tmp/ble-review.log 2>&1 &

# Wait for server to be ready
for i in {1..10}; do
  curl -s http://localhost:$PORT > /dev/null 2>&1 && break
  sleep 0.5
done

# Open in browser
open "http://localhost:$PORT"

echo "BLE Review Dashboard running at http://localhost:$PORT"
echo "Logs: /tmp/ble-review.log"
echo "To stop: kill \$(lsof -ti:$PORT)"
