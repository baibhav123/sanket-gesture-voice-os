// SanketX — macOS Voice Control style "Show Numbers" + "Show Grid"
// Pure DOM overlay. Numbers are layered on top of every clickable element
// in the HUD; voice commands like "click 5" trigger the corresponding click.
//
// Usage: import { numberOverlay } from "@/sanket/numberOverlay";
//        numberOverlay.showNumbers(); numberOverlay.hideNumbers();
//        numberOverlay.showGrid();    numberOverlay.hideGrid();
//        numberOverlay.activate(n, kind);  // "click" | "doubleclick" | "rightclick"
import { desktop } from "./desktop";

const LAYER_ID = "sanketx-number-layer";
const GRID_ID = "sanketx-grid-layer";

type Target = { el: HTMLElement; rect: DOMRect };

class NumberOverlay {
  private targets: Target[] = [];
  private numbersOn = false;
  private gridOn = false;
  private resizeHandler = () => this.numbersOn && this.refresh();

  // ---------- NUMBERS ----------
  showNumbers() {
    this.hideGrid();
    this.numbersOn = true;
    this.refresh();
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("scroll", this.resizeHandler, true);
  }

  hideNumbers() {
    this.numbersOn = false;
    document.getElementById(LAYER_ID)?.remove();
    this.targets = [];
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("scroll", this.resizeHandler, true);
  }

  toggleNumbers() {
    this.numbersOn ? this.hideNumbers() : this.showNumbers();
  }

  isNumbersOn() { return this.numbersOn; }
  isGridOn() { return this.gridOn; }

  private collectTargets(): HTMLElement[] {
    const sel = [
      "button",
      "a[href]",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "[data-clickable]",
      "[onclick]",
    ].join(",");
    const all = Array.from(document.querySelectorAll<HTMLElement>(sel));
    return all.filter((el) => {
      if (el.closest(`#${LAYER_ID}`)) return false;
      if (el.hasAttribute("disabled")) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) return false;
      if (r.bottom < 0 || r.top > window.innerHeight) return false;
      if (r.right < 0 || r.left > window.innerWidth) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.05) return false;
      return true;
    });
  }

  private refresh() {
    document.getElementById(LAYER_ID)?.remove();
    const layer = document.createElement("div");
    layer.id = LAYER_ID;
    Object.assign(layer.style, {
      position: "fixed", inset: "0", zIndex: "999999",
      pointerEvents: "none", fontFamily: "ui-monospace,monospace",
    } as CSSStyleDeclaration);

    const els = this.collectTargets();
    this.targets = els.map((el) => ({ el, rect: el.getBoundingClientRect() }));

    this.targets.forEach(({ rect }, i) => {
      const n = i + 1;
      const tag = document.createElement("div");
      tag.textContent = String(n);
      Object.assign(tag.style, {
        position: "absolute",
        top: `${Math.max(2, rect.top + 2)}px`,
        left: `${Math.max(2, rect.left + 2)}px`,
        minWidth: "20px", height: "20px", padding: "0 5px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "hsl(180 100% 50% / 0.95)",
        color: "hsl(220 40% 8%)",
        border: "1px solid hsl(180 100% 70%)",
        borderRadius: "4px",
        fontSize: "11px", fontWeight: "700",
        boxShadow: "0 0 8px hsl(180 100% 50% / 0.6)",
        pointerEvents: "none",
      } as CSSStyleDeclaration);
      layer.appendChild(tag);
    });
    document.body.appendChild(layer);
  }

  /** Trigger element #n with the given click kind. */
  activate(n: number, kind: "click" | "doubleclick" | "rightclick" = "click") {
    const t = this.targets[n - 1];
    if (!t) return false;

    // Visual flash
    const orig = t.el.style.outline;
    t.el.style.outline = "2px solid hsl(180 100% 50%)";
    setTimeout(() => { t.el.style.outline = orig; }, 350);

    const opts: MouseEventInit = {
      bubbles: true, cancelable: true, view: window,
      clientX: t.rect.left + t.rect.width / 2,
      clientY: t.rect.top + t.rect.height / 2,
      button: kind === "rightclick" ? 2 : 0,
    };
    if (kind === "rightclick") {
      t.el.dispatchEvent(new MouseEvent("contextmenu", opts));
    } else if (kind === "doubleclick") {
      t.el.dispatchEvent(new MouseEvent("click", opts));
      t.el.dispatchEvent(new MouseEvent("dblclick", opts));
    } else {
      // Real click — also focus inputs
      if (t.el instanceof HTMLInputElement || t.el instanceof HTMLTextAreaElement) t.el.focus();
      t.el.click();
    }
    this.hideNumbers();
    return true;
  }

  // ---------- GRID ----------
  showGrid() {
    this.hideNumbers();
    this.gridOn = true;
    document.getElementById(GRID_ID)?.remove();
    const layer = document.createElement("div");
    layer.id = GRID_ID;
    Object.assign(layer.style, {
      position: "fixed", inset: "0", zIndex: "999998",
      pointerEvents: "none",
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
    } as CSSStyleDeclaration);

    for (let i = 1; i <= 9; i++) {
      const cell = document.createElement("div");
      Object.assign(cell.style, {
        border: "1px solid hsl(180 100% 50% / 0.4)",
        background: "hsl(180 100% 50% / 0.04)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "hsl(180 100% 70%)",
        fontFamily: "ui-monospace,monospace",
        fontSize: "44px", fontWeight: "700",
        textShadow: "0 0 12px hsl(180 100% 50% / 0.8)",
      } as CSSStyleDeclaration);
      cell.textContent = String(i);
      layer.appendChild(cell);
    }
    document.body.appendChild(layer);
  }

  hideGrid() {
    this.gridOn = false;
    document.getElementById(GRID_ID)?.remove();
  }

  toggleGrid() { this.gridOn ? this.hideGrid() : this.showGrid(); }

  /** Move cursor (real desktop if online, else virtual) to grid cell n's center. */
  activateGridCell(n: number, kind: "click" | "doubleclick" | "rightclick" = "click") {
    if (n < 1 || n > 9) return false;
    const col = (n - 1) % 3, row = Math.floor((n - 1) / 3);
    const cellW = window.innerWidth / 3, cellH = window.innerHeight / 3;
    const x = cellW * col + cellW / 2;
    const y = cellH * row + cellH / 2;

    if (desktop.isOnline()) {
      // Move OS cursor + click via the agent
      const sx = x / window.innerWidth, sy = y / window.innerHeight;
      desktop.fire("move_norm", { x: sx, y: sy });
      setTimeout(() => {
        desktop.fire("click", {
          button: kind === "rightclick" ? "right" : "left",
          clicks: kind === "doubleclick" ? 2 : 1,
        });
      }, 120);
    } else {
      // Click whatever is at that point in the browser
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (el) {
        const opts: MouseEventInit = {
          bubbles: true, cancelable: true, view: window,
          clientX: x, clientY: y,
          button: kind === "rightclick" ? 2 : 0,
        };
        if (kind === "rightclick") el.dispatchEvent(new MouseEvent("contextmenu", opts));
        else if (kind === "doubleclick") {
          el.dispatchEvent(new MouseEvent("click", opts));
          el.dispatchEvent(new MouseEvent("dblclick", opts));
        } else el.click();
      }
    }
    this.hideGrid();
    return true;
  }
}

export const numberOverlay = new NumberOverlay();

// Convert spoken numbers -> digits ("five" -> 5)
const WORD_NUMS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, for: 4, five: 5,
  six: 6, seven: 7, ate: 8, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};
export function parseSpokenNumber(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (t in WORD_NUMS) return WORD_NUMS[t];
  return null;
}
