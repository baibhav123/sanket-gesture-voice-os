import { brain, AppId } from "./store";
import { speak } from "./speech";
import { supabase } from "@/integrations/supabase/client";
import { desktop } from "./desktop";
import { contacts } from "./contacts";

const APP_KEYWORDS: Record<string, AppId> = {
  search: "search", google: "search",
  music: "music", song: "music",
  weather: "weather",
  notes: "notes", note: "notes",
  terminal: "terminal", console: "terminal",
};

// Anything in this list will be tried as a NATIVE app first, then website fallback by the agent itself.
const SMART_OPEN_APPS = [
  "whatsapp", "youtube", "facebook", "instagram", "twitter", "x", "linkedin",
  "gmail", "github", "chatgpt",
  "chrome", "firefox", "edge", "vscode", "code", "antigravity",
  "notepad", "calculator", "calc", "explorer", "finder", "terminal",
  "spotify", "discord", "slack", "telegram", "zoom",
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

  // ===== CODE WRITING =====
  // "write code for a calculator in python" / "code a snake game in javascript"
  // "copy code for X" -> clipboard
  const codeMatch = text.match(/^(?:write|generate|make|create|build|code|copy)\s+(?:the\s+)?code\s+(?:for\s+)?(.+)/);
  if (codeMatch) {
    const useClipboard = /^copy\b/.test(text);
    return writeCodeFlow(codeMatch[1], useClipboard);
  }

  // ===== DESKTOP AGENT COMMANDS =====

  // ----- Contact book management -----
  // "save contact mom +919876543210" / "add contact dad as 9876543210"
  const saveContact = text.match(/(?:save|add|store)\s+contact\s+([a-z][a-z\s]*?)(?:\s+as)?\s+(\+?\d[\d\s-]{7,})/);
  if (saveContact) {
    const [, name, phone] = saveContact;
    contacts.add(name.trim(), phone);
    return respond(`Contact ${name.trim()} saved.`);
  }
  if (/list contacts|show contacts|my contacts/.test(text)) {
    const list = contacts.list();
    return respond(list.length ? `You have ${list.length} contacts: ${list.map((c) => c.name).join(", ")}.` : "No contacts saved yet.");
  }

  // ----- WhatsApp messaging (phone OR contact name) -----
  // Patterns we accept:
  //   "send hi to mom on whatsapp"
  //   "whatsapp mom hi"
  //   "send hi to +91987..."  
  //   "whatsapp +91987... saying hi"
  if (/whatsapp/.test(text) || /^send\s+.+\s+to\s+.+/.test(text)) {
    let phone = ""; let message = ""; let contactName = "";

    // 1) explicit phone number
    const numMatch = text.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+(\+?\d[\d\s-]{7,})/) ||
                     text.match(/whatsapp\s+(\+?\d[\d\s-]{7,})\s+(?:saying\s+|message\s+)?(.+)/);
    if (numMatch) {
      const [, a, b] = numMatch;
      phone = (b.match(/^\+?\d/) ? b : a).replace(/[\s-]/g, "");
      message = (b.match(/^\+?\d/) ? a : b).trim();
    } else {
      // 2) contact name patterns
      const m1 = text.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+([a-z][a-z\s]*?)(?:\s+on\s+whatsapp)?$/);
      const m2 = text.match(/whatsapp\s+([a-z][a-z\s]*?)\s+(?:saying\s+|message\s+)?(.+)/);
      if (m1) { message = m1[1].trim(); contactName = m1[2].trim(); }
      else if (m2) { contactName = m2[1].trim(); message = m2[2].trim(); }

      if (contactName) {
        const c = contacts.find(contactName);
        if (c) phone = c.phone;
      }
    }

    if (phone && message) {
      phone = phone.startsWith("+") ? phone : "+" + phone;
      return desktopAction("whatsapp", { phone, message },
        `Dispatching WhatsApp to ${contactName || phone}.`);
    }
    if (contactName && message) {
      return desktopAction("whatsapp_contact", { name: contactName, message },
        `Opening WhatsApp app, searching ${contactName}, and sending your message.`);
    }
  }

  // YouTube play
  const ytMatch = text.match(/(?:play|youtube)\s+(.+?)(?:\s+on\s+youtube)?$/);
  if (ytMatch && /youtube|play/.test(text) && !/music/.test(text)) {
    const q = ytMatch[1].replace(/\s+on\s+youtube$/, "");
    return desktopAction("youtube", { query: q }, `Streaming ${q} on YouTube.`);
  }

  if (/screenshot|capture screen/.test(text)) {
    if (desktop.isOnline()) return desktopAction("screenshot", {}, "Screenshot captured.");
    brain.log("system", "// SCREEN.CAPTURE :: SIMULATED");
    return respond("Screenshot captured to virtual buffer.");
  }

  if (/volume\s+(up|down|mute)/.test(text)) {
    const dir = text.match(/volume\s+(up|down|mute)/)![1];
    return desktopAction("volume", { direction: dir, times: 5 }, `Volume ${dir}.`);
  }

  const sysMatch = text.match(/(lock|sleep|shutdown|shut down|restart)\s+(?:the\s+)?(?:system|laptop|computer|pc)/);
  if (sysMatch) {
    const what = sysMatch[1].replace(" ", "");
    return desktopAction("system", { what }, `Executing system ${what}.`);
  }

  const typeMatch = text.match(/^(?:type|write)\s+(.+)/);
  if (typeMatch && !codeMatch) {
    return desktopAction("type", { text: typeMatch[1] }, `Typing.`);
  }

  // List/open files
  const lsMatch = text.match(/(?:list|show)\s+files\s+(?:in\s+)?(.+)?/);
  if (lsMatch) {
    const path = lsMatch[1] || "~";
    if (!desktop.isOnline()) return respond("Desktop link offline.");
    try {
      const r = await desktop.send("list_files", { path });
      respond(`${(r as any).items.length} items in ${(r as any).path}.`);
    } catch (e: any) { respond("Cannot list: " + e.message); }
    return;
  }

  const urlMatch = text.match(/(?:open|go to|visit)\s+((?:https?:\/\/)?[\w-]+\.[\w.-]+(?:\/\S*)?)/);
  if (urlMatch) {
    return desktopAction("open_url", { url: urlMatch[1] }, `Opening ${urlMatch[1]}.`);
  }

  // Mouse / camera toggles
  if (/(disable|stop|pause|turn off)\s+(mouse|gesture|hand)/.test(text)) {
    brain.set({ mouseEnabled: false });
    return respond("Gesture control disabled.");
  }
  if (/(enable|start|resume|turn on)\s+(mouse|gesture|hand)/.test(text)) {
    brain.set({ mouseEnabled: true });
    return respond("Gesture control online.");
  }
  if (/(turn off|stop|disable)\s+camera/.test(text)) {
    brain.set({ cameraEnabled: false });
    return respond("Camera offline.");
  }
  if (/(turn on|start|enable)\s+camera/.test(text)) {
    brain.set({ cameraEnabled: true });
    return respond("Camera coming online.");
  }

  // Close virtual windows
  if (/close (all|everything)/.test(text)) {
    brain.closeAll();
    return respond("Closing all windows, Sir.");
  }
  if (/close (window|app)/.test(text)) {
    const ws = brain.get().windows;
    if (ws.length) brain.closeWindow(ws[ws.length - 1].id);
    return respond("Window closed.");
  }

  if (/(time|clock)/.test(text) && /(what|tell|current)/.test(text)) {
    return respond("The time is " + new Date().toLocaleTimeString());
  }

  // OPEN APPS — smart: native first, website fallback (handled by agent)
  const openMatch = text.match(/(?:open|launch|start|run)\s+([a-z][a-z0-9 ]*)/);
  if (openMatch) {
    const key = openMatch[1].trim().split(/\s+/)[0];
    if (desktop.isOnline() && (SMART_OPEN_APPS.includes(key) || true)) {
      // Always try via agent when online — agent does native→website fallback
      return desktopAction("open_app", { name: key }, `Opening ${key}.`);
    }
    const app = APP_KEYWORDS[key];
    if (app) {
      brain.openApp(app);
      return respond("Opening " + app + ".");
    }
    return respond("Desktop link offline. Cannot launch " + key + ".");
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

  await askAI(raw);
}

async function writeCodeFlow(prompt: string, copyOnly: boolean) {
  brain.set({ thinking: true });
  brain.log("system", `// CODE.GEN :: ${prompt}`);
  respond(copyOnly ? `Generating code for ${prompt} — will copy to clipboard.` : `Generating code for ${prompt}.`);
  try {
    const { data, error } = await supabase.functions.invoke("jarvis-ai", {
      body: { question: `Write complete, runnable code for: ${prompt}`, mode: "code" },
    });
    if (error) throw error;
    let code = ((data as any)?.answer || "").trim();
    // Strip markdown fences if present
    code = code.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```\s*$/, "").trim();
    if (!code) return respond("No code generated.");

    if (!desktop.isOnline()) {
      // Show in browser console as fallback
      console.log("[SanketX Code]\n" + code);
      respond("Desktop link offline — code logged to browser console.");
      return;
    }

    if (copyOnly) {
      await desktop.send("clipboard_set", { text: code });
      respond("Code copied to clipboard. Paste with Control V.");
    } else {
      // Give the user 2s to focus their editor window
      respond("Focus your editor now — typing in 2 seconds.");
      setTimeout(async () => {
        try {
          await desktop.send("write_code", { code, mode: "type" });
          brain.log("system", `// CODE.WROTE :: ${code.length} chars`);
        } catch (e: any) {
          brain.log("error", "// CODE.ERR :: " + e.message);
        }
      }, 2000);
    }
  } catch (e: any) {
    respond("Code generation failed: " + (e?.message || "unknown"));
  } finally {
    brain.set({ thinking: false });
  }
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
