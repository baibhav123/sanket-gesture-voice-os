import { useBrain, brain, OpenWindow } from "@/sanket/store";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

function ChromeApp() {
  return (
    <div className="p-4 space-y-2">
      <div className="text-[10px] font-display tracking-widest text-hud-cyan/70">VIRTUAL.BROWSER v2047</div>
      <div className="text-xl font-display text-glow">SANKETNET</div>
      <div className="text-[11px] text-foreground/60">Simulated browser shell. The web of 2047 is rendered through neural compositing.</div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        {["NEWS", "MAIL", "MAPS", "DRIVE", "CHAT", "VIDEO"].map((t) => (
          <div key={t} className="border border-hud-cyan/30 px-2 py-3 text-center text-[11px] hover:bg-hud-cyan/10 cursor-pointer">{t}</div>
        ))}
      </div>
    </div>
  );
}
function SearchApp() {
  return (
    <div className="p-4 space-y-3">
      <div className="text-[10px] font-display tracking-widest text-hud-cyan/70">WEB.SEARCH</div>
      <div className="border border-hud-cyan/40 px-3 py-2 text-glow-amber text-sm">{brain.get().lastCommand || "..."}</div>
      <div className="space-y-2 text-[11px]">
        {[1,2,3].map((i) => (
          <div key={i} className="border-l-2 border-hud-cyan/50 pl-2">
            <div className="text-glow text-[12px]">Result Node {i}</div>
            <div className="text-foreground/50">Indexed by SanketCrawler // depth {i}.{i}{i}s</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MusicApp() {
  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="text-[10px] font-display tracking-widest text-hud-cyan/70">AUDIO.STREAM</div>
      <div className="font-display text-glow text-lg">NEURAL_RAVE.mp4</div>
      <div className="flex items-end gap-1 h-16">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-1 bg-hud-cyan animate-hud-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.07}s`, boxShadow: "0 0 6px hsl(var(--hud-cyan))" }} />
        ))}
      </div>
      <div className="text-[10px] text-foreground/50">▶  03:14 / 06:42</div>
    </div>
  );
}
function WeatherApp() {
  return (
    <div className="p-4 space-y-2 text-center">
      <div className="text-[10px] font-display tracking-widest text-hud-cyan/70">WEATHER.NODE</div>
      <div className="text-5xl font-display text-glow">28°</div>
      <div className="text-[11px] text-glow-amber">DELHI // SECTOR-7</div>
      <div className="text-[10px] text-foreground/50">PARTLY IONIZED · WIND 14kph · HUM 62%</div>
    </div>
  );
}
function NotesApp() {
  const [v, setV] = useState("// dictate notes via voice…\n");
  return (
    <div className="p-3 h-full flex flex-col">
      <div className="text-[10px] font-display tracking-widest text-hud-cyan/70 mb-2">NOTES.BUFFER</div>
      <textarea value={v} onChange={(e) => setV(e.target.value)} className="flex-1 bg-transparent border border-hud-cyan/30 p-2 text-[12px] outline-none resize-none text-foreground" />
    </div>
  );
}
function TerminalApp() {
  const [lines, setLines] = useState<string[]>([
    "SanketX 2047 // Terminal v9.4",
    "boot sequence … OK",
    "neural link … OK",
    "$ _",
  ]);
  useEffect(() => {
    const t = setInterval(() => {
      setLines((l) => [...l.slice(-12), `[${new Date().toLocaleTimeString()}] heartbeat ok ${Math.floor(Math.random() * 999)}`]);
    }, 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="p-3 text-[11px] leading-relaxed text-glow">
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

const APPS = { chrome: ChromeApp, search: SearchApp, music: MusicApp, weather: WeatherApp, notes: NotesApp, terminal: TerminalApp };

export function WindowFrame({ w }: { w: OpenWindow }) {
  const Comp = APPS[w.app];
  return (
    <div
      onMouseDown={() => brain.focusWindow(w.id)}
      className="panel absolute animate-boot overflow-hidden"
      style={{ left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z }}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-hud-cyan/30 bg-hud-mid/40">
        <div className="font-display text-[10px] tracking-widest text-hud-cyan text-glow">{w.title}</div>
        <button onClick={() => brain.closeWindow(w.id)} className="hover:text-hud-red">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="h-[calc(100%-30px)] overflow-y-auto"><Comp /></div>
    </div>
  );
}

export function WindowLayer() {
  const windows = useBrain((s) => s.windows);
  return <>{windows.map((w) => <WindowFrame key={w.id} w={w} />)}</>;
}
