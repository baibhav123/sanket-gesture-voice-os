import { useBrain } from "@/sanket/store";

export function BootOverlay() {
  const active = useBrain((s) => s.active);
  if (active) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center">
      <div className="text-center space-y-6 animate-boot">
        <div className="font-display text-6xl md:text-8xl tracking-[0.3em] text-hud-cyan text-glow animate-flicker">
          SANKET<span className="text-hud-amber text-glow-amber">X</span>
        </div>
        <div className="font-display text-xs tracking-[0.6em] text-hud-cyan/70">
          AI · GESTURE · VOICE OS — 2047
        </div>
        <div className="text-[11px] font-mono text-foreground/50 max-w-md mx-auto leading-relaxed">
          Hands-free interface protocol. Say <span className="text-glow-amber">"jarvis on"</span> or press the power node to initialize the neural link.
        </div>
        <div className="flex justify-center gap-1 pt-2">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="w-1 h-4 bg-hud-cyan animate-hud-pulse" style={{ animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
