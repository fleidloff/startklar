import type { ReactNode } from "react";
import { aircraft } from "@/game/data";
import { K, P, pts, shade, type Pt } from "@/game/iso";

export const OUT = "#26303f";
const C = Math.cos(Math.PI / 6);
const SW = 2.4;

export interface Drawable {
  key: string;
  depth: number;
  node: ReactNode;
}

const add = (a: Pt, b: Pt, f = 1): Pt => [a[0] + b[0] * f, a[1] + b[1] * f];

export function local(cx: number, cy: number, heading: number) {
  const u: Pt = [Math.cos(heading), Math.sin(heading)];
  const v: Pt = [-u[1], u[0]];
  return (a: number, b: number, z = 0) => P(cx + u[0] * a + v[0] * b, cy + u[1] * a + v[1] * b, z);
}

/** screen vector of one world metre along a heading, scaled to 1 px per text px */
function textMatrix(origin: Pt, heading: number) {
  let dx = (Math.cos(heading) - Math.sin(heading)) * C;
  let dy = (Math.cos(heading) + Math.sin(heading)) * 0.5;
  if (dx < 0) [dx, dy] = [-dx, -dy];
  return `matrix(${dx.toFixed(3)},${dy.toFixed(3)},0,1,${origin[0].toFixed(1)},${origin[1].toFixed(1)})`;
}

export function FaceText({ at, heading, size, children, fill = OUT }: { at: Pt; heading: number; size: number; children: string; fill?: string }) {
  return (
    <text transform={textMatrix(at, heading)} fontSize={size} fontWeight={700} textAnchor="middle" fill={fill} className="iso-text">
      {children}
    </text>
  );
}

interface BoxProps {
  x: number;
  y: number;
  heading?: number;
  l: number;
  w: number;
  h: number;
  z?: number;
  color: string;
  top?: string;
  children?: (face: { a: number; b: number; heading: number; at: (s: number, z: number) => Pt }) => ReactNode;
}

/** iso box; children render on each visible side face */
export function Box({ x, y, heading = 0, l, w, h, z = 0, color, top, children }: BoxProps) {
  const L = local(x, y, heading);
  const hl = l / 2;
  const hw = w / 2;
  const faces = [
    { n: heading, c: [[hl, -hw], [hl, hw]] },
    { n: heading + Math.PI, c: [[-hl, hw], [-hl, -hw]] },
    { n: heading + Math.PI / 2, c: [[hl, hw], [-hl, hw]] },
    { n: heading - Math.PI / 2, c: [[-hl, -hw], [hl, -hw]] },
  ].filter((f) => Math.cos(f.n) + Math.sin(f.n) > 0.001);
  const topPts = [L(hl, -hw, z + h), L(hl, hw, z + h), L(-hl, hw, z + h), L(-hl, -hw, z + h)];
  return (
    <g strokeLinejoin="round">
      {faces.map((f, i) => {
        const [a, b] = f.c;
        const light = 0.72 + 0.16 * Math.cos(f.n) - 0.06 * Math.sin(f.n);
        const quad = [L(a[0], a[1], z), L(b[0], b[1], z), L(b[0], b[1], z + h), L(a[0], a[1], z + h)];
        const at = (s: number, zz: number): Pt => {
          const p0 = L(a[0], a[1], z + zz);
          const p1 = L(b[0], b[1], z + zz);
          return [p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * s];
        };
        return (
          <g key={i}>
            <polygon points={pts(quad)} fill={shade(color, light)} stroke={OUT} strokeWidth={SW} />
            {children?.({ a: a[0], b: a[1], heading: f.n - Math.PI / 2, at })}
          </g>
        );
      })}
      <polygon points={pts(topPts)} fill={top ?? shade(color, 1.12)} stroke={OUT} strokeWidth={SW} />
    </g>
  );
}

export function Wheel({ at, r = 0.55 }: { at: Pt; r?: number }) {
  return <ellipse cx={at[0]} cy={at[1]} rx={r * K * 0.75} ry={r * K} fill="#30343c" stroke={OUT} strokeWidth={1.5} />;
}

function wheels(L: ReturnType<typeof local>, a: number, b: number, r = 0.55) {
  return [[a, b], [a, -b], [-a, b], [-a, -b]].map(([p, q], i) => <Wheel key={i} at={L(p, q, r)} r={r} />);
}

export function Capsule({ a, b, r, fill, outline = true }: { a: Pt; b: Pt; r: number; fill: string; outline?: boolean }) {
  return (
    <g strokeLinecap="round">
      {outline && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={OUT} strokeWidth={r * 2 + SW * 2} />}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={fill} strokeWidth={r * 2} />
    </g>
  );
}

export function Cylinder({ x, y, z0, z1, r, color, top }: { x: number; y: number; z0: number; z1: number; r: number; color: string; top?: string }) {
  const rx = 1.2247 * r * K;
  const ry = 0.7071 * r * K;
  const [bx, by] = P(x, y, z0);
  const [tx, ty] = P(x, y, z1);
  return (
    <g stroke={OUT} strokeWidth={SW}>
      <path d={`M${bx - rx},${ty} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${bx + rx},${ty} Z`} fill={color} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={top ?? shade(color, 1.15)} />
    </g>
  );
}

/* ---------------- aircraft ---------------- */

export interface PlaneProps {
  x: number;
  y: number;
  z?: number;
  heading: number;
  type: string;
  livery: string;
  snow?: number;
  selected?: boolean;
  shadow?: boolean;
}

export function planeGeometry(x: number, y: number, heading: number, type: string, z = 0) {
  const t = aircraft(type);
  const L = t.gameLength;
  const r = t.radius;
  const zc = r + 0.9 + z;
  const at = local(x, y, heading);
  return { t, L, S: t.gameSpan, r, zc, at, nose: at(L / 2, 0, zc), wingZ: t.props ? zc + r * 0.8 : zc - r * 0.45 };
}

export function wingPolygon(g: ReturnType<typeof planeGeometry>, side: 1 | -1, zOff = 0): Pt[] {
  const { L, S, r, at, wingZ, t } = g;
  const sweep = t.props ? 0.02 : 1;
  return [
    at(0.1 * L, side * r * 0.8, wingZ + zOff),
    at((0.1 - 0.2 * sweep) * L, side * S * 0.5, wingZ + zOff),
    at((0.04 - 0.21 * sweep - 0.06) * L, side * S * 0.5, wingZ + zOff),
    at(-0.12 * L, side * r * 0.8, wingZ + zOff),
  ];
}

export function Plane({ x, y, z = 0, heading, type, livery, snow = 0, selected, shadow = true }: PlaneProps) {
  const g = planeGeometry(x, y, heading, type, z);
  const { t, L, S, r, zc, at, wingZ } = g;
  const nose = at(L / 2, 0, zc);
  const body = at(-0.28 * L, 0, zc);
  const tail = at(-0.5 * L, 0, zc + r * 0.55);
  let d: Pt = [nose[0] - body[0], nose[1] - body[1]];
  const dl = Math.hypot(d[0], d[1]) || 1;
  d = [d[0] / dl, d[1] / dl];
  let n: Pt = [-d[1], d[0]];
  if (n[1] < 0) n = [-n[0], -n[1]];
  const rk = r * K;
  const bodyColor = "#f3f9ff";

  const sideOrder = ([1, -1] as const)
    .map((s) => ({ s, y: at(-0.05 * L, s * S * 0.5, wingZ)[1] }))
    .sort((a, b) => a.y - b.y)
    .map((o) => o.s);

  const engineB = t.engines === 4 ? [0.22, 0.38] : [0.28];
  const engines = (side: number) =>
    engineB.map((b, i) => {
      const ez = t.props ? wingZ - r * 0.1 : wingZ - r * 0.5;
      const front = at((t.props ? 0.16 : 0.13 - b * 0.12) * L, side * b * S, ez);
      const back = at((t.props ? -0.04 : 0.0 - b * 0.12) * L, side * b * S, ez);
      const er = (t.engines === 4 ? 0.55 : t.props ? 0.45 : 0.7) * rk;
      return (
        <g key={i}>
          <Capsule a={front} b={back} r={er} fill={t.props ? bodyColor : livery} />
          {t.props ? (
            <ellipse cx={front[0]} cy={front[1]} rx={r * K * 1.3} ry={r * K * 1.3} fill="rgba(255,255,255,0.35)" stroke={OUT} strokeWidth={1.2} strokeDasharray="4 5" />
          ) : (
            <circle cx={front[0]} cy={front[1]} r={er * 0.62} fill="#3a4757" stroke={OUT} strokeWidth={1.4} />
          )}
        </g>
      );
    });

  const stab = (side: number) => (
    <polygon
      points={pts([
        at(-0.36 * L, side * r * 0.5, zc + r * 0.3),
        at(-0.46 * L, side * S * 0.19, zc + r * 0.3),
        at(-0.5 * L, side * S * 0.19, zc + r * 0.3),
        at(-0.48 * L, side * r * 0.3, zc + r * 0.3),
      ])}
      fill="#dbe9f4"
      stroke={OUT}
      strokeWidth={SW}
    />
  );

  const wing = (side: 1 | -1) => (
    <g key={side}>
      {!t.props && engines(side)}
      <polygon points={pts(wingPolygon(g, side))} fill="#e3eff8" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <line {...line(at(-0.04 * L, side * S * 0.48, wingZ), at(-0.12 * L, side * S * 0.48, wingZ))} stroke={livery} strokeWidth={3} strokeLinecap="round" />
      {t.props && engines(side)}
      {snow > 0 && <SnowCap poly={wingPolygon(g, side, 0.25)} opacity={snow} />}
    </g>
  );

  const fin = [at(-0.3 * L, 0, zc + r * 0.6), at(-0.45 * L, 0, zc + r + 0.17 * L), at(-0.5 * L, 0, zc + r + 0.17 * L), at(-0.5 * L, 0, zc + r * 0.6)];
  const shadowPoly = (s: 1 | -1) => wingPolygon({ ...g, wingZ: 0 }, s);
  const hump = type === "B747";
  const upper = type === "A380";

  return (
    <g>
      {selected && (() => {
        const c = P(x, y, 0);
        return <ellipse cx={c[0]} cy={c[1]} rx={L * K * 0.75} ry={L * K * 0.42} fill="rgba(255,214,64,0.28)" stroke="#ffcf3a" strokeWidth={4} strokeDasharray="14 10" className="spin-dash" />;
      })()}
      {shadow && (
        <g fill="rgba(30,40,60,0.18)">
          <polygon points={pts(shadowPoly(1))} />
          <polygon points={pts(shadowPoly(-1))} />
          <line {...line(at(L / 2, 0, 0), at(-0.5 * L, 0, 0))} stroke="rgba(30,40,60,0.18)" strokeWidth={rk * 2} strokeLinecap="round" />
        </g>
      )}
      {z < 1 && (
        <g>
          <Wheel at={at(0.38 * L, 0, 0.5)} r={0.5} />
          <Wheel at={at(-0.08 * L, r, 0.6)} r={0.6} />
          <Wheel at={at(-0.08 * L, -r, 0.6)} r={0.6} />
        </g>
      )}
      {wing(sideOrder[0])}
      {stab(sideOrder[0])}
      <g strokeLinecap="round">
        <polygon points={pts([add(body, n, rk + SW), add(tail, n, rk * 0.35 + SW), add(tail, n, -rk * 0.35 - SW), add(body, n, -rk - SW)])} fill={OUT} />
        <line {...line(nose, body)} stroke={OUT} strokeWidth={rk * 2 + SW * 2} />
        {(hump || upper) && <line {...line(add(nose, d, -rk * 0.6), add(at((hump ? 0.18 : -0.25) * L, 0, zc), [0, 0]))} stroke={OUT} strokeWidth={rk * 2 + SW * 2} transform={`translate(0,${-rk * 0.55})`} />}
        <polygon points={pts([add(body, n, rk), add(tail, n, rk * 0.35), add(tail, n, -rk * 0.35), add(body, n, -rk)])} fill={bodyColor} />
        <line {...line(nose, body)} stroke={bodyColor} strokeWidth={rk * 2} />
        {(hump || upper) && <line {...line(add(nose, d, -rk * 0.6), at((hump ? 0.18 : -0.25) * L, 0, zc))} stroke={bodyColor} strokeWidth={rk * 2} transform={`translate(0,${-rk * 0.55})`} />}
        <line {...line(add(nose, n, rk * 0.5), add(body, n, rk * 0.5))} stroke={livery} strokeWidth={rk * 0.8} />
        <line {...line(add(add(nose, n, -rk * 0.45), d, -rk * 0.8), add(body, n, -rk * 0.45))} stroke="#ffffff" strokeWidth={rk * 0.3} opacity={0.9} />
        <line {...line(add(add(nose, d, -rk * 1.4), n, rk * 0.05), add(body, n, rk * 0.05))} stroke="#2c4a6b" strokeWidth={rk * 0.34} strokeDasharray={`0.1 ${(rk * 0.62).toFixed(1)}`} />
        <line {...line(add(add(nose, d, -rk * 0.55), n, -rk * 0.15), add(add(nose, d, -rk * 0.85), n, -rk * 0.15))} stroke="#2c4a6b" strokeWidth={rk * 0.42} />
        {snow > 0 && (
          <g opacity={snow}>
            <line {...line(add(add(nose, d, -rk * 0.6), n, -rk * 0.62), add(body, n, -rk * 0.62))} stroke="#7fb6dc" strokeWidth={rk * 0.75 + 5} />
            <line {...line(add(add(nose, d, -rk * 0.6), n, -rk * 0.62), add(body, n, -rk * 0.62))} stroke="#ffffff" strokeWidth={rk * 0.75} />
          </g>
        )}
      </g>
      <polygon points={pts(fin)} fill={livery} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <polygon points={pts([fin[1], fin[2], at(-0.5 * L, 0, zc + r + 0.12 * L), at(-0.44 * L, 0, zc + r + 0.12 * L)])} fill="#ffffff" opacity={0.5} />
      {stab(sideOrder[1])}
      {wing(sideOrder[1])}
    </g>
  );
}

const line = (a: Pt, b: Pt) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });

export function SnowCap({ poly, opacity = 1 }: { poly: Pt[]; opacity?: number }) {
  const [a, b, c, d] = poly;
  const mid = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const inset = [mid(a, c, 0.04), mid(b, d, 0.06), mid(c, a, 0.06), mid(d, b, 0.04)];
  const edge = (p: Pt, q: Pt) => [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => mid(p, q, t));
  const lumps = [...edge(inset[0], inset[1]), ...edge(inset[3], inset[2]), ...edge(inset[1], inset[2]).slice(1, 4)];
  const span = Math.hypot(inset[1][0] - inset[0][0], inset[1][1] - inset[0][1]);
  const r = Math.max(4, span * 0.07);
  return (
    <g opacity={opacity}>
      <g fill="#ffffff" stroke="#7fb6dc" strokeWidth={3}>
        {lumps.map((p, i) => <circle key={i} cx={p[0]} cy={p[1] - 2} r={r * (0.85 + (i % 3) * 0.15)} />)}
        <polygon points={pts(inset)} strokeLinejoin="round" />
      </g>
      <g fill="#ffffff">
        {lumps.map((p, i) => <circle key={i} cx={p[0]} cy={p[1] - 2} r={r * (0.85 + (i % 3) * 0.15) - 1.5} />)}
        <polygon points={pts(inset.map((q) => mid(q, mid(inset[0], inset[2], 0.5), 0.04)))} />
      </g>
      {[0.15, 0.35, 0.55, 0.75].map((t) => {
        const p = mid(inset[3], inset[2], t);
        return <path key={t} d={`M${p[0] - 3.5},${p[1] + 2} l3.5,${9 + (t * 10) % 6} l3.5,${-9 - (t * 10) % 6} z`} fill="#d6efff" stroke="#7fb6dc" strokeWidth={1.4} strokeLinejoin="round" />;
      })}
      {[0.3, 0.65].map((t) => {
        const p = mid(mid(inset[0], inset[3], 0.5), mid(inset[1], inset[2], 0.5), t);
        return <path key={t} d={`M${p[0]},${p[1] - 5} L${p[0] + 1.5},${p[1] - 1.5} L${p[0] + 5},${p[1]} L${p[0] + 1.5},${p[1] + 1.5} L${p[0]},${p[1] + 5} L${p[0] - 1.5},${p[1] + 1.5} L${p[0] - 5},${p[1]} L${p[0] - 1.5},${p[1] - 1.5} Z`} fill="#9fd3f5" />;
      })}
    </g>
  );
}

/* ---------------- vehicles & props ---------------- */

interface V {
  x: number;
  y: number;
  heading: number;
}

export function Bus({ x, y, heading, color = "#f6c02c" }: V & { color?: string }) {
  const L = local(x, y, heading);
  return (
    <g>
      {wheels(L, 3.4, 1.2)}
      <Box x={x} y={y} heading={heading} l={11} w={2.6} h={2.8} z={0.5} color={color} top="#f2f4f6">
        {(f) => (
          <polygon points={pts([f.at(0.08, 1.5), f.at(0.92, 1.5), f.at(0.92, 2.5), f.at(0.08, 2.5)])} fill="#4a7fb3" stroke={OUT} strokeWidth={1.6} />
        )}
      </Box>
    </g>
  );
}

export function FuelTruck({ x, y, heading }: V) {
  const L = local(x, y, heading);
  return (
    <g>
      {wheels(L, 3.4, 1.2)}
      <Box x={x} y={y} heading={heading} l={10} w={2.4} h={0.8} z={0.4} color="#545b66" />
      <Box x={x + Math.cos(heading) * 3.9} y={y + Math.sin(heading) * 3.9} heading={heading} l={2.2} w={2.5} h={2.4} z={1.0} color="#e8574a">
        {(f) => <polygon points={pts([f.at(0.15, 1.3), f.at(0.85, 1.3), f.at(0.85, 2.1), f.at(0.15, 2.1)])} fill="#9fd3f5" stroke={OUT} strokeWidth={1.5} />}
      </Box>
      <Capsule a={L(2.2, 0, 2.5)} b={L(-4.2, 0, 2.5)} r={1.35 * K} fill="#f6c02c" />
      <line {...line(L(2.0, 0, 3.6), L(-4.0, 0, 3.6))} stroke="#fff3b0" strokeWidth={3} strokeLinecap="round" />
      <FaceText at={L(-1, 1.3, 1.9)} heading={heading} size={13}>Treibstoff</FaceText>
    </g>
  );
}

export function Tug({ x, y, heading, color = "#eef1f4" }: V & { color?: string }) {
  const L = local(x, y, heading);
  return (
    <g>
      {wheels(L, 1.6, 1.3, 0.6)}
      <Box x={x} y={y} heading={heading} l={5} w={2.8} h={1.3} z={0.5} color={color} />
      <Box x={x - Math.cos(heading) * 1.2} y={y - Math.sin(heading) * 1.2} heading={heading} l={1.6} w={2} h={1.3} z={1.8} color={color}>
        {(f) => <polygon points={pts([f.at(0.15, 0.3), f.at(0.85, 0.3), f.at(0.85, 1.1), f.at(0.15, 1.1)])} fill="#8fc7ef" stroke={OUT} strokeWidth={1.4} />}
      </Box>
      <circle cx={L(-1.2, 0, 3.3)[0]} cy={L(-1.2, 0, 3.3)[1]} r={3} fill="#ffa62b" stroke={OUT} strokeWidth={1.2} className="blink" />
    </g>
  );
}

const BAG_COLORS = ["#e8574a", "#4cbb6c", "#3aa3e8", "#f39a35", "#9a6ee8", "#ef6fae", "#f6c02c"];

export function BaggageCart({ x, y, heading, bags = 3, seed = 0 }: V & { bags?: number; seed?: number }) {
  const L = local(x, y, heading);
  return (
    <g>
      {wheels(L, 1.1, 0.9, 0.4)}
      <Box x={x} y={y} heading={heading} l={3.2} w={2.1} h={0.35} z={0.45} color="#8a929c" />
      {[...Array(bags).keys()].map((i) => {
        const a = -1 + (i % 3) * 1;
        const b = i < 3 ? -0.45 : 0.45;
        return <Box key={i} x={x + Math.cos(heading) * a - Math.sin(heading) * b} y={y + Math.sin(heading) * a + Math.cos(heading) * b} heading={heading} l={0.8} w={0.75} h={0.9} z={0.8} color={BAG_COLORS[(i + seed) % BAG_COLORS.length]} />;
      })}
    </g>
  );
}

export function DeiceTruck({ x, y, heading, basket }: V & { basket?: Pt }) {
  const L = local(x, y, heading);
  const pivot = L(-2.5, 0, 3.2);
  const b = basket ?? L(-6, 0, 9);
  return (
    <g>
      {wheels(L, 3, 1.2)}
      <Box x={x} y={y} heading={heading} l={9} w={2.5} h={2.4} z={0.5} color="#f6c02c" />
      <Box x={x + Math.cos(heading) * 3.8} y={y + Math.sin(heading) * 3.8} heading={heading} l={1.6} w={2.5} h={2.1} z={2.9} color="#f6c02c">
        {(f) => <polygon points={pts([f.at(0.15, 0.4), f.at(0.85, 0.4), f.at(0.85, 1.6), f.at(0.15, 1.6)])} fill="#9fd3f5" stroke={OUT} strokeWidth={1.4} />}
      </Box>
      <FaceText at={L(-0.5, 1.25, 1.2)} heading={heading} size={13}>Enteisung</FaceText>
      <line {...line(pivot, b)} stroke={OUT} strokeWidth={10} strokeLinecap="round" />
      <line {...line(pivot, b)} stroke="#f39a35" strokeWidth={6} strokeLinecap="round" />
      <rect x={b[0] - 11} y={b[1] - 4} width={22} height={14} rx={3} fill="#f39a35" stroke={OUT} strokeWidth={2} />
      <circle cx={b[0]} cy={b[1] - 9} r={5} fill="#ffd9a8" stroke={OUT} strokeWidth={1.5} />
      <path d={`M${b[0] - 6},${b[1] - 11} a6,6 0 0 1 12,0 z`} fill="#f6c02c" stroke={OUT} strokeWidth={1.5} />
    </g>
  );
}

export function BeltLoader({ x, y, heading, top }: V & { top: Pt }) {
  const L = local(x, y, heading);
  const bottom = L(-3, 0, 1.0);
  return (
    <g>
      {wheels(L, 1.8, 1, 0.5)}
      <Box x={x} y={y} heading={heading} l={6} w={2.2} h={0.8} z={0.5} color="#dfe3e8" />
      <line {...line(bottom, top)} stroke={OUT} strokeWidth={22} strokeLinecap="round" />
      <line {...line(bottom, top)} stroke="#4a5160" strokeWidth={17} strokeLinecap="round" />
      <line {...line(bottom, top)} stroke="#6f7787" strokeWidth={13} strokeDasharray="3 6" className="belt-move" />
    </g>
  );
}

export function Stairs({ x, y, heading, h }: V & { h: number }) {
  const L = local(x, y, heading);
  const steps = 8;
  return (
    <g>
      {wheels(L, 2, 0.9, 0.45)}
      <Box x={x} y={y} heading={heading} l={5} w={1.9} h={0.6} z={0.4} color="#f2f4f6" />
      <polygon points={pts([L(2.4, -0.9, 1), L(2.4, 0.9, 1), L(-2.0, 0.9, h), L(-2.0, -0.9, h)])} fill="#dfe3e8" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      {[...Array(steps).keys()].map((i) => {
        const t = (i + 0.5) / steps;
        const a = 2.4 - 4.4 * t;
        const z = 1 + (h - 1) * t;
        return <line key={i} {...line(L(a, -0.85, z), L(a, 0.85, z))} stroke="#9aa3ad" strokeWidth={2} />;
      })}
      <line {...line(L(2.4, 0.95, 2), L(-2.0, 0.95, h + 1))} stroke="#e8574a" strokeWidth={3} strokeLinecap="round" />
      <Box x={x - Math.cos(heading) * 2.4} y={y - Math.sin(heading) * 2.4} heading={heading} l={1.2} w={1.9} h={0.3} z={h - 0.3} color="#f2f4f6" />
    </g>
  );
}

const SKIN = ["#f1c7a1", "#d9a27a", "#a8704a", "#7a4b2c", "#f6d3b5"];

export function Person({ at, scale = 1, seed = 0, wave = false }: { at: Pt; scale?: number; seed?: number; wave?: boolean }) {
  const skin = SKIN[seed % SKIN.length];
  const s = scale * (K / 8);
  return (
    <g transform={`translate(${at[0]},${at[1]}) scale(${s})`} className={wave ? "bob" : undefined}>
      <ellipse cx={0} cy={0} rx={7} ry={3} fill="rgba(30,40,60,0.2)" />
      <rect x={-4.5} y={-12} width={4} height={12} rx={2} fill="#2f4a7a" stroke={OUT} strokeWidth={1.5} />
      <rect x={0.5} y={-12} width={4} height={12} rx={2} fill="#2f4a7a" stroke={OUT} strokeWidth={1.5} />
      <rect x={-6} y={-26} width={12} height={16} rx={4} fill="#ffd23a" stroke={OUT} strokeWidth={1.5} />
      <line x1={-6} y1={-17} x2={6} y2={-17} stroke="#ffffff" strokeWidth={2} />
      <path d={wave ? "M-6,-23 L-12,-33" : "M-6,-23 L-9,-13"} stroke={OUT} strokeWidth={4.5} strokeLinecap="round" />
      <path d={wave ? "M-6,-23 L-12,-33" : "M-6,-23 L-9,-13"} stroke="#ffd23a" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M6,-23 L9,-13" stroke={OUT} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M6,-23 L9,-13" stroke="#ffd23a" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={0} cy={-32} r={6} fill={skin} stroke={OUT} strokeWidth={1.5} />
      <path d="M-6.5,-33 a6.5,6.5 0 0 1 13,0 z" fill={seed % 2 ? "#f39a35" : "#f6c02c"} stroke={OUT} strokeWidth={1.5} />
      <circle cx={-2} cy={-31} r={0.9} fill={OUT} />
      <circle cx={2} cy={-31} r={0.9} fill={OUT} />
    </g>
  );
}

export function Passenger({ at, seed = 0 }: { at: Pt; seed?: number }) {
  const colors = ["#e8574a", "#3aa3e8", "#4cbb6c", "#9a6ee8", "#ef6fae", "#f39a35"];
  return (
    <g transform={`translate(${at[0]},${at[1]})`}>
      <ellipse cx={0} cy={0} rx={6} ry={2.5} fill="rgba(30,40,60,0.2)" />
      <rect x={-4} y={-10} width={8} height={10} rx={2} fill="#3d4a63" stroke={OUT} strokeWidth={1.3} />
      <rect x={-5} y={-22} width={10} height={13} rx={4} fill={colors[seed % colors.length]} stroke={OUT} strokeWidth={1.3} />
      <circle cx={0} cy={-27} r={5} fill={SKIN[(seed + 2) % SKIN.length]} stroke={OUT} strokeWidth={1.3} />
      <rect x={5} y={-12} width={6} height={7} rx={1.5} fill={colors[(seed + 3) % colors.length]} stroke={OUT} strokeWidth={1.2} />
    </g>
  );
}

export function Cone({ at }: { at: Pt }) {
  return (
    <g transform={`translate(${at[0]},${at[1]})`}>
      <path d="M-5,0 L0,-14 L5,0 Z" fill="#f39a35" stroke={OUT} strokeWidth={1.4} strokeLinejoin="round" />
      <line x1={-2.8} y1={-6} x2={2.8} y2={-6} stroke="#fff" strokeWidth={2} />
    </g>
  );
}
