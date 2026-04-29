import { brain, AppId } from "./store";
import { speak } from "./speech";
import { supabase } from "@/integrations/supabase/client";

const APP_KEYWORDS: Record<string, AppId> = {
  chrome: "chrome", browser: "chrome",
  search: "search", google: "search",
  music: "music", spotify: "music", song: "music",
  weather: "weather",
  notes: "notes", note: "notes",
  terminal: "terminal", console: "terminal",
};

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
  if (!brain.get().active) {
    // ignore until activated
    return;
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

  // Close apps
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
    const t = new Date().toLocaleTimeString();
    return respond("The time is " + t);
  }

  // Open apps
  const openMatch = text.match(/(?:open|launch|start)\s+([a-z]+)/);
  if (openMatch) {
    const key = openMatch[1];
    const app = APP_KEYWORDS[key];
    if (app) {
      brain.openApp(app);
      return respond("Opening " + app + ".");
    }
  }

  // Search
  const searchMatch = text.match(/(?:search|google|find)\s+(?:for\s+)?(.+)/);
  if (searchMatch) {
    brain.openApp("search");
    return respond("Searching for " + searchMatch[1]);
  }

  // Screenshot fake
  if (/screenshot|capture screen/.test(text)) {
    brain.log("system", "// SCREEN.CAPTURE :: SIMULATED");
    return respond("Screenshot captured to virtual buffer.");
  }

  // Default → AI brain
  await askAI(raw);
}

function activate() {
  brain.set({ active: true });
  brain.log("system", "// SYSTEM ONLINE — J.A.R.V.I.S. INITIALIZED");
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
