// SanketBrain — central reactive store
import { useSyncExternalStore } from "react";

export type LogEntry = {
  id: number;
  time: string;
  kind: "system" | "user" | "jarvis" | "gesture" | "error";
  text: string;
};

export type AppId = "chrome" | "search" | "music" | "weather" | "notes" | "terminal";

export type OpenWindow = {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

type State = {
  active: boolean;
  listening: boolean;
  mouseEnabled: boolean;
  cameraReady: boolean;
  cursor: { x: number; y: number; visible: boolean; pinching: boolean };
  lastCommand: string;
  lastResponse: string;
  thinking: boolean;
  logs: LogEntry[];
  windows: OpenWindow[];
  zCounter: number;
  fingers: number;
};

let state: State = {
  active: false,
  listening: false,
  mouseEnabled: true,
  cameraReady: false,
  cursor: { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: false, pinching: false },
  lastCommand: "",
  lastResponse: "",
  thinking: false,
  logs: [],
  windows: [],
  zCounter: 10,
  fingers: 0,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const brain = {
  get: () => state,
  set(patch: Partial<State>) { state = { ...state, ...patch }; emit(); },
  log(kind: LogEntry["kind"], text: string) {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString("en-GB"),
      kind, text,
    };
    state = { ...state, logs: [...state.logs, entry].slice(-80) };
    emit();
  },
  openApp(app: AppId) {
    const titles: Record<AppId, string> = {
      chrome: "VIRTUAL.BROWSER",
      search: "WEB.SEARCH",
      music: "AUDIO.STREAM",
      weather: "WEATHER.NODE",
      notes: "NOTES.BUFFER",
      terminal: "SYS.TERMINAL",
    };
    const z = state.zCounter + 1;
    const w: OpenWindow = {
      id: app + "-" + Date.now(),
      app, title: titles[app],
      x: 80 + Math.random() * 120,
      y: 80 + Math.random() * 80,
      w: 460, h: 320, z,
    };
    state = { ...state, windows: [...state.windows, w], zCounter: z };
    emit();
  },
  closeWindow(id: string) {
    state = { ...state, windows: state.windows.filter((w) => w.id !== id) };
    emit();
  },
  focusWindow(id: string) {
    const z = state.zCounter + 1;
    state = {
      ...state,
      zCounter: z,
      windows: state.windows.map((w) => (w.id === id ? { ...w, z } : w)),
    };
    emit();
  },
  closeAll() { state = { ...state, windows: [] }; emit(); },
};

export function useBrain<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
