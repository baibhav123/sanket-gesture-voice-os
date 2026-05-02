"""
SanketX 2047 — Desktop action handlers.
"""
import os
import sys
import time
import shutil
import platform
import subprocess
import webbrowser
from urllib.parse import quote

try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.03
    HAS_PYAUTOGUI = True
except Exception:
    HAS_PYAUTOGUI = False

try:
    import pywhatkit
    HAS_PYWHATKIT = True
except Exception:
    HAS_PYWHATKIT = False

try:
    import pyperclip
    HAS_CLIP = True
except Exception:
    HAS_CLIP = False

IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"
IS_LINUX = platform.system() == "Linux"


# ---------- App registry ----------
# Each entry: native binary candidates per OS + fallback URL
APP_REGISTRY = {
    "whatsapp":  {"win": ["whatsapp"], "mac": ["WhatsApp"], "linux": ["whatsapp-desktop"], "url": "https://web.whatsapp.com"},
    "youtube":   {"win": [], "mac": [], "linux": [], "url": "https://youtube.com"},
    "facebook":  {"win": [], "mac": [], "linux": [], "url": "https://facebook.com"},
    "instagram": {"win": [], "mac": [], "linux": [], "url": "https://instagram.com"},
    "twitter":   {"win": [], "mac": [], "linux": [], "url": "https://twitter.com"},
    "x":         {"win": [], "mac": [], "linux": [], "url": "https://x.com"},
    "linkedin":  {"win": [], "mac": [], "linux": [], "url": "https://linkedin.com"},
    "gmail":     {"win": [], "mac": [], "linux": [], "url": "https://mail.google.com"},
    "github":    {"win": ["github"], "mac": ["GitHub Desktop"], "linux": [], "url": "https://github.com"},
    "chatgpt":   {"win": [], "mac": [], "linux": [], "url": "https://chat.openai.com"},
    "chrome":    {"win": ["chrome"], "mac": ["Google Chrome"], "linux": ["google-chrome", "chromium"], "url": "https://google.com"},
    "firefox":   {"win": ["firefox"], "mac": ["Firefox"], "linux": ["firefox"], "url": "https://mozilla.org"},
    "edge":      {"win": ["msedge"], "mac": ["Microsoft Edge"], "linux": ["microsoft-edge"], "url": "https://bing.com"},
    "vscode":    {"win": ["code"], "mac": ["Visual Studio Code"], "linux": ["code"], "url": "https://vscode.dev"},
    "code":      {"win": ["code"], "mac": ["Visual Studio Code"], "linux": ["code"], "url": "https://vscode.dev"},
    "antigravity": {"win": ["antigravity"], "mac": ["Antigravity"], "linux": ["antigravity"], "url": "https://antigravity.google.com"},
    "notepad":   {"win": ["notepad"], "mac": ["TextEdit"], "linux": ["gedit"]},
    "calculator":{"win": ["calc"], "mac": ["Calculator"], "linux": ["gnome-calculator"]},
    "calc":      {"win": ["calc"], "mac": ["Calculator"], "linux": ["gnome-calculator"]},
    "explorer":  {"win": ["explorer"], "mac": ["Finder"], "linux": ["nautilus"]},
    "finder":    {"win": ["explorer"], "mac": ["Finder"], "linux": ["nautilus"]},
    "terminal":  {"win": ["wt", "cmd"], "mac": ["Terminal"], "linux": ["gnome-terminal", "konsole", "xterm"]},
    "spotify":   {"win": ["spotify"], "mac": ["Spotify"], "linux": ["spotify"], "url": "https://open.spotify.com"},
    "discord":   {"win": ["discord"], "mac": ["Discord"], "linux": ["discord"], "url": "https://discord.com/app"},
    "slack":     {"win": ["slack"], "mac": ["Slack"], "linux": ["slack"], "url": "https://app.slack.com"},
    "telegram":  {"win": ["telegram"], "mac": ["Telegram"], "linux": ["telegram-desktop"], "url": "https://web.telegram.org"},
    "zoom":      {"win": ["zoom"], "mac": ["zoom.us"], "linux": ["zoom"], "url": "https://zoom.us"},
}


def _platform_key():
    if IS_WINDOWS: return "win"
    if IS_MAC: return "mac"
    return "linux"


def _try_launch_native(name):
    """Returns True if a native app was successfully launched."""
    if name == "whatsapp" and _open_whatsapp_native():
        return True

    entry = APP_REGISTRY.get(name, {})
    candidates = entry.get(_platform_key(), [])
    for cand in candidates:
        try:
            if IS_WINDOWS:
                # `start` returns 0 even if not found; check via `where`
                where = subprocess.run(f'where {cand}', shell=True, capture_output=True, text=True)
                if where.returncode == 0 or cand in ("explorer", "calc", "notepad", "wt", "cmd"):
                    subprocess.Popen(f'start "" {cand}', shell=True)
                    return True
            elif IS_MAC:
                # `open -a` returns non-zero if app not found
                r = subprocess.run(["open", "-a", cand], capture_output=True)
                if r.returncode == 0:
                    return True
            else:
                if shutil.which(cand):
                    subprocess.Popen([cand])
                    return True
        except Exception:
            continue
    return False


def _open_whatsapp_native() -> bool:
    """Open WhatsApp Desktop only. If no native URI handler exists, return False."""
    try:
        if IS_WINDOWS:
            os.startfile("whatsapp://")
            return True
        if IS_MAC:
            return subprocess.run(["open", "whatsapp://"], capture_output=True).returncode == 0
        return subprocess.run(["xdg-open", "whatsapp://"], capture_output=True).returncode == 0
    except Exception:
        return False


def open_app(params):
    """Smart launch: try native app first; fall back to website if available."""
    name = (params.get("name") or "").strip().lower()
    if not name:
        raise ValueError("app name required")

    if _try_launch_native(name):
        return f"launched {name} (native)"

    entry = APP_REGISTRY.get(name, {})
    url = entry.get("url")
    if url:
        webbrowser.open(url)
        return f"opened {name} in browser ({url})"

    # Last resort: try as raw command
    try:
        if IS_WINDOWS:
            subprocess.Popen(f'start "" {name}', shell=True)
        elif IS_MAC:
            subprocess.Popen(["open", "-a", name])
        else:
            subprocess.Popen([name])
        return f"attempted launch: {name}"
    except Exception:
        # final fallback — google search
        webbrowser.open(f"https://www.google.com/search?q={quote(name)}")
        return f"no app found, searched google for {name}"


def close_app(params):
    name = (params.get("name") or "").strip().lower()
    if IS_WINDOWS:
        subprocess.Popen(f'taskkill /F /IM {name}.exe', shell=True)
    elif IS_MAC:
        subprocess.Popen(["pkill", "-x", name])
    else:
        subprocess.Popen(["pkill", "-f", name])
    return f"closed {name}"


# ---------- Web ----------

def open_url(params):
    url = params.get("url", "").strip()
    if not url:
        raise ValueError("url required")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"opened {url}"


def web_search(params):
    q = params.get("query", "").strip()
    if not q:
        raise ValueError("query required")
    webbrowser.open(f"https://www.google.com/search?q={quote(q)}")
    return f"searched: {q}"


def youtube_play(params):
    q = params.get("query", "").strip()
    if not q:
        raise ValueError("query required")
    webbrowser.open(f"https://www.youtube.com/results?search_query={quote(q)}")
    return f"youtube: {q}"


# ---------- WhatsApp ----------

def _whatsapp_native(phone: str, message: str) -> bool:
    """Open the WhatsApp DESKTOP app via the whatsapp:// URI. Returns True if launched."""
    uri = f"whatsapp://send?phone={quote(phone)}&text={quote(message)}"
    try:
        if IS_WINDOWS:
            os.startfile(uri)  # opens registered handler (WhatsApp desktop)
            return True
        elif IS_MAC:
            r = subprocess.run(["open", uri], capture_output=True)
            return r.returncode == 0
        else:
            r = subprocess.run(["xdg-open", uri], capture_output=True)
            return r.returncode == 0
    except Exception:
        return False


def whatsapp_contact(params):
    """Open WhatsApp Desktop, search a contact/business name, paste message, and send."""
    name = (params.get("name") or "").strip()
    message = (params.get("message") or "").strip()
    if not name:
        raise ValueError("contact name required")
    if not _open_whatsapp_native():
        raise RuntimeError("WhatsApp Desktop app not found. Install/login to WhatsApp Desktop first.")
    _need_pyauto()
    time.sleep(float(params.get("open_wait", 3.0)))
    if IS_MAC:
        pyautogui.hotkey("command", "n")
    else:
        pyautogui.hotkey("ctrl", "n")
    time.sleep(0.3)
    if HAS_CLIP:
        pyperclip.copy(name)
        pyautogui.hotkey("command", "v") if IS_MAC else pyautogui.hotkey("ctrl", "v")
    else:
        pyautogui.typewrite(name, interval=0.02)
    time.sleep(float(params.get("search_wait", 1.2)))
    pyautogui.press("enter")
    time.sleep(0.8)
    if message:
        if HAS_CLIP:
            pyperclip.copy(message)
            pyautogui.hotkey("command", "v") if IS_MAC else pyautogui.hotkey("ctrl", "v")
        else:
            pyautogui.typewrite(message, interval=0.02)
        time.sleep(0.2)
        pyautogui.press("enter")
    return f"whatsapp contact -> {name}"


def whatsapp_send(params):
    phone = params.get("phone", "").strip()
    message = params.get("message", "").strip()
    if not phone:
        raise ValueError("phone required")

    # 1) Try native WhatsApp Desktop first (whatsapp:// URI scheme)
    if _whatsapp_native(phone, message):
        time.sleep(2.5)
        # Press Enter to actually send the prefilled message
        if HAS_PYAUTOGUI and message:
            try:
                pyautogui.press("enter")
            except Exception:
                pass
        return f"whatsapp(native) -> {phone}"

    # 2) Fallback to WhatsApp Web via pywhatkit (auto-send + tab close)
    if HAS_PYWHATKIT and message:
        wait = int(params.get("wait", 15))
        pywhatkit.sendwhatmsg_instantly(phone, message, wait_time=wait, tab_close=True)
        return f"whatsapp(web) -> {phone}"

    # 3) Last resort: just open web with prefilled text
    url = f"https://web.whatsapp.com/send?phone={quote(phone)}&text={quote(message)}"
    webbrowser.open(url)
    return "opened WhatsApp Web"


# ---------- Mouse / Keyboard ----------

def _need_pyauto():
    if not HAS_PYAUTOGUI:
        raise RuntimeError("pyautogui not installed")


def type_text(params):
    _need_pyauto()
    text = params.get("text", "")
    interval = float(params.get("interval", 0.015))
    pyautogui.typewrite(text, interval=interval)
    return f"typed {len(text)} chars"


def press_key(params):
    _need_pyauto()
    key = params.get("key", "")
    if isinstance(key, list):
        pyautogui.hotkey(*key)
    else:
        pyautogui.press(key)
    return f"pressed {key}"


def mouse_click(params):
    _need_pyauto()
    x = params.get("x"); y = params.get("y")
    button = params.get("button", "left")
    if x is not None and y is not None:
        pyautogui.click(x=int(x), y=int(y), button=button)
    else:
        pyautogui.click(button=button)
    return "clicked"


def mouse_move(params):
    _need_pyauto()
    x = int(params.get("x", 0))
    y = int(params.get("y", 0))
    duration = float(params.get("duration", 0.15))
    pyautogui.moveTo(x, y, duration=duration)
    return f"moved to {x},{y}"


def mouse_move_rel(params):
    """Relative mouse move — used by hand-gesture cursor."""
    _need_pyauto()
    dx = float(params.get("dx", 0))
    dy = float(params.get("dy", 0))
    pyautogui.moveRel(dx, dy, duration=0)
    return f"rel {dx},{dy}"


def mouse_move_norm(params):
    """Absolute move using normalized 0..1 coordinates → real screen size.
    Used for accurate hand-tracking of the laptop's real mouse cursor."""
    _need_pyauto()
    nx = float(params.get("nx", 0.5))
    ny = float(params.get("ny", 0.5))
    sw, sh = pyautogui.size()
    margin = int(params.get("margin", 2))
    x = int(max(0, min(1, nx)) * max(1, sw - 1 - margin * 2) + margin)
    y = int(max(0, min(1, ny)) * max(1, sh - 1 - margin * 2) + margin)
    pyautogui.moveTo(x, y, duration=float(params.get("duration", 0)))
    return f"abs {x},{y}"


def scroll(params):
    _need_pyauto()
    amount = int(params.get("amount", -300))
    pyautogui.scroll(amount)
    return f"scrolled {amount}"


# ---------- Clipboard / Code ----------

def write_code(params):
    """
    Type code into the focused window (e.g. VS Code, Antigravity).
    params: { code: '...', mode: 'type'|'paste' }
    """
    _need_pyauto()
    code = params.get("code", "")
    mode = params.get("mode", "type")

    if mode == "paste" and HAS_CLIP:
        pyperclip.copy(code)
        time.sleep(0.2)
        # Cmd+V on mac, Ctrl+V elsewhere
        if IS_MAC:
            pyautogui.hotkey("command", "v")
        else:
            pyautogui.hotkey("ctrl", "v")
        return f"pasted {len(code)} chars"

    # Default: real keystroke typing (works in all editors)
    # Use clipboard paste for big payloads to avoid keyboard-layout issues
    if HAS_CLIP and len(code) > 200:
        pyperclip.copy(code)
        time.sleep(0.2)
        if IS_MAC:
            pyautogui.hotkey("command", "v")
        else:
            pyautogui.hotkey("ctrl", "v")
        return f"pasted {len(code)} chars"

    pyautogui.typewrite(code, interval=0.005)
    return f"typed {len(code)} chars"


def clipboard_set(params):
    if not HAS_CLIP:
        raise RuntimeError("pyperclip not installed")
    text = params.get("text", "")
    pyperclip.copy(text)
    return f"clipboard set ({len(text)} chars)"


def clipboard_get(_params):
    if not HAS_CLIP:
        raise RuntimeError("pyperclip not installed")
    return pyperclip.paste()


# ---------- System ----------

def screenshot(params):
    _need_pyauto()
    path = params.get("path") or os.path.expanduser(f"~/sanketx_{int(time.time())}.png")
    img = pyautogui.screenshot()
    img.save(path)
    return f"saved {path}"


def volume(params):
    _need_pyauto()
    direction = params.get("direction", "up")
    times = int(params.get("times", 5))
    key = "volumeup" if direction == "up" else "volumedown" if direction == "down" else "volumemute"
    for _ in range(times):
        pyautogui.press(key)
    return f"volume {direction} x{times}"


def system_action(params):
    what = params.get("what", "").lower()
    if IS_WINDOWS:
        cmds = {
            "lock": "rundll32.exe user32.dll,LockWorkStation",
            "shutdown": "shutdown /s /t 5",
            "restart": "shutdown /r /t 5",
            "sleep": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
        }
    elif IS_MAC:
        cmds = {
            "lock": "pmset displaysleepnow",
            "shutdown": "osascript -e 'tell app \"System Events\" to shut down'",
            "restart": "osascript -e 'tell app \"System Events\" to restart'",
            "sleep": "pmset sleepnow",
        }
    else:
        cmds = {
            "lock": "loginctl lock-session",
            "shutdown": "shutdown -h +1",
            "restart": "shutdown -r +1",
            "sleep": "systemctl suspend",
        }
    cmd = cmds.get(what)
    if not cmd:
        raise ValueError(f"unknown system action {what}")
    subprocess.Popen(cmd, shell=True)
    return f"system {what}"


def list_files(params):
    """List files in a directory on the laptop."""
    path = params.get("path") or os.path.expanduser("~")
    path = os.path.expanduser(path)
    if not os.path.isdir(path):
        raise ValueError(f"not a directory: {path}")
    items = []
    for entry in sorted(os.listdir(path))[:200]:
        full = os.path.join(path, entry)
        items.append({"name": entry, "dir": os.path.isdir(full)})
    return {"path": path, "items": items}


def open_file(params):
    """Open a file with the default OS handler."""
    path = os.path.expanduser(params.get("path", ""))
    if not os.path.exists(path):
        raise ValueError(f"not found: {path}")
    if IS_WINDOWS:
        os.startfile(path)
    elif IS_MAC:
        subprocess.Popen(["open", path])
    else:
        subprocess.Popen(["xdg-open", path])
    return f"opened {path}"


def ping(_params):
    return {"pong": True, "time": time.time(), "platform": platform.system()}


# ---------- Registry ----------

ACTION_REGISTRY = {
    "ping": ping,
    "open_app": open_app,
    "close_app": close_app,
    "open_url": open_url,
    "web_search": web_search,
    "youtube": youtube_play,
    "whatsapp": whatsapp_send,
    "whatsapp_contact": whatsapp_contact,
    "type": type_text,
    "press": press_key,
    "click": mouse_click,
    "move": mouse_move,
    "move_rel": mouse_move_rel,
    "move_norm": mouse_move_norm,
    "scroll": scroll,
    "screenshot": screenshot,
    "volume": volume,
    "system": system_action,
    "write_code": write_code,
    "clipboard_set": clipboard_set,
    "clipboard_get": clipboard_get,
    "list_files": list_files,
    "open_file": open_file,
}


def execute_action(name, params):
    fn = ACTION_REGISTRY.get(name)
    if not fn:
        raise ValueError(f"unknown action: {name}")
    return fn(params or {})
