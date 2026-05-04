"""
SanketX 2047 — Desktop Agent (HTTP/Flask edition)
Endpoint: POST http://localhost:5000/command   { "command": "<text>", ...params }
          GET  http://localhost:5000/ping
"""
import sys
import re
import traceback
from datetime import datetime

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("[!] Missing deps. Run:  pip install -r requirements.txt")
    sys.exit(1)

from actions import execute_action, ACTION_REGISTRY

HOST = "0.0.0.0"
PORT = 5000
VERSION = "2047.2.0"

app = Flask(__name__)
CORS(app)  # allow browser → localhost


def log(kind, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {kind:<6} {msg}")


# ---------- Natural-language → action parser ----------
def parse_command(text: str):
    """Map a free-form spoken command to (action, params).
    Returns None if the input is already a known action keyword."""
    t = (text or "").strip().lower()
    if not t:
        return None

    # Direct action keyword (matches ACTION_REGISTRY)
    if t in ACTION_REGISTRY:
        return (t, {})

    # Mouse / camera control
    if re.match(r"mouse[_ ]on|enable mouse|start mouse", t):
        return ("mouse_on", {})
    if re.match(r"mouse[_ ]off|disable mouse|stop mouse", t):
        return ("mouse_off", {})

    # Screenshot
    if "screenshot" in t or "capture screen" in t:
        return ("screenshot", {})

    # Volume
    m = re.search(r"volume\s+(up|down|mute)", t)
    if m:
        return ("volume", {"direction": m.group(1), "times": 5})

    # Scroll
    if "scroll up" in t:
        return ("scroll", {"amount": 400})
    if "scroll down" in t:
        return ("scroll", {"amount": -400})

    # System actions
    m = re.search(r"(lock|sleep|shutdown|shut down|restart)\s+(?:the\s+)?(?:system|laptop|computer|pc)?", t)
    if m:
        return ("system", {"what": m.group(1).replace(" ", "")})

    # WhatsApp: "send whatsapp <msg> to <name|phone>"
    m = re.search(r"(?:send\s+)?whatsapp\s+(.+?)\s+to\s+(.+)$", t)
    if m:
        message, target = m.group(1).strip(), m.group(2).strip()
        if re.match(r"\+?\d[\d\s-]{6,}", target):
            return ("whatsapp", {"phone": target.replace(" ", "").replace("-", ""), "message": message})
        return ("whatsapp_contact", {"name": target, "message": message})
    m = re.search(r"open\s+whatsapp\s+(?:and\s+)?send\s+(.+?)\s+to\s+(.+)$", t)
    if m:
        message, target = m.group(1).strip(), m.group(2).strip()
        if re.match(r"\+?\d[\d\s-]{6,}", target):
            return ("whatsapp", {"phone": target.replace(" ", "").replace("-", ""), "message": message})
        return ("whatsapp_contact", {"name": target, "message": message})

    # YouTube: "youtube search cats" / "open youtube and search cats" / "play <q> on youtube"
    m = re.search(r"youtube\s+search\s+(.+)", t) \
        or re.search(r"open\s+youtube\s+and\s+search\s+(.+)", t) \
        or re.search(r"play\s+(.+?)\s+on\s+youtube", t) \
        or re.search(r"youtube\s+(.+)", t)
    if m:
        return ("youtube", {"query": m.group(1).strip()})

    # URL
    m = re.search(r"(?:open|go to|visit)\s+((?:https?://)?[\w.-]+\.[a-z]{2,}(?:/\S*)?)", t)
    if m:
        return ("open_url", {"url": m.group(1)})

    # Open app — anything after "open|launch|start"
    m = re.search(r"(?:open|launch|start|run)\s+([a-z0-9 ]+)", t)
    if m:
        name = m.group(1).strip().split()[0]
        return ("open_app", {"name": name})

    # Web search
    m = re.search(r"(?:search|google|find)\s+(?:for\s+)?(.+)", t)
    if m:
        return ("web_search", {"query": m.group(1).strip()})

    # Type
    m = re.search(r"(?:type|write)\s+(.+)", t)
    if m:
        return ("type", {"text": m.group(1)})

    return None


# ---------- HTTP endpoints ----------
@app.route("/ping", methods=["GET"])
def ping_route():
    return jsonify({"ok": True, "agent": "sanketx-desktop", "version": VERSION,
                    "actions": list(ACTION_REGISTRY.keys())})


@app.route("/command", methods=["POST", "OPTIONS"])
def command_route():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    raw = (data.get("command") or "").strip()
    if not raw:
        return jsonify({"ok": False, "error": "command required"}), 400

    # If the command name matches a registered action, treat the rest of the
    # JSON body as its params. Otherwise, parse the free-form sentence.
    if raw in ACTION_REGISTRY:
        action, params = raw, {k: v for k, v in data.items() if k != "command"}
        return _run_single(action, params)

    # Compound command splitting: "open instagram and open facebook", "x then y"
    parts = re.split(r"\s+(?:and then|then|and|,)\s+", raw.lower())
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) > 1:
        results = []
        for p in parts:
            parsed = parse_command(p)
            if not parsed:
                results.append({"part": p, "ok": False, "error": "unknown"})
                continue
            a, pr = parsed
            log("CMD", f"(multi) {a}  {pr}")
            try:
                r = execute_action(a, pr)
                log("OK", f"{a} -> {r}")
                results.append({"part": p, "ok": True, "action": a, "result": r})
            except Exception as e:
                err = f"{type(e).__name__}: {e}"
                log("ERR", err)
                results.append({"part": p, "ok": False, "action": a, "error": err})
        return jsonify({"ok": True, "multi": True, "results": results})

    parsed = parse_command(raw)
    if not parsed:
        return jsonify({"ok": False, "error": f"unknown command: {raw}"}), 400
    action, params = parsed
    for k, v in data.items():
        if k != "command" and k not in params:
            params[k] = v
    return _run_single(action, params)


def _run_single(action, params):

    noisy = action in {"move_norm", "move_rel", "move", "click"}
    if not noisy:
        log("CMD", f"{action}  {params}")
    try:
        result = execute_action(action, params)
        if not noisy:
            log("OK", f"{action} -> {result}")
        return jsonify({"ok": True, "action": action, "result": result})
    except Exception as e:
        err = f"{type(e).__name__}: {e}"
        if not noisy:
            log("ERR", err)
            traceback.print_exc()
        return jsonify({"ok": False, "action": action, "error": err}), 500


def banner():
    print("=" * 60)
    print(f"  SANKETX 2047  ::  DESKTOP AGENT  ::  v{VERSION}")
    print("=" * 60)
    print(f"  HTTP   http://localhost:{PORT}/command")
    print(f"  Ping   http://localhost:{PORT}/ping")
    print(f"  Caps   {len(ACTION_REGISTRY)} actions registered")
    print("  Open the SanketX web app — HUD will auto-link.")
    print("  Press CTRL+C to shut down.")
    print("=" * 60)


if __name__ == "__main__":
    banner()
    try:
        app.run(host=HOST, port=PORT, threaded=True, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n[+] Agent shutdown. Jai Hind. 🇮🇳")
