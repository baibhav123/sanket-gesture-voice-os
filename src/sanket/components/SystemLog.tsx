import { useBrain } from "@/sanket/store";
import { useEffect, useRef } from "react";

export function SystemLog() {
  const logs = useBrain((s) => s.logs);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 1e9 }); }, [logs]);

  const color = (k: string) =>
    k === "user" ? "text-hud-amber"
    : k === "jarvis" ? "text-hud-cyan text-glow"
    : k === "gesture" ? "text-hud-cyan/70"
    : k === "error" ? "text-hud-red text-glow-red"
    : "text-foreground/60";

  const tag = (k: string) =>
    k === "user" ? "USR"
    : k === "jarvis" ? "JVS"
    : k === "gesture" ? "GST"
    : k === "error" ? "ERR" : "SYS";

  return (
    <div className="panel h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-hud-cyan/30 flex items-center justify-between text-[10px] font-display tracking-widest text-hud-cyan/80">
        <span>SYSTEM_LOG // J.A.R.V.I.S.</span>
        <span className="text-hud-cyan/50">{logs.length.toString().padStart(3, "0")}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-3 text-[11px] leading-relaxed space-y-0.5 scanlines">
        {logs.length === 0 && <div className="text-foreground/30">// awaiting input…</div>}
        {logs.map((l) => (
          <div key={l.id} className={"flex gap-2 " + color(l.kind)}>
            <span className="text-foreground/30 shrink-0">{l.time}</span>
            <span className="text-foreground/40 shrink-0">[{tag(l.kind)}]</span>
            <span className="break-words">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
