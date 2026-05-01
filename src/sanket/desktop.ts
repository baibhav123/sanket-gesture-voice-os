// SanketX 2047 — Desktop bridge (browser → local Python agent over WebSocket)
import { brain } from "./store";

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

class DesktopBridge {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private retryTimer: number | null = null;
  private url = "ws://localhost:8765";
  public connected = false;
  public actions: string[] = [];

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws.onopen = () => {
      this.connected = true;
      brain.set({ desktopLink: true });
      brain.log("system", "// DESKTOP.LINK :: ONLINE — agent reachable on " + this.url);
    };
    this.ws.onclose = () => {
      this.connected = false;
      brain.set({ desktopLink: false });
      this.scheduleRetry();
    };
    this.ws.onerror = () => {
      this.connected = false;
      brain.set({ desktopLink: false });
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "hello") {
          this.actions = msg.actions || [];
          brain.log("system", `// AGENT v${msg.version} :: ${this.actions.length} capabilities`);
          return;
        }
        if (msg.type === "result" && msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          msg.ok ? p.resolve(msg.result) : p.reject(new Error(msg.error));
        }
      } catch (e) {
        // ignore
      }
    };
  }

  private scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 4000);
  }

  isOnline() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(action: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.isOnline()) {
      return Promise.reject(new Error("Desktop agent offline. Run agent.py on your laptop."));
    }
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, action, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("agent timeout"));
        }
      }, 30000);
    });
  }
}

export const desktop = new DesktopBridge();
