import { useBrain } from "@/sanket/store";

export function VirtualCursor() {
  const cursor = useBrain((s) => s.cursor);
  const active = useBrain((s) => s.active && s.mouseEnabled);
  if (!active || !cursor.visible) return null;
  const size = cursor.pinching ? 28 : 44;
  return (
    <div
      className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[width,height,opacity] duration-100"
      style={{ left: cursor.x, top: cursor.y, width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full border-2 border-hud-cyan" style={{ boxShadow: "0 0 14px hsl(var(--hud-cyan)), inset 0 0 10px hsl(var(--hud-cyan)/0.5)" }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-hud-amber" style={{ boxShadow: "0 0 8px hsl(var(--hud-amber))" }} />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-px h-3 bg-hud-cyan" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-px h-3 bg-hud-cyan" />
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-px w-3 bg-hud-cyan" />
      <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-px w-3 bg-hud-cyan" />
    </div>
  );
}
