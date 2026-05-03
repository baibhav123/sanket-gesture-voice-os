// Voice utilities: Web Speech API recognition + speechSynthesis
export type SpeechRec = {
  start: () => void;
  stop: () => void;
  supported: boolean;
};

const speechState = { speaking: false, ignoreUntil: 0 };

// Recent things Jarvis said — used to filter mic echo
const recentSpoken: { text: string; until: number }[] = [];

export function isJarvisSpeaking() {
  return speechState.speaking || Date.now() < speechState.ignoreUntil;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string) {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

/** True if `heard` looks like an echo of something Jarvis recently spoke. */
export function isEchoOfJarvis(heard: string): boolean {
  const now = Date.now();
  // prune
  for (let i = recentSpoken.length - 1; i >= 0; i--) {
    if (recentSpoken[i].until < now) recentSpoken.splice(i, 1);
  }
  const h = normalize(heard);
  if (!h) return false;
  const ht = tokens(h);
  if (ht.size === 0) return false;
  for (const r of recentSpoken) {
    const rt = tokens(r.text);
    if (rt.size === 0) continue;
    let overlap = 0;
    ht.forEach((t) => { if (rt.has(t)) overlap++; });
    const ratio = overlap / ht.size;
    // Heard phrase is mostly contained in something Jarvis said → echo
    if (ratio >= 0.6 || (overlap >= 2 && ht.size <= 4)) return true;
  }
  return false;
}

function rememberSpoken(text: string) {
  const t = normalize(text);
  if (!t) return;
  recentSpoken.push({ text: t, until: Date.now() + 6000 });
  if (recentSpoken.length > 8) recentSpoken.shift();
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
