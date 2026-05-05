import { useEffect, useRef } from "react";
import { createRecognition, isJarvisSpeaking, isEchoOfJarvis } from "./speech";
import { brain } from "./store";
import { handleCommand } from "./commands";

export function useVoice() {
  const recRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const lastFired = useRef<string>("");
  const lastFiredAt = useRef<number>(0);
  const pendingText = useRef<string>("");
  const pendingTimer = useRef<number | null>(null);

  useEffect(() => {
    const flush = () => {
      const txt = pendingText.current.trim();
      pendingText.current = "";
      pendingTimer.current = null;
      if (!txt) return;
      const now = Date.now();
      const norm = txt.toLowerCase();
      if (norm === lastFired.current && now - lastFiredAt.current < 1500) return;
      lastFired.current = norm;
      lastFiredAt.current = now;
      handleCommand(txt);
    };
    const queue = (text: string) => {
      // Coalesce partials: keep the longest/most-complete phrase within window.
      const prev = pendingText.current.toLowerCase();
      const cur = text.toLowerCase();
      if (!prev || cur.length >= prev.length || !cur.includes(prev)) {
        pendingText.current = text;
      }
      if (pendingTimer.current != null) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(flush, 700);
    };

    const rec = createRecognition({
      onResult: (text, isFinal) => {
        if (isJarvisSpeaking()) return;
        if (!isFinal || !text) return;
        if (isEchoOfJarvis(text)) {
          brain.log("system", `// ECHO.FILTER dropped: "${text}"`);
          return;
        }
        queue(text);
      },
      onEnd: () => {
        if (brain.get().listening && !isJarvisSpeaking()) setTimeout(() => rec.start(), 150);
      },
      onError: (err) => {
        if (err === "not-allowed") {
          brain.set({ listening: false });
          brain.log("error", "// MIC PERMISSION DENIED");
        }
      },
    });
    recRef.current = rec;
    const pauseForSpeech = () => rec.stop();
    const resumeAfterSpeech = () => {
      if (brain.get().listening) setTimeout(() => rec.start(), 950);
    };
    window.addEventListener("jarvis:speech-start", pauseForSpeech);
    window.addEventListener("jarvis:speech-end", resumeAfterSpeech);
    return () => {
      window.removeEventListener("jarvis:speech-start", pauseForSpeech);
      window.removeEventListener("jarvis:speech-end", resumeAfterSpeech);
      rec.stop();
    };
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
