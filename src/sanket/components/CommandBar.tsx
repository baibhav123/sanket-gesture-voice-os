import { useBrain, brain } from "@/sanket/store";
import { handleCommand } from "@/sanket/commands";
import { Mic, MicOff, Power, Send, Video, VideoOff, HelpCircle } from "lucide-react";
import { useState } from "react";
import { VoiceCommandsPanel } from "./VoiceCommandsPanel";

export function CommandBar({ voice }: { voice: { start: () => void; stop: () => void } }) {
  const active = useBrain((s) => s.active);
  const listening = useBrain((s) => s.listening);
  const cameraEnabled = useBrain((s) => s.cameraEnabled);
  const cameraReady = useBrain((s) => s.cameraReady);
  const lastCommand = useBrain((s) => s.lastCommand);
  const lastResponse = useBrain((s) => s.lastResponse);
  const thinking = useBrain((s) => s.thinking);
  const [text, setText] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const toggleCamera = () => {
    const next = !cameraEnabled;
    brain.set({ cameraEnabled: next });
    brain.log("system", next ? "// VISION.LINK :: REQUESTED ON" : "// VISION.LINK :: OFF");
  };

  return (
    <div className="panel px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => handleCommand(active ? "jarvis off" : "jarvis on")}
        className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
          active ? "border-hud-red text-hud-red text-glow-red" : "border-hud-cyan text-hud-cyan text-glow hover:bg-hud-cyan/10"
        }`}
        title={active ? "Shutdown" : "Activate"}
      >
        <Power className="w-4 h-4" />
      </button>

      <button
        onClick={() => (listening ? voice.stop() : voice.start())}
        disabled={!active}
        className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all disabled:opacity-30 ${
          listening ? "border-hud-amber text-hud-amber text-glow-amber animate-hud-pulse" : "border-hud-cyan/60 text-hud-cyan/80 hover:bg-hud-cyan/10"
        }`}
        title={listening ? "Mic ON — click to mute" : "Mic OFF — click to listen"}
      >
        {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </button>

      <button
        onClick={toggleCamera}
        className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
          cameraEnabled && cameraReady
            ? "border-hud-amber text-hud-amber text-glow-amber"
            : cameraEnabled
              ? "border-hud-cyan/60 text-hud-cyan/80 animate-hud-pulse"
              : "border-foreground/30 text-foreground/40 hover:bg-hud-cyan/10"
        }`}
        title={cameraEnabled ? "Camera ON — click to turn off" : "Camera OFF — click to enable gesture"}
      >
        {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
      </button>

      <div className="flex-1 grid grid-cols-2 gap-3 text-[11px] font-mono min-w-0">
        <div className="min-w-0">
          <div className="text-[9px] tracking-widest text-foreground/50">COMMAND</div>
          <div className="text-glow-amber truncate">{lastCommand || "—"}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] tracking-widest text-foreground/50">RESPONSE {thinking && <span className="text-hud-amber animate-hud-pulse">// processing…</span>}</div>
          <div className="text-glow truncate">{lastResponse || "—"}</div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          handleCommand(text.trim());
          setText("");
        }}
        className="shrink-0 flex items-center gap-2 border border-hud-cyan/40 px-2 py-1.5 bg-hud-deep"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={active ? "type command…" : 'type "jarvis on"'}
          className="bg-transparent text-[11px] font-mono outline-none w-44 placeholder:text-foreground/30 text-glow"
        />
        <button type="submit" className="text-hud-cyan hover:text-glow"><Send className="w-3.5 h-3.5" /></button>
      </form>
    </div>
  );
}
