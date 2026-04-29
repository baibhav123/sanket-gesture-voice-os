import { useEffect, useRef } from "react";
import { useVoice } from "@/sanket/useVoice";
import { useGesture } from "@/sanket/useGesture";
import { useBrain, brain } from "@/sanket/store";
import { VirtualCursor } from "@/sanket/components/VirtualCursor";
import { SystemLog } from "@/sanket/components/SystemLog";
import { StatusPanel } from "@/sanket/components/StatusPanel";
import { WindowLayer } from "@/sanket/components/Windows";
import { AppDock } from "@/sanket/components/AppDock";
import { CameraFeed } from "@/sanket/components/CameraFeed";
import { CommandBar } from "@/sanket/components/CommandBar";
import { BootOverlay } from "@/sanket/components/BootOverlay";

const Index = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voice = useVoice();
  useGesture(videoRef);
  const active = useBrain((s) => s.active);

  useEffect(() => {
    document.title = "SanketX 2047 — Voice + Gesture OS";
    brain.log("system", "// SANKETX 2047 BOOT // STANDBY MODE");
  }, []);

  // Auto-start mic when system activates
  useEffect(() => {
    if (active) voice.start();
    else voice.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hud-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 scanlines pointer-events-none" />
      <div className="absolute left-0 right-0 h-24 pointer-events-none" style={{ background: "var(--gradient-scan)", animation: "hud-scan 6s linear infinite" }} />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-hud-cyan/20">
        <h1 className="font-display tracking-[0.4em] text-hud-cyan text-glow text-sm">
          SANKET<span className="text-hud-amber text-glow-amber">X</span> · 2047
        </h1>
        <div className="font-mono text-[10px] text-foreground/60 tracking-widest">
          NODE-07 // PROTOCOL J.A.R.V.I.S.
        </div>
      </header>

      {/* Main grid */}
      <div className="relative z-10 grid grid-cols-12 gap-3 p-3 h-[calc(100vh-58px-72px)]">
        {/* Left column */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <StatusPanel />
          <CameraFeed videoRef={videoRef} />
        </div>

        {/* Center virtual desktop */}
        <section className="col-span-6 panel relative overflow-hidden">
          <div className="px-3 py-1.5 border-b border-hud-cyan/30 flex items-center justify-between text-[10px] font-display tracking-widest text-hud-cyan/80">
            <span>VIRTUAL.DESKTOP</span>
            <span className="text-hud-cyan/50">SECTOR // 2047.NEXUS</span>
          </div>
          <div className="absolute inset-0 top-7 hud-grid opacity-50" />
          <WindowLayer />
          <BootOverlay />
        </section>

        {/* Right column */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <AppDock />
          <div className="flex-1 min-h-0"><SystemLog /></div>
        </div>
      </div>

      {/* Bottom command bar */}
      <footer className="relative z-20 px-3 pb-3">
        <CommandBar voice={voice} />
      </footer>

      <VirtualCursor />
    </main>
  );
};

export default Index;
