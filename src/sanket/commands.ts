import { brain, AppId } from "./store";
import { speak } from "./speech";
import { supabase } from "@/integrations/supabase/client";
import { desktop } from "./desktop";

const APP_KEYWORDS: Record<string, AppId> = {
  chrome: "chrome", browser: "chrome",
  search: "search", google: "search",
  music: "music", spotify: "music", song: "music",
  weather: "weather",
  notes: "notes", note: "notes",
  terminal: "terminal", console: "terminal",
};

// Apps the desktop agent can launch on the real OS
const DESKTOP_APPS = [
  "whatsapp", "chrome", "firefox", "edge", "vscode", "code",
  "notepad", "calculator", "calc", "explorer", "finder",
  "terminal", "spotify", "youtube", "gmail", "github", "chatgpt",
];

export async function handleCommand(raw: string) {
  const text = raw.toLowerCase().trim();
  if (!text) return;

  brain.set({ lastCommand: raw });
  brain.log("user", raw);

  // Wake / sleep
  if (/(jarvis\s*)?(activate|wake up|come online|on(line)?)\b/.test(text) && !brain.get().active) {
    return activate();
  }
  if (/(jarvis\s*)?(off|shutdown|shut down|sleep|stand down|goodbye)\b/.test(text)) {
    return deactivate();
  }
  if (!brain.get().active) return;

  // ===== DESKTOP AGENT COMMANDS =====

  // WhatsApp: "send hi to +91... on whatsapp"  /  "whatsapp +91... message hi"
  const waMatch = text.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+(\+?\d[\d\s-]{7,})/) ||
                  text.match(/whatsapp\s+(\+?\d[\d\s-]{7,})\s+(?:saying\s+|message\s+)?(.+)/);
  if (waMatch && /whatsapp/.test(text)) {
    const [, a, b] = waMatch;
    const phone = (b.match(/^\+?\d/) ? b : a).replace(/[\s-]/g, "");
    const message = (b.match(/^\+?\d/) ? a : b).trim();
    return desktopAction("whatsapp", { phone: phone.startsWith("+") ? phone : "+" + phone, message },
      `Dispatching WhatsApp to ${phone}.`);
  }

  // YouTube play
  const ytMatch = text.match(/(?:play|youtube)\s+(.+?)(?:\s+on\s+youtube)?$/);
  if (ytMatch && /youtube|play/.test(text) && !/music/.test(text)) {
    const q = ytMatch[1].replace(/\s+on\s+youtube$/, "");
    return desktopAction("youtube", { query: q }, `Streaming ${q} on YouTube.`);
  }

  // Screenshot — real desktop one if agent online, else simulated
  if (/screenshot|capture screen/.test(text)) {
    if (desktop.isOnline()) return desktopAction("screenshot", {}, "Screenshot captured.");
    brain.log("system", "// SCREEN.CAPTURE :: SIMULATED");
    return respond("Screenshot captured to virtual buffer.");
  }

  // Volume
  if (/volume\s+(up|down|mute)/.test(text)) {
    const dir = text.match(/volume\s+(up|down|mute)/)![1];
    return desktopAction("volume", { direction: dir, times: 5 }, `Volume ${dir}.`);
  }

  // System: lock / sleep / shutdown
  const sysMatch = text.match(/(lock|sleep|shutdown|shut down|restart)\s+(?:the\s+)?(?:system|laptop|computer|pc)/);
  if (sysMatch) {
    const what = sysMatch[1].replace(" ", "");
    return desktopAction("system", { what }, `Executing system ${what}.`);
  }

  // Type text into focused window
  const typeMatch = text.match(/^(?:type|write)\s+(.+)/);
  if (typeMatch) {
    return desktopAction("type", { text: typeMatch[1] }, `Typing.`);
  }

  // Open URL
  const urlMatch = text.match(/(?:open|go to|visit)\s+((?:https?:\/\/)?[\w-]+\.[\w.-]+(?:\/\S*)?)/);
  if (urlMatch) {
    return desktopAction("open_url", { url: urlMatch[1] }, `Opening ${urlMatch[1]}.`);
  }

  // Mouse toggle
  if (/(disable|stop|pause)\s+(mouse|gesture)/.test(text)) {
    brain.set({ mouseEnabled: false });
    return respond("Gesture control disabled.");
  }
  if (/(enable|start|resume)\s+(mouse|gesture)/.test(text)) {
    brain.set({ mouseEnabled: true });
    return respond("Gesture control online.");
  }

  // Close apps (virtual)
  if (/close (all|everything)/.test(text)) {
    brain.closeAll();
    return respond("Closing all windows, Sir.");
  }
  if (/close (window|app)/.test(text)) {
    const ws = brain.get().windows;
    if (ws.length) brain.closeWindow(ws[ws.length - 1].id);
    return respond("Window closed.");
  }

  // Time
  if (/(time|clock)/.test(text) && /(what|tell|current)/.test(text)) {
    return respond("The time is " + new Date().toLocaleTimeString());
  }

  // Open apps — desktop first if agent online, else virtual
  const openMatch = text.match(/(?:open|launch|start)\s+([a-z]+)/);
  if (openMatch) {
    const key = openMatch[1];
    if (desktop.isOnline() && DESKTOP_APPS.includes(key)) {
      return desktopAction("open_app", { name: key }, `Opening ${key} on your desktop.`);
    }
    const app = APP_KEYWORDS[key];
    if (app) {
      brain.openApp(app);
      return respond("Opening " + app + ".");
    }
    // Unknown — try desktop launch anyway if linked
    if (desktop.isOnline()) {
      return desktopAction("open_app", { name: key }, `Launching ${key}.`);
    }
  }

  // Search
  const searchMatch = text.match(/(?:search|google|find)\s+(?:for\s+)?(.+)/);
  if (searchMatch) {
    if (desktop.isOnline()) {
      return desktopAction("web_search", { query: searchMatch[1] }, `Searching for ${searchMatch[1]}.`);
    }
    brain.openApp("search");
    return respond("Searching for " + searchMatch[1]);
  }

  // Default → AI brain
  await askAI(raw);
}

async function desktopAction(action: string, params: Record<string, any>, ack: string) {
  if (!desktop.isOnline()) {
    return respond("Desktop link offline. Start the agent on your laptop first, Sir.");
  }
  respond(ack);
  try {
    const r = await desktop.send(action, params);
    brain.log("system", `// AGENT.${action.toUpperCase()} :: ${typeof r === "string" ? r : JSON.stringify(r)}`);
  } catch (e: any) {
    brain.log("error", `// AGENT.ERR :: ${e?.message || e}`);
    respond("Action failed: " + (e?.message || "unknown"));
  }
}

function activate() {
  brain.set({ active: true });
  brain.log("system", "// SYSTEM ONLINE — J.A.R.V.I.S. INITIALIZED");
  desktop.connect();
  respond("Online. Standing by, Sir.");
}

function deactivate() {
  respond("Powering down. Goodbye.");
  setTimeout(() => {
    brain.closeAll();
    brain.set({ active: false });
    brain.log("system", "// SYSTEM OFFLINE");
  }, 1200);
}

function respond(text: string) {
  brain.set({ lastResponse: text });
  brain.log("jarvis", text);
  speak(text);
}

async function askAI(question: string) {
  brain.set({ thinking: true });
  brain.log("system", "// QUERYING NEURAL CORE…");
  try {
    const { data, error } = await supabase.functions.invoke("jarvis-ai", {
      body: { question },
    });
    if (error) throw error;
    const answer = (data as any)?.answer || "I have no response.";
    respond(answer);
  } catch (e: any) {
    const msg = e?.message || "AI link failure.";
    brain.log("error", "// " + msg);
    respond("Neural core unreachable.");
  } finally {
    brain.set({ thinking: false });
  }
}
