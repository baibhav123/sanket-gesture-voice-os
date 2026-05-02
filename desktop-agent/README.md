# 🤖 SanketX 2047 — Desktop Agent

The Python bridge that lets the **SanketX HUD** (browser) actually **control your laptop** —
open WhatsApp, send messages, launch apps, type, click, take screenshots, control volume,
even shut down the system. All by **voice**.

> Architecture: Browser HUD ⇄ HTTP (`http://localhost:5000/command`) ⇄ Python Agent ⇄ Your OS

---

## ⚡ Quick Start

### Windows
```
Double-click  START.bat
```

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

That's it. The script will:
1. Create a virtual environment (`.venv/`)
2. Install dependencies
3. Launch the agent on `http://localhost:5000`

Then open the **SanketX web app** — the HUD will show a green **DESKTOP LINK · ONLINE** badge,
meaning your browser is now wired to your real laptop. 🟢

---

## 🎙️ Try These Voice Commands

| Say | What happens |
|---|---|
| *"Jarvis, open WhatsApp"* | Launches WhatsApp app/web |
| *"Send hi to +919876543210 on WhatsApp"* | Auto-sends message via WhatsApp Web |
| *"Open Chrome"* | Launches Chrome |
| *"Open YouTube"* | Opens youtube.com |
| *"Play despacito on YouTube"* | YouTube search |
| *"Search for India 2047 vision"* | Google search |
| *"Open VS Code"* | Launches VS Code |
| *"Take a screenshot"* | Saves PNG to home folder |
| *"Volume up"* / *"Volume down"* / *"Mute"* | System volume |
| *"Lock the system"* | Locks the workstation |
| *"Type Vande Mataram"* | Types text into focused window |

---

## 🛠️ Manual Install (if scripts fail)

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Mac/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python agent.py
```

---

## 🔌 HTTP Protocol

The HUD sends JSON over HTTP POST:
```bash
curl -X POST http://localhost:5000/command \
  -H 'Content-Type: application/json' \
  -d '{"command":"open youtube and search cats"}'
```
Agent replies:
```json
{ "ok": true, "action": "youtube", "result": "youtube: cats" }
```

You can also pass a structured action directly:
```json
{ "command": "whatsapp", "phone": "+919876543210", "message": "hi" }
```

**Available actions:** `ping`, `open_app`, `close_app`, `open_url`, `web_search`, `youtube`,
`whatsapp`, `whatsapp_contact`, `type`, `press`, `click`, `move`, `move_norm`, `scroll`,
`screenshot`, `volume`, `system`, `mouse_on`, `mouse_off`.

See `actions.py` to add your own.

---

## ⚠️ Permissions

- **macOS** — Grant Terminal/Python **Accessibility** + **Screen Recording** in
  *System Settings → Privacy & Security*. Otherwise mouse/keyboard control is blocked.
- **Linux (Wayland)** — `pyautogui` works best on **X11**. Wayland may block synthetic input.
- **Windows** — works out of the box. Run as Admin only if controlling elevated apps.
- **WhatsApp auto-send** — requires you to be **already logged into WhatsApp Web** in your default browser.

---

## 🔒 Security

The agent listens **only on localhost** — no external network access. Nothing leaves your machine
unless an action explicitly does so (e.g. opening a URL or sending a WhatsApp message).

---

🇮🇳 *Built for Bharat @ 100. Vande Mataram.*
