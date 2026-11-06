export const K = 8;
export const W = 1600;
export const H = 1000;
const C = Math.cos(Math.PI / 6);

export type Pt = [number, number];

export const P = (x: number, y: number, z = 0): Pt => [(x - y) * C * K, (x + y) * 0.5 * K - z * K];

export function unproject(sx: number, sy: number, z = 0): Pt {
  const a = sx / (C * K);
  const b = (sy + z * K) / (0.5 * K);
  return [(a + b) / 2, (b - a) / 2];
}

export const pts = (list: Pt[]) => list.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

export const viewBox = (cx: number, cy: number, zoom: number) =>
  `${cx - W / (2 * zoom)} ${cy - H / (2 * zoom)} ${W / zoom} ${H / zoom}`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 12): Pt[] {
  return [...Array(n + 1).keys()].map((i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

export interface Path {
  length: number;
  at(s: number): { x: number; y: number; angle: number };
  nearest(p: Pt, from?: number, to?: number): { s: number; d: number };
}

export function makePath(points: Pt[]): Path {
  const acc = [0];
  for (let i = 1; i < points.length; i++) acc.push(acc[i - 1] + dist(points[i - 1], points[i]));
  const length = acc[acc.length - 1];
  const seg = (s: number) => {
    let i = 1;
    while (i < points.length - 1 && acc[i] < s) i++;
    return i;
  };
  return {
    length,
    at(s) {
      const c = clamp(s, 0, length);
      const i = seg(c);
      const a = points[i - 1];
      const b = points[i];
      const t = acc[i] === acc[i - 1] ? 0 : (c - acc[i - 1]) / (acc[i] - acc[i - 1]);
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
    nearest(p, from = 0, to = length) {
      let best = { s: from, d: Infinity };
      for (let s = from; s <= to; s += 0.25) {
        const q = this.at(s);
        const d = Math.hypot(q.x - p[0], q.y - p[1]);
        if (d < best.d) best = { s, d };
      }
      return best;
    },
  };
}

export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => clamp(Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255);
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Pt {
  const m = svg.getScreenCTM();
  if (!m) return [0, 0];
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  return [p.x, p.y];
}

export const gateY = (gate: number) => 30 + gate * 58;

/** wall clock for event handlers and animation loops */
export const clock = () => performance.now();

/** pointer capture can throw when the pointer is already gone */
export function capture(el: Element | null, pointerId: number) {
  try {
    el?.setPointerCapture(pointerId);
  } catch {
    // dragging still works without capture while the pointer stays over the element
  }
}
