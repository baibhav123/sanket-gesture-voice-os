// SanketX 2047 — Desktop bridge (browser → local Python agent over HTTP)
// Endpoint contract:
//   POST http://localhost:5000/command   { "command": "<text or action>", ...params }
//   GET  http://localhost:5000/ping      -> { ok: true }
import { brain } from "./store";

const BASE = "http://localhost:5000";

class DesktopBridge {
  public connected = false;
  private pollTimer: number | null = null;

  connect() {
    this.ping();
    if (this.pollTimer == null) {
      this.pollTimer = window.setInterval(() => this.ping(), 4000);
    }
  }

  async ping() {
    try {
      const r = await fetch(`${BASE}/ping`, { method: "GET" });
      const ok = r.ok;
      if (ok && !this.connected) {
        brain.log("system", "// DESKTOP.LINK :: ONLINE — agent reachable on " + BASE);
      }
      this.connected = ok;
      brain.set({ desktopLink: ok });
    } catch {
      if (this.connected) brain.log("error", "// DESKTOP.LINK :: OFFLINE");
      this.connected = false;
      brain.set({ desktopLink: false });
    }
  }

  isOnline() { return this.connected; }

  /** Natural-language command — Python agent parses & dispatches */
  async sendCommand(command: string): Promise<any> {
    const r = await fetch(`${BASE}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    if (!r.ok) throw new Error(`agent ${r.status}`);
    return r.json();
  }

  /** Structured action — sent as { command: "<action>", ...params } */
  async send(action: string, params: Record<string, any> = {}): Promise<any> {
    const r = await fetch(`${BASE}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: action, ...params }),
    });
    if (!r.ok) throw new Error(`agent ${r.status}`);
    const j = await r.json();
    if (j.ok === false) throw new Error(j.error || "agent error");
    return j.result ?? j;
  }

  /** Fire-and-forget for high-frequency calls (cursor moves) */
  fire(action: string, params: Record<string, any> = {}) {
    if (!this.connected) return false;
    try {
      // keepalive lets us spam without blocking — ignore response
      fetch(`${BASE}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: action, ...params }),
        keepalive: true,
      }).catch(() => {});
      return true;
    } catch { return false; }
  }
}

export const desktop = new DesktopBridge();
