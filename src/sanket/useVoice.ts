import { useEffect, useRef } from "react";
import { createRecognition, isJarvisSpeaking } from "./speech";
import { brain } from "./store";
import { handleCommand } from "./commands";

export function useVoice() {
  const recRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const lastFinal = useRef<string>("");

  useEffect(() => {
    const rec = createRecognition({
      onResult: (text, isFinal) => {
        if (isJarvisSpeaking()) return;
        if (isFinal && text && text !== lastFinal.current) {
          lastFinal.current = text;
          handleCommand(text);
        }
      },
      onEnd: () => {
        // auto-restart while listening flag is on
        if (brain.get().listening) setTimeout(() => rec.start(), 400);
      },
      onError: (err) => {
        if (err === "not-allowed") {
          brain.set({ listening: false });
          brain.log("error", "// MIC PERMISSION DENIED");
        }
      },
    });
    recRef.current = rec;
    return () => rec.stop();
  }, []);

  return {
    start: () => {
      const rec = recRef.current; if (!rec) return;
      if (!rec.supported) {
        brain.log("error", "// VOICE.API UNSUPPORTED — USE TEXT INPUT");
        return;
      }
      brain.set({ listening: true });
      brain.log("system", "// VOICE.LINK ACTIVE");
      rec.start();
    },
    stop: () => {
      brain.set({ listening: false });
      recRef.current?.stop();
      brain.log("system", "// VOICE.LINK CLOSED");
    },
  };
}
