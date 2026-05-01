"""
SanketX 2047 — Desktop action handlers.
All functions are sync; called from a thread executor by agent.py.
"""
import os
import sys
import time
import platform
import subprocess
import webbrowser
from urllib.parse import quote

# Optional deps — agent works in degraded mode if any are missing.
try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.05
    HAS_PYAUTOGUI = True
except Exception:
    HAS_PYAUTOGUI = False

try:
    import pywhatkit
    HAS_PYWHATKIT = True
except Exception:
    HAS_PYWHATKIT = False

IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"
IS_LINUX = platform.system() == "Linux"


# ---------- App launchers ----------

# Windows uses `start`, mac uses `open -a`, linux tries the binary name.
APP_ALIASES = {
    "whatsapp": {"win": "whatsapp:", "mac": "WhatsApp", "linux": "whatsapp-desktop"},
    "chrome":   {"win": "chrome",    "mac": "Google Chrome", "linux": "google-chrome"},
    "firefox":  {"win": "firefox",   "mac": "Firefox",       "linux": "firefox"},
    "edge":     {"win": "msedge",    "mac": "Microsoft Edge","linux": "microsoft-edge"},
    "vscode":   {"win": "code",      "mac": "Visual Studio Code", "linux": "code"},
    "notepad":  {"win": "notepad",   "mac": "TextEdit",      "linux": "gedit"},
    "calculator":{"win": "calc",     "mac": "Calculator",    "linux": "gnome-calculator"},
    "explorer": {"win": "explorer",  "mac": "Finder",        "linux": "nautilus"},
    "terminal": {"win": "wt",        "mac": "Terminal",      "linux": "gnome-terminal"},
    "spotify":  {"win": "spotify",   "mac": "Spotify",       "linux": "spotify"},
    "youtube":  {"url": "https://youtube.com"},
    "gmail":    {"url": "https://mail.google.com"},
    "github":   {"url": "https://github.com"},
    "chatgpt":  {"url": "https://chat.openai.com"},
}


def _platform_key():
    if IS_WINDOWS: return "win"
    if IS_MAC: return "mac"
    return "linux"


def open_app(params):
    name = (params.get("name") or "").strip().lower()
    if not name:
        raise ValueError("app name required")

    alias = APP_ALIASES.get(name)
    if alias and "url" in alias:
        webbrowser.open(alias["url"])
        return f"opened {name} in browser"

    target = (alias or {}).get(_platform_key(), name)

    if IS_WINDOWS:
        # `start "" target` handles protocols (whatsapp:) and binaries (chrome)
        subprocess.Popen(f'start "" {target}', shell=True)
    elif IS_MAC:
        subprocess.Popen(["open", "-a", target])
    else:
        subprocess.Popen([target])
    return f"launched {name}"


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

def whatsapp_send(params):
    """
    Send WhatsApp Web message.
    params: { phone: '+91XXXXXXXXXX', message: 'hi', wait?: 15 }
    """
    if not HAS_PYWHATKIT:
        # Fallback: open WhatsApp Web with prefilled message
        phone = params.get("phone", "").strip()
        msg = params.get("message", "").strip()
        if phone:
            url = f"https://web.whatsapp.com/send?phone={quote(phone)}&text={quote(msg)}"
        else:
            url = f"https://web.whatsapp.com/"
        webbrowser.open(url)
        return "opened WhatsApp Web (install pywhatkit for auto-send)"

    phone = params.get("phone", "").strip()
    message = params.get("message", "").strip()
    wait = int(params.get("wait", 15))
    if not phone or not message:
        raise ValueError("phone and message required")
    pywhatkit.sendwhatmsg_instantly(phone, message, wait_time=wait, tab_close=True)
    return f"whatsapp -> {phone}"


# ---------- Mouse / Keyboard ----------

def _need_pyauto():
    if not HAS_PYAUTOGUI:
        raise RuntimeError("pyautogui not installed")


def type_text(params):
    _need_pyauto()
    text = params.get("text", "")
    interval = float(params.get("interval", 0.02))
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
    duration = float(params.get("duration", 0.2))
    pyautogui.moveTo(x, y, duration=duration)
    return f"moved to {x},{y}"


def scroll(params):
    _need_pyauto()
    amount = int(params.get("amount", -300))
    pyautogui.scroll(amount)
    return f"scrolled {amount}"


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
    """lock / sleep / shutdown / restart"""
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
    "type": type_text,
    "press": press_key,
    "click": mouse_click,
    "move": mouse_move,
    "scroll": scroll,
    "screenshot": screenshot,
    "volume": volume,
    "system": system_action,
}


def execute_action(name, params):
    fn = ACTION_REGISTRY.get(name)
    if not fn:
        raise ValueError(f"unknown action: {name}")
    return fn(params or {})
