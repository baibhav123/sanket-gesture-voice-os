#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "============================================================"
echo "  SANKETX 2047  ::  DESKTOP AGENT BOOTSTRAP"
echo "============================================================"
if ! command -v python3 >/dev/null 2>&1; then
  echo "[!] python3 not found. Install Python 3.9+ first."
  exit 1
fi
if [ ! -d ".venv" ]; then
  echo "[+] Creating virtual environment..."
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
echo "[+] Installing dependencies..."
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
echo "[+] Launching agent..."
python agent.py
