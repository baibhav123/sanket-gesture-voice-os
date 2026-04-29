import { brain } from "@/sanket/store";
import { Globe, Search, Music, CloudSun, StickyNote, Terminal } from "lucide-react";

const apps = [
  { id: "chrome" as const, label: "BROWSER", Icon: Globe },
  { id: "search" as const, label: "SEARCH", Icon: Search },
  { id: "music" as const, label: "AUDIO", Icon: Music },
  { id: "weather" as const, label: "WEATHER", Icon: CloudSun },
  { id: "notes" as const, label: "NOTES", Icon: StickyNote },
  { id: "terminal" as const, label: "SHELL", Icon: Terminal },
];

export function AppDock() {
  return (
    <div className="panel p-3">
      <div className="font-display text-[10px] tracking-widest text-hud-cyan/80 mb-3">APP.GRID</div>
      <div className="grid grid-cols-3 gap-2">
        {apps.map(({ id, label, Icon }) => (
          <button key={id}
            onClick={() => { brain.openApp(id); brain.log("user", "open " + id); }}
            className="border border-hud-cyan/30 p-2 flex flex-col items-center gap-1 hover:bg-hud-cyan/10 hover:border-hud-cyan transition-colors group"
          >
            <Icon className="w-5 h-5 text-hud-cyan group-hover:text-glow" />
            <span className="text-[9px] font-mono text-foreground/70 group-hover:text-hud-cyan">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
