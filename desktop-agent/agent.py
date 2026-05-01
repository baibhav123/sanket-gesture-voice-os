"""
SanketX 2047 — Desktop Agent
WebSocket bridge between the SanketX HUD (browser) and your real laptop.

Run:   python agent.py
Then open the SanketX web app — the HUD will auto-connect to ws://localhost:8765
"""
import asyncio
import json
import sys
import traceback
from datetime import datetime

try:
    import websockets
except ImportError:
    print("[!] Missing deps. Run:  pip install -r requirements.txt")
    sys.exit(1)

from actions import execute_action, ACTION_REGISTRY

HOST = "localhost"
PORT = 8765
VERSION = "2047.1.0"


def banner():
    print("=" * 60)
    print("  SANKETX 2047  ::  DESKTOP AGENT  ::  v" + VERSION)
    print("=" * 60)
    print(f"  Listening on  ws://{HOST}:{PORT}")
    print(f"  Capabilities  {', '.join(ACTION_REGISTRY.keys())}")
    print("  Open the SanketX web app — HUD will auto-link.")
    print("  Press CTRL+C to shut down.")
    print("=" * 60)


def log(kind: str, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {kind:<8} {msg}")


async def handle_client(ws):
    log("LINK", f"HUD connected from {ws.remote_address}")
    await ws.send(json.dumps({
        "type": "hello",
        "agent": "sanketx-desktop",
        "version": VERSION,
        "actions": list(ACTION_REGISTRY.keys()),
    }))
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "error": "invalid json"}))
                continue

            action = msg.get("action")
            params = msg.get("params", {}) or {}
            req_id = msg.get("id")
            log("CMD", f"{action}  {params}")

            try:
                result = await asyncio.get_event_loop().run_in_executor(
                    None, execute_action, action, params
                )
                await ws.send(json.dumps({
                    "type": "result", "id": req_id,
                    "action": action, "ok": True, "result": result,
                }))
                log("OK", f"{action} -> {result}")
            except Exception as e:
                err = f"{type(e).__name__}: {e}"
                log("ERR", err)
                await ws.send(json.dumps({
                    "type": "result", "id": req_id,
                    "action": action, "ok": False, "error": err,
                }))
    except websockets.ConnectionClosed:
        pass
    except Exception:
        traceback.print_exc()
    finally:
        log("LINK", "HUD disconnected")


async def main():
    banner()
    async with websockets.serve(handle_client, HOST, PORT, max_size=2**20):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[+] Agent shutdown. Jai Hind. 🇮🇳")
