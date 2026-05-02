import { useState, useMemo } from "react";
import { Search, X, Mic } from "lucide-react";

type Cmd = { say: string; does: string };
type Group = { title: string; items: Cmd[] };

const GROUPS: Group[] = [
  {
    title: "SYSTEM / WAKE",
    items: [
      { say: "Jarvis on", does: "Activate SanketX (boots HUD + agent link)" },
      { say: "Jarvis off", does: "Shut down SanketX" },
      { say: "Mouse on / Mouse off", does: "Enable / disable hand-gesture cursor" },
      { say: "Turn on camera / Turn off camera", does: "Toggle webcam vision" },
      { say: "Lock the system", does: "Lock your Mac" },
      { say: "Sleep the laptop", does: "Put Mac to sleep" },
      { say: "Restart the computer", does: "Restart Mac (5s delay)" },
    ],
  },
  {
    title: "OPEN APPS  (native first → web fallback)",
    items: [
      { say: "Open WhatsApp", does: "Launches WhatsApp Desktop" },
      { say: "Open YouTube", does: "Opens YouTube in default browser" },
      { say: "Open Chrome / Safari / Firefox", does: "Launches the browser" },
      { say: "Open VS Code", does: "Launches Visual Studio Code" },
      { say: "Open Antigravity", does: "Launches Antigravity (or website)" },
      { say: "Open Spotify / Discord / Slack / Zoom", does: "Launches the app" },
      { say: "Open Finder / Calculator / Terminal", does: "Launches Mac built-in app" },
      { say: "Close window", does: "Closes focused window (Cmd+W)" },
    ],
  },
  {
    title: "WEB & SEARCH",
    items: [
      { say: "Search for cute cats", does: "Google search in browser" },
      { say: "Play lofi beats on YouTube", does: "Searches & plays on YouTube" },
      { say: "Go to github.com", does: "Opens any URL" },
    ],
  },
  {
    title: "WHATSAPP MESSAGING",
    items: [
      { say: "Save contact mom +9779812345678", does: "Stores contact for voice use" },
      { say: "List contacts", does: "Reads back all saved contacts" },
      { say: "Send hi to mom on WhatsApp", does: "Opens WhatsApp Desktop, types & sends" },
      { say: "WhatsApp dad saying I'm coming home", does: "Same — by saved name" },
      { say: "Send hello to +9779812345678", does: "Send to raw phone number" },
    ],
  },
  {
    title: "SHOW NUMBERS / GRID  (precise voice clicking)",
    items: [
      { say: "Show numbers", does: "Numbers every clickable element on screen" },
      { say: "Click 5 / Click five", does: "Clicks the element labeled 5" },
      { say: "Double click 3", does: "Double clicks element 3" },
      { say: "Right click 2", does: "Right clicks element 2" },
      { say: "Hide numbers", does: "Removes the number overlay" },
      { say: "Show grid", does: "Splits screen into a 3×3 grid" },
      { say: "Click 5 (with grid)", does: "Clicks center of grid cell 5" },
      { say: "Hide grid", does: "Removes the grid overlay" },
    ],
  },
  {
    title: "MOUSE & CLICKING  (Mac Voice Control style)",
    items: [
      { say: "Click", does: "Single left click at cursor position" },
      { say: "Double click", does: "Double click" },
      { say: "Right click", does: "Right click (context menu)" },
      { say: "Scroll up / Scroll down", does: "Scrolls focused window" },
      { say: "Press enter / escape / space / tab", does: "Sends a single key" },
      { say: "Press up / down / left / right", does: "Arrow keys" },
    ],
  },
  {
    title: "KEYBOARD SHORTCUTS",
    items: [
      { say: "Copy that / Paste / Cut / Select all", does: "Cmd+C / V / X / A" },
      { say: "Undo / Redo", does: "Cmd+Z / Cmd+Shift+Z" },
      { say: "Save / Save file", does: "Cmd+S" },
      { say: "New tab / Close tab", does: "Cmd+T / Cmd+W" },
      { say: "Switch app / Next window", does: "Cmd+Tab" },
      { say: "Show desktop / Mission control", does: "F11 / F3" },
      { say: "Open Spotlight", does: "Cmd+Space" },
    ],
  },
  {
    title: "TYPING & DICTATION",
    items: [
      { say: "Type hello world", does: "Types text into focused field" },
      { say: "Write code for a snake game in python", does: "AI-generates and types code into editor" },
      { say: "Copy code for binary search in C++", does: "AI-generates code → clipboard only" },
    ],
  },
  {
    title: "MEDIA & SYSTEM",
    items: [
      { say: "Volume up / down / mute", does: "Adjusts Mac volume" },
      { say: "Take a screenshot", does: "Saves to home folder" },
      { say: "List files in Desktop", does: "Reads back files in path" },
      { say: "What's the time?", does: "Speaks current time" },
    ],
  },
];

export function VoiceCommandsPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return GROUPS;
    return GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.say.toLowerCase().includes(s) || i.does.toLowerCase().includes(s)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="panel w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hud-cyan/30">
          <div className="flex items-center gap-2 text-hud-cyan text-glow font-display tracking-[0.3em] text-sm">
            <Mic className="w-4 h-4" />
            WHAT CAN I SAY?
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-hud-red transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-hud-cyan/20 flex items-center gap-2">
          <Search className="w-4 h-4 text-hud-cyan/70" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search commands… (e.g. whatsapp, click, scroll)"
            className="flex-1 bg-transparent outline-none text-[12px] font-mono text-glow placeholder:text-foreground/30"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-5">
          {filtered.length === 0 && (
            <div className="text-center text-foreground/50 font-mono text-xs py-8">
              No commands match "{q}"
            </div>
          )}
          {filtered.map((g) => (
            <section key={g.title}>
              <h3 className="font-display tracking-[0.25em] text-[10px] text-hud-amber text-glow-amber mb-2">
                {g.title}
              </h3>
              <div className="space-y-1.5">
                {g.items.map((i) => (
                  <div
                    key={i.say}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 items-start py-1.5 px-2 border-l-2 border-hud-cyan/40 hover:bg-hud-cyan/5 transition-colors"
                  >
                    <div className="font-mono text-[12px] text-hud-cyan text-glow">
                      "{i.say}"
                    </div>
                    <div className="font-mono text-[11px] text-foreground/70 leading-relaxed">
                      {i.does}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-hud-cyan/20 font-mono text-[10px] text-foreground/50 tracking-wide">
          TIP // Say <span className="text-hud-cyan">"Jarvis on"</span> first to activate. Desktop agent must be running for system actions.
        </div>
      </div>
    </div>
  );
}
