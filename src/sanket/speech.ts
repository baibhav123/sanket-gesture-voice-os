// Voice utilities: Web Speech API recognition + speechSynthesis
export type SpeechRec = {
  start: () => void;
  stop: () => void;
  supported: boolean;
};

const speechState = { speaking: false, ignoreUntil: 0 };

export function isJarvisSpeaking() {
  return speechState.speaking || Date.now() < speechState.ignoreUntil;
}

export function createRecognition(opts: {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}): SpeechRec {
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return { start: () => {}, stop: () => {}, supported: false };

  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";

  rec.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      opts.onResult(r[0].transcript.trim(), r.isFinal);
    }
  };
  rec.onerror = (e: any) => opts.onError?.(e.error || "err");
  rec.onend = () => opts.onEnd?.();

  let running = false;
  return {
    supported: true,
    start: () => {
      if (running) return;
      try { rec.start(); running = true; } catch {}
    },
    stop: () => {
      try { rec.stop(); } catch {}
      running = false;
    },
  };
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (voice) return voice;
  const voices = window.speechSynthesis?.getVoices?.() || [];
  voice =
    voices.find((v) => /Google UK English Male|Daniel|Microsoft Guy/i.test(v.name)) ||
    voices.find((v) => v.lang?.startsWith("en")) ||
    voices[0] || null;
  return voice;
}

export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.0;
  u.pitch = 0.9;
  u.volume = 1;
  speechState.speaking = true;
  speechState.ignoreUntil = Date.now() + Math.max(1800, text.length * 75);
  u.onend = () => {
    speechState.speaking = false;
    speechState.ignoreUntil = Date.now() + 900;
    window.dispatchEvent(new Event("jarvis:speech-end"));
  };
  u.onerror = () => {
    speechState.speaking = false;
    speechState.ignoreUntil = Date.now() + 900;
    window.dispatchEvent(new Event("jarvis:speech-end"));
  };
  window.speechSynthesis.cancel();
  window.dispatchEvent(new Event("jarvis:speech-start"));
  window.speechSynthesis.speak(u);
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };
}
