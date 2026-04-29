import { useBrain } from "@/sanket/store";
import { useEffect, useState } from "react";

function Reticle() {
  return (
    <div className="relative w-56 h-56">
      <div className="absolute inset-0 rounded-full border border-hud-cyan/40 animate-spin-slow"
        style={{ borderStyle: "dashed" }} />
      <div className="absolute inset-3 rounded-full border-2 border-hud-cyan/60 animate-spin-rev" />
      <div className="absolute inset-8 rounded-full border border-hud-amber/50 animate-spin-slow" />
      <div className="absolute inset-0 flex items-center justify-center font-display text-hud-cyan text-glow text-2xl tracking-[0.3em]">
        JARVIS
      </div>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-4 bg-hud-cyan" />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-px h-4 bg-hud-cyan" />
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-px w-4 bg-hud-cyan" />
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-px w-4 bg-hud-cyan" />
    </div>
  );
}

export function StatusPanel() {
  const { active, listening, mouseEnabled, cameraReady, fingers, thinking } = useBrain((s) => ({
    active: s.active, listening: s.listening, mouseEnabled: s.mouseEnabled,
    cameraReady: s.cameraReady, fingers: s.fingers, thinking: s.thinking,
  }));
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const dot = (on: boolean) =>
    `inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${on ? "bg-hud-cyan animate-hud-pulse" : "bg-foreground/30"}`;

  return (
    <div className="panel p-4 flex flex-col items-center gap-3">
      <Reticle />
      <div className="font-display text-[11px] tracking-widest text-hud-cyan/80">
        {active ? "// SYSTEM ONLINE" : "// SYSTEM STANDBY"}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono w-full">
        <div><span className={dot(listening)} />MIC</div>
        <div><span className={dot(cameraReady)} />CAM</div>
        <div><span className={dot(mouseEnabled && active)} />GST</div>
        <div><span className={dot(thinking)} />AI</div>
      </div>
      <div className="w-full text-[10px] font-mono space-y-1 pt-2 border-t border-hud-cyan/20">
        <div className="flex justify-between"><span className="text-foreground/50">TIME</span><span className="text-glow">{now.toLocaleTimeString("en-GB")}</span></div>
        <div className="flex justify-between"><span className="text-foreground/50">FNGR</span><span className="text-glow-amber">{fingers}</span></div>
        <div className="flex justify-between"><span className="text-foreground/50">YEAR</span><span>2047</span></div>
      </div>
    </div>
  );
}
