import { brain, AppId } from "./store";
import { speak } from "./speech";
import { supabase } from "@/integrations/supabase/client";
import { desktop } from "./desktop";
import { contacts } from "./contacts";
import { numberOverlay, parseSpokenNumber } from "./numberOverlay";

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

  // ===== MAC VOICE CONTROL :: SHOW NUMBERS / SHOW GRID =====
  if (/^(show|display)\s+numbers?$/.test(text) || /^numbers?\s+(on|please)$/.test(text)) {
    numberOverlay.showNumbers();
    return respond("Numbers shown. Say a number to click.");
  }
  if (/^(hide|remove|clear)\s+numbers?$/.test(text) || /^numbers?\s+off$/.test(text)) {
    numberOverlay.hideNumbers();
    return respond("Numbers hidden.");
  }
  if (/^(show|display)\s+grid$/.test(text)) {
    numberOverlay.showGrid();
    return respond("Grid shown. Say a number from one to nine.");
  }
  if (/^(hide|remove|clear)\s+grid$/.test(text) || /^grid\s+off$/.test(text)) {
    numberOverlay.hideGrid();
    return respond("Grid hidden.");
  }

  // "click 5" / "click five" / "double click 3" / "right click two" / "open 4" / "tap 7"
  if (numberOverlay.isNumbersOn() || numberOverlay.isGridOn()) {
    const m = text.match(/^(?:(double[\s-]?click|right[\s-]?click|click|open|tap|select|press)\s+)?(?:number\s+)?([a-z0-9]+)$/);
    if (m) {
      const verb = (m[1] || "click").replace(/[\s-]/g, "");
      const n = parseSpokenNumber(m[2]);
      if (n !== null) {
        const kind: "click" | "doubleclick" | "rightclick" =
          verb === "doubleclick" ? "doubleclick" :
          verb === "rightclick" ? "rightclick" : "click";
        const ok = numberOverlay.isGridOn()
          ? numberOverlay.activateGridCell(n, kind)
          : numberOverlay.activate(n, kind);
        return respond(ok ? `${kind === "doubleclick" ? "Double clicking" : kind === "rightclick" ? "Right clicking" : "Clicking"} ${n}.` : `No item ${n}.`);
      }
    }
  }

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

    const directWhatsApp = text.match(/(?:open\s+)?whatsapp\s+(?:app\s+)?(?:and\s+)?send\s+(.+?)\s+to\s+(.+)$/);
    if (directWhatsApp) {
      message = directWhatsApp[1].trim();
      const target = directWhatsApp[2].replace(/\s+on\s+whatsapp$/, "").trim();
      if (/^\+?\d[\d\s-]{7,}$/.test(target)) phone = target.replace(/[\s-]/g, "");
      else contactName = target;
      const c = contactName ? contacts.find(contactName) : null;
      if (c) phone = c.phone;
    }

    // 1) explicit phone number
    const numMatch = !message && (text.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+(\+?\d[\d\s-]{7,})/) ||
                     text.match(/whatsapp\s+(\+?\d[\d\s-]{7,})\s+(?:saying\s+|message\s+)?(.+)/));
    if (numMatch) {
      const [, a, b] = numMatch;
      phone = (b.match(/^\+?\d/) ? b : a).replace(/[\s-]/g, "");
      message = (b.match(/^\+?\d/) ? a : b).trim();
    } else if (!message) {
      // 2) contact name patterns
      const m1 = text.match(/(?:send|whatsapp)\s+(.+?)\s+to\s+([a-z][a-z\s]*?)(?:\s+on\s+whatsapp)?$/);
      const m2 = text.match(/^whatsapp\s+(.+)$/);
      if (m1) { message = m1[1].trim(); contactName = m1[2].trim(); }
      else if (m2) {
        const rest = m2[1].replace(/^(?:saying|message)\s+/, "").trim();
        const saved = contacts.list().find((c) => rest.startsWith(c.name.toLowerCase() + " "));
        if (saved) {
          contactName = saved.name;
          message = rest.slice(saved.name.length).trim();
        } else {
          const parts = rest.split(/\s+/);
          contactName = parts.shift() || "";
          message = parts.join(" ").trim();
        }
      }

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

  // ===== MAC VOICE-CONTROL STYLE =====
  // Mouse clicks
  if (/^(double[\s-]?click|click twice)\b/.test(text))
    return desktopAction("click", { button: "left", clicks: 2 }, "Double click.");
  if (/^right[\s-]?click\b/.test(text))
    return desktopAction("click", { button: "right" }, "Right click.");
  if (/^(click|tap|select)\b(?!\s+(?:on|the))/.test(text) || /^click\s+(here|that|it)?$/.test(text))
    return desktopAction("click", { button: "left" }, "Click.");

  // Scroll
  if (/scroll\s+up/.test(text)) return desktopAction("scroll", { amount: 400 }, "Scrolling up.");
  if (/scroll\s+down/.test(text)) return desktopAction("scroll", { amount: -400 }, "Scrolling down.");
  if (/^page\s+up/.test(text)) return desktopAction("press", { key: "pageup" }, "Page up.");
  if (/^page\s+down/.test(text)) return desktopAction("press", { key: "pagedown" }, "Page down.");

  // Single keys: enter, escape, space, tab, backspace, delete, arrow keys
  const singleKey = text.match(/^(?:press\s+|hit\s+)?(enter|return|escape|esc|space|tab|backspace|delete|up|down|left|right|home|end)\s*(?:key)?$/);
  if (singleKey) {
    const k = singleKey[1].replace("return", "enter").replace("esc", "escape");
    return desktopAction("press", { key: k }, `Pressed ${k}.`);
  }

  // Mac-style shortcuts → cross-platform (mac uses command, others ctrl)
  const isMac = /Mac/i.test(navigator.platform);
  const META = isMac ? "command" : "ctrl";
  const SHORTCUTS: [RegExp, string[], string][] = [
    [/^(copy(\s+that|\s+it)?|copy\s+selection)$/, [META, "c"], "Copied."],
    [/^paste(\s+that|\s+it|\s+here)?$/,           [META, "v"], "Pasted."],
    [/^cut(\s+that|\s+it)?$/,                     [META, "x"], "Cut."],
    [/^select\s+all$/,                             [META, "a"], "Select all."],
    [/^undo(\s+that)?$/,                           [META, "z"], "Undo."],
    [/^redo(\s+that)?$/,                           [META, "shift", "z"], "Redo."],
    [/^save(\s+(file|it|that))?$/,                 [META, "s"], "Saved."],
    [/^new\s+tab$/,                                [META, "t"], "New tab."],
    [/^close\s+tab$/,                              [META, "w"], "Tab closed."],
    [/^reopen\s+tab$/,                             [META, "shift", "t"], "Reopened tab."],
    [/^next\s+tab$/,                               [META, "alt", "right"], "Next tab."],
    [/^previous\s+tab|prev\s+tab$/,                [META, "alt", "left"], "Previous tab."],
    [/^new\s+window$/,                             [META, "n"], "New window."],
    [/^close\s+window$/,                           [META, "w"], "Window closed."],
    [/^(switch\s+app|next\s+window|cycle\s+apps?)$/, [META, "tab"], "Switching app."],
    [/^(open\s+spotlight|spotlight\s+search)$/,    [META, "space"], "Spotlight."],
    [/^find(\s+in\s+page)?$/,                      [META, "f"], "Find."],
    [/^refresh(\s+page)?|reload(\s+page)?$/,       [META, "r"], "Refreshing."],
    [/^zoom\s+in$/,                                 [META, "="], "Zoom in."],
    [/^zoom\s+out$/,                                [META, "-"], "Zoom out."],
    [/^show\s+desktop$/,                            [isMac ? "f11" : "win", isMac ? "f11" : "d"], "Showing desktop."],
    [/^mission\s+control$/,                         ["ctrl", "up"], "Mission control."],
  ];
  for (const [re, keys, msg] of SHORTCUTS) {
    if (re.test(text)) return desktopAction("press", { key: keys }, msg);
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

  // Mouse / camera toggles (also notify the desktop agent)
  if (/(disable|stop|pause|turn off)\s+(mouse|gesture|hand)/.test(text) || /^mouse\s*off$/.test(text)) {
    brain.set({ mouseEnabled: false });
    if (desktop.isOnline()) desktop.fire("mouse_off", {});
    return respond("Gesture control disabled.");
  }
  if (/(enable|start|resume|turn on)\s+(mouse|gesture|hand)/.test(text) || /^mouse\s*on$/.test(text)) {
    brain.set({ mouseEnabled: true });
    if (desktop.isOnline()) desktop.fire("mouse_on", {});
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

  // ===== AI INTENT FALLBACK — structured action JSON =====
  if (await tryIntentFallback(raw)) return;

  await askAI(raw);
}

const SCROLL_AMOUNT: Record<string, number> = { small: 200, medium: 400, large: 800 };

async function tryIntentFallback(raw: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("voice-intent", { body: { command: raw } });
    if (error) return false;
    const intent = (data as any)?.intent;
    if (!intent || !intent.action || intent.action === "none") return false;
    return await dispatchIntent(intent);
  } catch { return false; }
}

async function dispatchIntent(intent: any): Promise<boolean> {
  const a = intent.action;
  const repeat = Math.max(1, Math.min(50, parseInt(intent.repeat) || 1));

  switch (a) {
    case "key_press": {
      const keys = Array.isArray(intent.keys) ? intent.keys.map(normKey) : [];
      if (!keys.length) return false;
      for (let i = 0; i < repeat; i++) {
        await desktopAction("press", { key: keys.length === 1 ? keys[0] : keys },
          i === 0 ? `Pressing ${keys.join("+")}${repeat > 1 ? ` ×${repeat}` : ""}.` : "");
      }
      return true;
    }
    case "key_hold":
      return !!(await desktopAction("press", { key: normKey(intent.key) }, `Holding ${intent.key}.`));
    case "key_release":
      return !!(await desktopAction("press", { key: normKey(intent.key) }, `Releasing ${intent.key}.`));
    case "type":
      return !!(await desktopAction("type", { text: String(intent.text || "") }, "Typing."));
    case "mouse_click": {
      const t = intent.type || "left";
      const params = t === "double" ? { button: "left", clicks: 2 } :
                     t === "right"  ? { button: "right" } :
                                       { button: "left" };
      return !!(await desktopAction("click", params, `${t} click.`));
    }
    case "scroll": {
      const amt = SCROLL_AMOUNT[intent.amount] ?? 400;
      const signed = intent.direction === "down" ? -amt : amt;
      return !!(await desktopAction("scroll", { amount: signed }, `Scrolling ${intent.direction}.`));
    }
    case "open_app":
      return !!(await desktopAction("open_app", { name: String(intent.app || "").toLowerCase() }, `Opening ${intent.app}.`));
    case "system": {
      const t = String(intent.type || "");
      if (t.startsWith("volume_") || t === "mute") {
        const dir = t === "mute" ? "mute" : t.split("_")[1];
        return !!(await desktopAction("volume", { direction: dir, times: 5 }, `Volume ${dir}.`));
      }
      return !!(await desktopAction("system", { what: t }, `System ${t}.`));
    }
    case "grid_click": {
      const n = parseInt(intent.cell);
      if (!n) return false;
      if (!numberOverlay.isGridOn() && !numberOverlay.isNumbersOn()) numberOverlay.showGrid();
      const ok = numberOverlay.isGridOn() ? numberOverlay.activateGridCell(n) : numberOverlay.activate(n);
      respond(ok ? `Clicking ${n}.` : `No item ${n}.`);
      return true;
    }
    case "mode": {
      const on = intent.state === "on";
      if (intent.target === "mouse") {
        brain.set({ mouseEnabled: on });
        if (desktop.isOnline()) desktop.fire(on ? "mouse_on" : "mouse_off", {});
        respond(`Mouse ${on ? "enabled" : "disabled"}.`);
        return true;
      }
      respond(`${intent.target} ${on ? "on" : "off"}.`);
      return true;
    }
  }
  return false;
}

function normKey(k: any): string {
  const s = String(k || "").toLowerCase().trim();
  const map: Record<string, string> = { control: "ctrl", option: "alt", return: "enter", escape: "esc" };
  return map[s] || s;
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
