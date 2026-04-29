// MediaPipe Hands via CDN — virtual cursor + pinch click
import { useEffect, useRef } from "react";
import { brain } from "./store";

declare global { interface Window { Hands?: any; Camera?: any; } }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => resolve(); s.onerror = () => reject(new Error("load " + src));
    document.head.appendChild(s);
  });
}

async function ensureMediaPipe() {
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
}

export function useGesture(videoRef: React.RefObject<HTMLVideoElement>) {
  const handsRef = useRef<any>(null);
  const camRef = useRef<any>(null);
  const smoothRef = useRef<{ x: number; y: number } | null>(null);
  const pinchHoldRef = useRef<{ down: boolean; lastClick: number }>({ down: false, lastClick: 0 });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await ensureMediaPipe();
        if (cancelled || !window.Hands || !videoRef.current) return;

        const hands = new window.Hands({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((res: any) => onResults(res));
        handsRef.current = hands;

        const cam = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 320, height: 240,
        });
        camRef.current = cam;
        await cam.start();
        brain.set({ cameraReady: true });
        brain.log("system", "// VISION.LINK ONLINE");
      } catch (e: any) {
        brain.log("error", "// VISION.LINK FAILED: " + (e?.message || ""));
      }
    }

    function countFingers(lm: any[]) {
      // thumb tip 4, index 8, middle 12, ring 16, pinky 20
      const tipsPip = [[8, 6], [12, 10], [16, 14], [20, 18]];
      let n = 0;
      for (const [tip, pip] of tipsPip) if (lm[tip].y < lm[pip].y) n++;
      // thumb (mirrored x)
      if (lm[4].x < lm[3].x) n++;
      return n;
    }

    function onResults(res: any) {
      const s = brain.get();
      if (!s.active || !s.mouseEnabled) {
        brain.set({ cursor: { ...s.cursor, visible: false }, fingers: 0 });
        return;
      }
      const list = res.multiHandLandmarks;
      if (!list || !list.length) {
        brain.set({ cursor: { ...s.cursor, visible: false }, fingers: 0 });
        return;
      }
      const lm = list[0];
      const idx = lm[8];     // index tip
      const thb = lm[4];     // thumb tip
      const fingers = countFingers(lm);

      // mirror X (selfie)
      const targetX = (1 - idx.x) * window.innerWidth;
      const targetY = idx.y * window.innerHeight;

      const prev = smoothRef.current || { x: targetX, y: targetY };
      const x = prev.x + (targetX - prev.x) * 0.35;
      const y = prev.y + (targetY - prev.y) * 0.35;
      smoothRef.current = { x, y };

      // pinch detection (index<->thumb distance in normalized image space)
      const dx = idx.x - thb.x, dy = idx.y - thb.y;
      const dist = Math.hypot(dx, dy);
      const pinching = dist < 0.055;

      if (pinching && !pinchHoldRef.current.down) {
        pinchHoldRef.current.down = true;
        const now = Date.now();
        if (now - pinchHoldRef.current.lastClick > 250) {
          pinchHoldRef.current.lastClick = now;
          syntheticClick(x, y);
          brain.log("gesture", "// PINCH.CLICK @ " + Math.round(x) + "," + Math.round(y));
        }
      } else if (!pinching) {
        pinchHoldRef.current.down = false;
      }

      brain.set({
        cursor: { x, y, visible: true, pinching },
        fingers,
      });
    }

    function syntheticClick(x: number, y: number) {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!el) return;
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }));
      el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y }));
      el.click?.();
    }

    init();
    return () => {
      cancelled = true;
      try { camRef.current?.stop?.(); } catch {}
      try { handsRef.current?.close?.(); } catch {}
      brain.set({ cameraReady: false });
    };
  }, [videoRef]);
}
