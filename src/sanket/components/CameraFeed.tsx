import { useBrain } from "@/sanket/store";

export function CameraFeed({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const ready = useBrain((s) => s.cameraReady);
  const fingers = useBrain((s) => s.fingers);
  return (
    <div className="panel p-2">
      <div className="flex items-center justify-between text-[10px] font-display tracking-widest mb-2">
        <span className="text-hud-cyan/80">VISION.LINK</span>
        <span className={ready ? "text-hud-cyan text-glow" : "text-foreground/40"}>{ready ? "LIVE" : "OFFLINE"}</span>
      </div>
      <div className="relative aspect-video bg-hud-deep border border-hud-cyan/40 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] opacity-80" />
        <div className="absolute inset-0 hud-grid pointer-events-none" />
        <div className="absolute inset-0 scanlines pointer-events-none" />
        <div className="absolute top-1 left-1 text-[9px] font-mono text-hud-amber text-glow-amber">FNG:{fingers}</div>
        <div className="absolute top-1 right-1 text-[9px] font-mono text-hud-cyan text-glow">REC●</div>
      </div>
    </div>
  );
}
