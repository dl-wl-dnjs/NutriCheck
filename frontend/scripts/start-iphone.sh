#!/usr/bin/env bash
set -euo pipefail
# Run from repo root: npm run start:device --prefix frontend
# Or: cd frontend && npm run start:device

IP="${EXPO_LAN_IP:-}"
if [[ -z "$IP" ]]; then
  IP=$(ipconfig getifaddr en0 2>/dev/null || true)
fi
if [[ -z "$IP" ]]; then
  IP=$(ipconfig getifaddr en1 2>/dev/null || true)
fi
if [[ -z "$IP" ]]; then
  echo "Could not detect a Wi‑Fi IP (en0/en1). Set EXPO_LAN_IP to your Mac's LAN address, e.g.:" >&2
  echo "  EXPO_LAN_IP=192.168.1.50 npm run start:device" >&2
  exit 1
fi

export EXPO_PUBLIC_API_URL="http://${IP}:8000"
echo ""
echo "  → API for this session: ${EXPO_PUBLIC_API_URL}"
echo "  → Start the API bound to all interfaces, e.g.:"
echo "       uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
echo "  → iPhone: install Expo Go, same Wi‑Fi as this Mac, scan the QR code."
echo ""

exec npx expo start --lan
