import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { aircraft, type AircraftType } from "@/game/data";
import { K, P, pts, shade, type Pt } from "@/game/iso";
import { WIND_HOLD_MS, windAt } from "@/game/motion";

export const OUT = "#26303f";
const C = Math.cos(Math.PI / 6);
const SW = 2.4;

/** set by IsoWorld: the camera is close enough for small details like windows and doors */
export const Detail = createContext(true);

/** set by Game: the airport lights are on */
export const Night = createContext(false);

const LampLayer = createContext<{ top: SVGGElement; back: SVGGElement } | null>(null);
const FrontList = createContext<((id: string, on: boolean) => void) | null>(null);
const FADE_MS = 2000;

/** "on" while the night fades in, "still" when the scene opened at night, "off" while the morning fades in, null by day */
export function useLit() {
  const night = useContext(Night);
  const [lit, setLit] = useState(night);
  const [seen, setSeen] = useState(night);
  const [switched, setSwitched] = useState(false);
  if (night !== seen) {
    setSeen(night);
    setSwitched(true);
  }
  if (night && !lit) setLit(true);
  useEffect(() => {
    if (night || !lit) return;
    const t = setTimeout(() => setLit(false), FADE_MS);
    return () => clearTimeout(t);
  }, [night, lit]);
  return night ? (switched ? "on" : "still") : lit ? "off" : null;
}

/** the night shade's mask: shapes in holes cut the shade away, shapes in covers put it back on top */
const ShadeMask = createContext<{ holes: SVGGElement; covers: SVGGElement } | null>(null);

const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, "");

/** darkens its children at night; every <Lamp> inside shines above the shade, a <Lamp back> only where no <Front> covers it */
export function Lights({ children }: { children: ReactNode }) {
  const lit = useLit();
  const id = `night${svgId(useId())}`;
  const [top, setTop] = useState<SVGGElement | null>(null);
  const [back, setBack] = useState<SVGGElement | null>(null);
  const [holes, setHoles] = useState<SVGGElement | null>(null);
  const [covers, setCovers] = useState<SVGGElement | null>(null);
  const [fronts, setFronts] = useState<string[]>([]);
  const register = useCallback((front: string, on: boolean) => setFronts((list) => (on ? [...list, front] : list.filter((f) => f !== front))), []);
  const mask = useMemo(() => (lit && holes && covers ? { holes, covers } : null), [lit, holes, covers]);
  const layers = useMemo(() => (lit && top && back ? { top, back } : null), [lit, top, back]);
  return (
    <ShadeMask.Provider value={mask}>
      <FrontList.Provider value={register}>
        <LampLayer.Provider value={layers}>
          {children}
          {lit && (
            <>
              <mask id={id} maskUnits="userSpaceOnUse" x={-1e4} y={-1e4} width={2e4} height={2e4}>
                <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="#fff" />
                <g ref={setHoles} className="night-hole" />
                <g ref={setCovers} className="night-cover" />
              </mask>
              <rect className={`night-shade night-${lit}`} mask={`url(#${id})`} x={-1e4} y={-1e4} width={2e4} height={2e4} pointerEvents="none" />
              <filter id={`${id}s`}>
                <feComponentTransfer in="SourceAlpha">
                  <feFuncA type="discrete" tableValues="0 1" />
                </feComponentTransfer>
              </filter>
              <mask id={`${id}f`} maskUnits="userSpaceOnUse" x={-1e4} y={-1e4} width={2e4} height={2e4}>
                <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="#fff" />
                {fronts.map((f) => <use key={f} href={`#${f}`} filter={`url(#${id}s)`} />)}
              </mask>
              <g ref={setBack} className={`night-${lit}`} mask={`url(#${id}f)`} pointerEvents="none" />
              <g ref={setTop} className={`night-${lit}`} pointerEvents="none" />
            </>
          )}
        </LampLayer.Provider>
      </FrontList.Provider>
    </ShadeMask.Provider>
  );
}

/** drawn only at night, above the shade; children need absolute coordinates. A back lamp sits behind every <Front> */
export function Lamp({ children, back }: { children: ReactNode; back?: boolean }) {
  const layers = useContext(LampLayer);
  return layers ? createPortal(children, back ? layers.back : layers.top) : null;
}

/** hides the <Lamp back> lights behind its children */
export function Front({ children }: { children: ReactNode }) {
  const register = useContext(FrontList);
  const id = `front${svgId(useId())}`;
  useEffect(() => {
    if (!register) return;
    register(id, true);
    return () => register(id, false);
  }, [register, id]);
  return <g id={register ? id : undefined}>{children}</g>;
}

function Masked({ children, part }: { children: ReactNode; part: "holes" | "covers" }) {
  const mask = useContext(ShadeMask);
  return (
    <>
      {children}
      {mask &&
        createPortal(
          <LampLayer.Provider value={null}>
            <FrontList.Provider value={null}>{children}</FrontList.Provider>
          </LampLayer.Provider>,
          mask[part],
        )}
    </>
  );
}

/** a guide the child follows: at night the shade has a hole in its shape, so it stays as bright as by day */
export const Bright = ({ children }: { children: ReactNode }) => <Masked part="holes">{children}</Masked>;

/** something that drives over a <Bright> guide: the shade stays on it */
export const Cover = ({ children }: { children: ReactNode }) => <Masked part="covers">{children}</Masked>;

export function Glow({ at, r, color, className }: { at: Pt; r: number; color: string; className?: string }) {
  return (
    <Lamp>
      <g className={className}>
        <circle cx={at[0]} cy={at[1]} r={r * 3} fill={color} opacity={0.3} />
        <circle cx={at[0]} cy={at[1]} r={r} fill={color} />
        <circle cx={at[0]} cy={at[1]} r={r * 0.5} fill="#ffffff" />
      </g>
    </Lamp>
  );
}

/** the current wind; re-renders only while it turns and once when the next turn starts */
export function useWind() {
  const [now, setNow] = useState(() => Date.now());
  const wind = windAt(now);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), wind.turning ? 150 : WIND_HOLD_MS - (now % WIND_HOLD_MS));
    return () => clearTimeout(t);
  }, [now, wind.turning]);
  return wind;
}

/** orange and white wind sock from the hoop at a to the tail at b, in screen points */
export function Sock({ a, b, r0, r1 }: { a: Pt; b: Pt; r0: number; r1: number }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uy] = len < 0.5 ? [1, 0] : [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const at = (t: number, side: number): Pt => {
    const r = r0 + (r1 - r0) * t;
    return [a[0] + (b[0] - a[0]) * t - uy * r * side, a[1] + (b[1] - a[1]) * t + ux * r * side];
  };
  return (
    <g stroke={OUT} strokeWidth={1.6} strokeLinejoin="round">
      {[0, 1, 2, 3, 4].map((i) => (
        <polygon key={i} points={pts([at(i / 5, 1), at((i + 1) / 5, 1), at((i + 1) / 5, -1), at(i / 5, -1)])} fill={i % 2 ? "#ffffff" : "#f39a35"} />
      ))}
    </g>
  );
}

export const LIGHT = { red: "#ff3b30", green: "#3cf06e", white: "#f4f8ff", amber: "#ffa62b", warm: "#ffe08a", blue: "#4f8dff" };

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

export function FaceText({ at, heading, size, children, fill = OUT, stroke }: { at: Pt; heading: number; size: number; children: string; fill?: string; stroke?: string }) {
  return (
    <text transform={textMatrix(at, heading)} fontSize={size} fontWeight={700} textAnchor="middle" fill={fill} stroke={stroke} strokeWidth={stroke ? size * 0.12 : undefined} paintOrder="stroke" className="iso-text">
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
  const rx = r * K * 0.75;
  const ry = r * K;
  return (
    <g>
      <ellipse cx={at[0]} cy={at[1]} rx={rx} ry={ry} fill="#30343c" stroke={OUT} strokeWidth={1.5} />
      <ellipse cx={at[0]} cy={at[1]} rx={rx * 0.5} ry={ry * 0.5} fill="#c3ccd6" />
      <ellipse cx={at[0] - rx * 0.12} cy={at[1] - ry * 0.12} rx={rx * 0.18} ry={ry * 0.18} fill="#ffffff" />
    </g>
  );
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
  const zc = r + 1.5 + z;
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
  const detail = useContext(Detail);
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
  const freighter = !!t.freighter;
  const bodyColor = freighter ? livery : "#f3f9ff";
  const belly = freighter ? shade(livery, 0.86) : "#d3e2ef";
  const facing = Math.cos(heading) + Math.sin(heading) > 0;
  const hump = type === "B747";
  const upper = type === "A380";
  const deck = upper || hump ? rk * 0.55 : 0;
  const along = (s: number, off = 0): Pt => add(add(nose, d, -s), n, off);
  const lift = (p: Pt, dy: number): Pt => [p[0], p[1] + dy];
  /** parallelogram along the fuselage axis, upright on screen */
  const pane = (c: Pt, w: number, h: number) => {
    const a = add(c, d, w / 2);
    const b = add(c, d, -w / 2);
    return `M${a[0].toFixed(1)},${(a[1] - h / 2).toFixed(1)}L${b[0].toFixed(1)},${(b[1] - h / 2).toFixed(1)}L${b[0].toFixed(1)},${(b[1] + h / 2).toFixed(1)}L${a[0].toFixed(1)},${(a[1] + h / 2).toFixed(1)}Z`;
  };
  const windows = (from: Pt, to: Pt, skip: Pt[]) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const gap = rk * 0.5;
    const h = rk * 0.2;
    let p = "";
    for (let s = 0; s <= len; s += gap) {
      const q: Pt = [from[0] + ((to[0] - from[0]) * s) / len, from[1] + ((to[1] - from[1]) * s) / len];
      if (skip.some((k) => Math.hypot(k[0] - q[0], k[1] - q[1]) < rk * 0.4)) continue;
      p += `M${q[0].toFixed(1)},${(q[1] - h / 2).toFixed(1)}v${h.toFixed(1)}`;
    }
    return p;
  };

  const sideOrder = ([1, -1] as const)
    .map((s) => ({ s, y: at(-0.05 * L, s * S * 0.5, wingZ)[1] }))
    .sort((a, b) => a.y - b.y)
    .map((o) => o.s);

  const engineB = t.engines === 4 ? [0.22, 0.38] : [0.28];
  const engines = (side: number) =>
    engineB.map((b, i) => {
      const ez = t.props ? wingZ - r * 0.1 : wingZ - r * 0.5;
      const fa = (t.props ? 0.16 : 0.13 - b * 0.12) * L;
      const ba = (t.props ? -0.04 : 0.0 - b * 0.12) * L;
      const front = at(fa, side * b * S, ez);
      const back = at(ba, side * b * S, ez);
      const er = (t.engines === 4 ? 0.55 : t.props ? 0.45 : 0.7) * rk;
      const near = facing ? front : back;
      return (
        <g key={i}>
          {detail && !t.props && <Capsule a={at((fa + ba) / 2, side * b * S, ez)} b={at((fa + ba) / 2 - 0.05 * L, side * b * S, wingZ)} r={er * 0.28} fill="#c9d6e2" />}
          <Capsule a={front} b={back} r={er} fill={t.props ? bodyColor : livery} />
          <line {...line(lift(front, -er * 0.5), lift(back, -er * 0.5))} stroke="#ffffff" strokeWidth={er * 0.3} strokeLinecap="round" opacity={0.55} />
          {t.props ? (
            facing || !detail ? (
              <g>
                <ellipse cx={front[0]} cy={front[1]} rx={rk * 1.3} ry={rk * 1.3} fill="rgba(255,255,255,0.35)" stroke={OUT} strokeWidth={1.2} strokeDasharray="4 5" />
                {detail && <path d={`M${front[0] - rk * 1.2},${front[1] + rk * 0.3}L${front[0] + rk * 1.2},${front[1] - rk * 0.3}M${front[0] - rk * 0.3},${front[1] - rk * 1.2}L${front[0] + rk * 0.3},${front[1] + rk * 1.2}`} stroke="rgba(38,48,63,0.35)" strokeWidth={2.4} strokeLinecap="round" />}
                <circle cx={front[0]} cy={front[1]} r={er * 0.4} fill={livery} stroke={OUT} strokeWidth={1.4} />
              </g>
            ) : (
              <ellipse cx={front[0]} cy={front[1]} rx={rk * 1.3} ry={rk * 1.3} fill="rgba(255,255,255,0.3)" stroke={OUT} strokeWidth={1.2} strokeDasharray="4 5" />
            )
          ) : facing ? (
            <g stroke={OUT}>
              <circle cx={near[0]} cy={near[1]} r={er * 0.8} fill="#dfe7ef" strokeWidth={1.4} />
              <circle cx={near[0]} cy={near[1]} r={er * 0.58} fill="#3a4757" strokeWidth={1.2} />
              {detail && (
                <g>
                  <circle cx={near[0]} cy={near[1]} r={er * 0.4} fill="none" stroke="#6f8196" strokeWidth={er * 0.2} strokeDasharray={`${(er * 0.12).toFixed(1)} ${(er * 0.1).toFixed(1)}`} />
                  <circle cx={near[0]} cy={near[1]} r={er * 0.15} fill="#eef3f8" strokeWidth={1} />
                  <path d={`M${near[0] - er * 0.62},${near[1] - er * 0.2}A${er * 0.66},${er * 0.66} 0 0 1 ${near[0] - er * 0.1},${near[1] - er * 0.66}`} fill="none" stroke="#ffffff" strokeWidth={er * 0.12} strokeLinecap="round" />
                </g>
              )}
            </g>
          ) : (
            <g stroke={OUT} strokeWidth={1.2}>
              <circle cx={near[0]} cy={near[1]} r={er * 0.55} fill="#6b7785" />
              <circle cx={near[0]} cy={near[1]} r={er * 0.28} fill="#30343c" />
            </g>
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

  const wing = (side: 1 | -1) => {
    const w = wingPolygon(g, side);
    const mix = (p: Pt, q: Pt, f: number): Pt => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    const flapA = mix(w[3], w[0], 0.24);
    const flapB = mix(w[2], w[1], 0.24);
    const seps = [0.3, 0.55, 0.8].map((f) => [mix(w[3], w[2], f), mix(flapA, flapB, f)]);
    const tip = side * S * 0.5;
    const winglet = [at(-0.16 * L, tip, wingZ), at(-0.23 * L, tip, wingZ), at(-0.255 * L, tip, wingZ + r * 1.1), at(-0.215 * L, tip, wingZ + r * 1.1)];
    return (
      <g key={side}>
        {!t.props && engines(side)}
        <polygon points={pts(w)} fill="#e3eff8" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
        {detail && (
          <g fill="none" strokeLinecap="round">
            <line {...line(mix(w[0], w[3], 0.14), mix(w[1], w[2], 0.14))} stroke="#ffffff" strokeWidth={3.5} />
            <path d={`M${flapA[0]},${flapA[1]}L${flapB[0]},${flapB[1]}${seps.map(([a, b]) => `M${a[0]},${a[1]}L${b[0]},${b[1]}`).join("")}`} stroke="#a9bccd" strokeWidth={1.6} />
          </g>
        )}
        {t.props ? (
          <line {...line(at(-0.04 * L, tip * 0.96, wingZ), at(-0.12 * L, tip * 0.96, wingZ))} stroke={livery} strokeWidth={3} strokeLinecap="round" />
        ) : (
          <polygon points={pts(winglet)} fill={livery} stroke={OUT} strokeWidth={SW * 0.8} strokeLinejoin="round" />
        )}
        {t.props && engines(side)}
        {snow > 0 && <SnowCap poly={wingPolygon(g, side, 0.25)} opacity={snow} />}
      </g>
    );
  };

  const fin = [at(-0.3 * L, 0, zc + r * 0.6), at(-0.45 * L, 0, zc + r + 0.17 * L), at(-0.5 * L, 0, zc + r + 0.17 * L), at(-0.5 * L, 0, zc + r * 0.6)];
  const shadowPoly = (s: 1 | -1) => wingPolygon({ ...g, wingZ: 0 }, s);

  const mainA = t.longHaul ? [-0.06, -0.11] : [-0.08];
  const legTop = t.props ? zc - r * 0.6 : wingZ;
  const gearSide = (s: number) => (
    <g key={s}>
      <line {...line(at(-0.085 * L, s * r, 0.6), at(-0.085 * L, s * r * 0.85, legTop))} stroke={OUT} strokeWidth={5} strokeLinecap="round" />
      <line {...line(at(-0.085 * L, s * r, 0.6), at(-0.085 * L, s * r * 0.85, legTop))} stroke="#9aa6b3" strokeWidth={2.4} strokeLinecap="round" />
      {mainA.map((a) => <Wheel key={a} at={at(a * L, s * r, 0.6)} r={0.6} />)}
    </g>
  );

  const frontDoor = at(L / 2 - 0.6 - 0.12 * L, 0, zc);
  const rearDoor = at(-0.33 * L, 0, zc);
  const cargoDoor = at(0.26 * L, 0, zc);
  const winOff = -rk * 0.12;
  const winFrom = add(along(rk * 1.0), n, winOff);
  const winTo = add(body, n, winOff);
  const cockpit = [-0.36, 0.0, 0.36].map((s) => lift(along(rk * (s + 0.05)), -rk * 0.32 - deck));

  return (
    <g>
      {selected && (() => {
        const c = P(x, y, 0);
        return <ellipse cx={c[0]} cy={c[1]} rx={L * K * 0.75} ry={L * K * 0.42} fill="rgba(255,214,64,0.28)" stroke="#ffcf3a" strokeWidth={4} strokeDasharray="14 10" />;
      })()}
      {shadow &&
        [0.07, 0.11].map((o, i) => (
          <g key={o} fill={`rgba(30,40,60,${o})`} stroke={i ? "none" : `rgba(30,40,60,${o})`} strokeWidth={10} strokeLinejoin="round">
            <polygon points={pts(shadowPoly(1))} />
            <polygon points={pts(shadowPoly(-1))} />
            <line {...line(at(L / 2, 0, 0), at(-0.5 * L, 0, 0))} stroke={`rgba(30,40,60,${o})`} strokeWidth={rk * 2 + (i ? 0 : 10)} strokeLinecap="round" />
          </g>
        ))}
      {z < 1 && (
        <g>
          <line {...line(at(0.38 * L, 0, 0.5), at(0.38 * L, 0, zc - r * 0.7))} stroke={OUT} strokeWidth={4.5} strokeLinecap="round" />
          <line {...line(at(0.38 * L, 0, 0.5), at(0.38 * L, 0, zc - r * 0.7))} stroke="#9aa6b3" strokeWidth={2} strokeLinecap="round" />
          <Wheel at={at(0.38 * L, 0, 0.5)} r={0.5} />
          {gearSide(sideOrder[0])}
          {gearSide(sideOrder[1])}
        </g>
      )}
      {wing(sideOrder[0])}
      {stab(sideOrder[0])}
      <g strokeLinecap="round">
        <polygon points={pts([add(body, n, rk + SW), add(tail, n, rk * 0.35 + SW), add(tail, n, -rk * 0.35 - SW), add(body, n, -rk - SW)])} fill={OUT} />
        <line {...line(nose, body)} stroke={OUT} strokeWidth={rk * 2 + SW * 2} />
        {deck > 0 && <line {...line(lift(add(nose, d, -rk * 0.6), -deck), lift(at((hump ? 0.18 : -0.25) * L, 0, zc), -deck))} stroke={OUT} strokeWidth={rk * 2 + SW * 2} />}
        <polygon points={pts([add(body, n, rk), add(tail, n, rk * 0.35), add(tail, n, -rk * 0.35), add(body, n, -rk)])} fill={bodyColor} />
        <polygon points={pts([add(body, n, rk), add(tail, n, rk * 0.35), add(tail, n, rk * 0.05), add(body, n, rk * 0.25)])} fill={belly} />
        <line {...line(nose, body)} stroke={bodyColor} strokeWidth={rk * 2} />
        {deck > 0 && <line {...line(lift(add(nose, d, -rk * 0.6), -deck), lift(at((hump ? 0.18 : -0.25) * L, 0, zc), -deck))} stroke={bodyColor} strokeWidth={rk * 2} />}
        <line {...line(add(nose, n, rk * 0.62), add(body, n, rk * 0.62))} stroke={belly} strokeWidth={rk * 0.76} />
        <line {...line(add(nose, n, rk * 0.42), add(body, n, rk * 0.42))} stroke={freighter ? shade(livery, 0.72) : livery} strokeWidth={rk * 0.5} />
        <line {...line(add(add(nose, n, -rk * 0.62), d, -rk * 0.8), add(body, n, -rk * 0.62))} stroke="#ffffff" strokeWidth={rk * 0.36} />
        {deck > 0 && <line {...line(lift(add(add(nose, n, -rk * 0.6), d, -rk * 1.2), -deck), lift(add(at((hump ? 0.2 : -0.24) * L, 0, zc), n, -rk * 0.6), -deck))} stroke="#ffffff" strokeWidth={rk * 0.3} />}
        {detail ? (
          <g>
            {!freighter && <path d={windows(winFrom, winTo, [frontDoor, rearDoor])} stroke="#2c4a6b" strokeWidth={rk * 0.22} />}
            {!freighter && <Lamp><path d={windows(winFrom, winTo, [frontDoor, rearDoor])} stroke={LIGHT.warm} strokeWidth={rk * 0.22} opacity={0.8} /></Lamp>}
            {deck > 0 && <path d={windows(lift(add(along(rk * 1.6), n, winOff), -deck), lift(add(at((hump ? 0.22 : -0.22) * L, 0, zc), n, winOff), -deck), [])} stroke="#2c4a6b" strokeWidth={rk * 0.2} />}
            <path d={[pane(frontDoor, rk * 0.34, rk * 0.8), pane(rearDoor, rk * 0.3, rk * 0.66), pane(lift(cargoDoor, rk * 0.5), rk * 0.5, rk * 0.42)].join("")} fill="none" stroke="#8ea3b8" strokeWidth={1.6} strokeLinejoin="round" />
            <path d={cockpit.map((c, i) => pane(c, rk * (i === 0 ? 0.24 : 0.3), rk * (i === 0 ? 0.3 : 0.36))).join("")} fill="#2c4a6b" stroke={OUT} strokeWidth={1} strokeLinejoin="round" />
            <circle cx={cockpit[2][0] - rk * 0.03} cy={cockpit[2][1] - rk * 0.06} r={rk * 0.05} fill="#ffffff" />
          </g>
        ) : (
          <g>
            {!freighter && <line {...line(add(add(nose, d, -rk * 1.4), n, winOff), add(body, n, winOff))} stroke="#2c4a6b" strokeWidth={rk * 0.34} strokeDasharray={`0.1 ${(rk * 0.62).toFixed(1)}`} />}
            <line {...line(lift(add(add(nose, d, -rk * 0.55), n, -rk * 0.15), -deck), lift(add(add(nose, d, -rk * 0.85), n, -rk * 0.15), -deck))} stroke="#2c4a6b" strokeWidth={rk * 0.42} />
          </g>
        )}
        {snow > 0 && (
          <g opacity={snow}>
            <line {...line(add(add(nose, d, -rk * 0.6), n, -rk * 0.62), add(body, n, -rk * 0.62))} stroke="#7fb6dc" strokeWidth={rk * 0.75 + 5} />
            <line {...line(add(add(nose, d, -rk * 0.6), n, -rk * 0.62), add(body, n, -rk * 0.62))} stroke="#ffffff" strokeWidth={rk * 0.75} />
          </g>
        )}
      </g>
      <polygon points={pts(fin)} fill={livery} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      <polygon points={pts([fin[1], fin[2], at(-0.5 * L, 0, zc + r + 0.12 * L), at(-0.44 * L, 0, zc + r + 0.12 * L)])} fill="#ffffff" opacity={0.5} />
      {freighter && <Parcel at={at(-0.445 * L, 0, zc + r * 0.6 + 0.07 * L)} size={rk * 0.9} />}
      <Lamp>
        <polygon points={pts(fin)} fill={livery} opacity={0.6} />
        {freighter && <Parcel at={at(-0.445 * L, 0, zc + r * 0.6 + 0.07 * L)} size={rk * 0.9} />}
      </Lamp>
      {stab(sideOrder[1])}
      {wing(sideOrder[1])}
      <Glow at={at(-0.5 * L, 0, zc + r * 0.55)} r={rk * 0.14} color={LIGHT.white} />
      <Glow at={lift(at(-0.02 * L, 0, zc + r), -deck)} r={rk * 0.16} color={LIGHT.red} className="beacon" />
      {([1, -1] as const).map((side) => {
        const w = wingPolygon(g, side);
        const tip: Pt = [(w[1][0] + w[2][0]) / 2, (w[1][1] + w[2][1]) / 2];
        return (
          <g key={side}>
            <Glow at={tip} r={rk * 0.15} color={side === 1 ? LIGHT.red : LIGHT.green} />
            <Glow at={tip} r={rk * 0.2} color={LIGHT.white} className="strobe" />
          </g>
        );
      })}
    </g>
  );
}

/** a brown cardboard box with tape and a white label, upright on screen */
export function Parcel({ at, size }: { at: Pt; size: number }) {
  const h = size / 2;
  return (
    <g stroke={OUT} strokeWidth={Math.max(1, size * 0.08)} strokeLinejoin="round">
      <rect x={at[0] - h} y={at[1] - h} width={size} height={size} rx={size * 0.08} fill="#c98a4b" />
      <line x1={at[0]} y1={at[1] - h} x2={at[0]} y2={at[1] + h} stroke="#e8c07a" strokeWidth={size * 0.2} />
      <rect x={at[0] - h * 0.8} y={at[1] + h * 0.2} width={size * 0.35} height={size * 0.25} fill="#ffffff" strokeWidth={Math.max(0.6, size * 0.05)} />
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

type Face = Parameters<NonNullable<BoxProps["children"]>>[0];
const isFront = (f: Face) => f.a > 0 && f.b < 0;
const isBack = (f: Face) => f.a < 0 && f.b > 0;
/** +1 when the vehicle's left side (local +b) faces the camera */
const nearSide = (heading: number) => (Math.cos(heading) - Math.sin(heading) > 0 ? 1 : -1);

function GroundShadow({ x, y, heading, l, w }: V & { l: number; w: number }) {
  const L = local(x, y, heading);
  const rect = (g: number) => pts([L(l / 2 + g, -w / 2 - g), L(l / 2 + g, w / 2 + g), L(-l / 2 - g, w / 2 + g), L(-l / 2 - g, -w / 2 - g)]);
  return (
    <g fill="rgba(30,40,60,0.09)" strokeLinejoin="round">
      <polygon points={rect(0.7)} />
      <polygon points={rect(0.15)} />
    </g>
  );
}

function Driver({ at }: { at: Pt }) {
  return (
    <g fill="rgba(38,48,63,0.55)">
      <circle cx={at[0]} cy={at[1] - 3} r={3} />
      <path d={`M${at[0] - 5},${at[1] + 4} q5,-6.5 10,0 z`} />
    </g>
  );
}

const windowPoly = (f: Face, s0: number, s1: number, z0: number, z1: number) => pts([f.at(s0, z0), f.at(s1, z0), f.at(s1, z1), f.at(s0, z1)]);

export function Bus({ x, y, heading, color = "#f6c02c" }: V & { color?: string }) {
  const L = local(x, y, heading);
  const side = nearSide(heading);
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={11} w={2.6} />
      {wheels(L, 3.4, 1.2)}
      <Box x={x} y={y} heading={heading} l={11} w={2.6} h={2.8} z={0.5} color={color} top="#f2f4f6">
        {(f) =>
          isFront(f) ? (
            <g>
              <polygon points={windowPoly(f, 0.08, 0.92, 1.1, 2.35)} fill="url(#glass)" stroke={OUT} strokeWidth={1.6} />
              <Driver at={f.at(0.68, 1.5)} />
              <polygon points={windowPoly(f, 0.15, 0.85, 2.45, 2.72)} fill={OUT} />
              <polyline points={pts([f.at(0.22, 2.58), f.at(0.78, 2.58)])} stroke="#ffb347" strokeWidth={2} strokeDasharray="3 2" fill="none" />
              {[0.16, 0.84].map((s) => {
                const p = f.at(s, 0.5);
                return (
                  <g key={s}>
                    <circle cx={p[0]} cy={p[1]} r={2.6} fill="#fff7d0" stroke={OUT} strokeWidth={1.2} />
                    <Glow at={p} r={2.6} color="#fff3c0" />
                  </g>
                );
              })}
            </g>
          ) : isBack(f) ? (
            <g>
              <polygon points={windowPoly(f, 0.15, 0.85, 1.5, 2.45)} fill="url(#glass)" stroke={OUT} strokeWidth={1.4} />
              {[0.12, 0.88].map((s) => <Glow key={s} at={f.at(s, 0.6)} r={2.2} color={LIGHT.red} />)}
            </g>
          ) : (
            <g>
              <polygon points={windowPoly(f, 0.06, 0.94, 1.45, 2.5)} fill="url(#glass)" stroke={OUT} strokeWidth={1.6} />
              <path d={[0.2, 0.34, 0.48, 0.62, 0.76].map((s) => `M${f.at(s, 1.45).join(",")}L${f.at(s, 2.5).join(",")}`).join("")} stroke={OUT} strokeWidth={1.6} />
              <polyline points={pts([f.at(0.06, 1.0), f.at(0.94, 1.0)])} stroke={shade(color, 0.75)} strokeWidth={2.4} fill="none" />
              {Math.sign(f.b) === side &&
                [f.a > 0 ? 0.1 : 0.78, 0.5].map((s) => (
                  <g key={s}>
                    <polygon points={windowPoly(f, s, s + 0.12, 0.15, 2.5)} fill="#bfe3f7" stroke={OUT} strokeWidth={1.5} />
                    <polyline points={pts([f.at(s + 0.06, 0.15), f.at(s + 0.06, 2.5)])} stroke={OUT} strokeWidth={1.2} fill="none" />
                  </g>
                ))}
            </g>
          )
        }
      </Box>
      <Box x={x - Math.cos(heading) * 1.5} y={y - Math.sin(heading) * 1.5} heading={heading} l={3} w={1.5} h={0.35} z={3.3} color="#dfe3e8" />
      <Glow at={L(-1.5, 0, 3.9)} r={2.4} color={LIGHT.amber} className="blink" />
      <Lamp>
        <polygon points={pts([L(5.8, -1.1, 0.5), L(5.8, 1.1, 0.5), L(17, 4, 0), L(17, -4, 0)])} fill="#fff3c0" opacity={0.3} />
      </Lamp>
    </g>
  );
}

export function FuelTruck({ x, y, heading }: V) {
  const L = local(x, y, heading);
  const s = nearSide(heading);
  const R = 1.35;
  const ring = (a: number) => {
    const top = L(a, 0, 2.5 + R);
    const mid = L(a, s * R * 1.3, 2.5);
    const bot = L(a, 0, 2.5 - R);
    return `M${top.join(",")}Q${mid.join(",")} ${bot.join(",")}`;
  };
  const ladder = [-0.45, 0.45].map((b) => `M${L(-4.75, b, 1.0).join(",")}L${L(-4.75, b, 3.9).join(",")}`).join("") + [1.4, 2.0, 2.6, 3.2].map((z) => `M${L(-4.75, -0.45, z).join(",")}L${L(-4.75, 0.45, z).join(",")}`).join("");
  const reel = L(-0.6, s * 1.25, 1.0);
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={10} w={2.4} />
      {wheels(L, 3.4, 1.2)}
      <Box x={x} y={y} heading={heading} l={10} w={2.4} h={0.8} z={0.4} color="#545b66" />
      <Box x={x + Math.cos(heading) * 3.9} y={y + Math.sin(heading) * 3.9} heading={heading} l={2.2} w={2.5} h={2.4} z={1.0} color="#e8574a">
        {(f) => (
          <g>
            <polygon points={windowPoly(f, 0.15, 0.85, 1.3, 2.1)} fill="url(#glass)" stroke={OUT} strokeWidth={1.5} />
            <Driver at={f.at(0.5, 1.55)} />
          </g>
        )}
      </Box>
      <Capsule a={L(2.2, 0, 2.5)} b={L(-4.2, 0, 2.5)} r={R * K} fill="#f6c02c" />
      <path d={ring(1.4) + ring(-3.4)} stroke="#c99a12" strokeWidth={2.2} fill="none" />
      <line {...line(L(2.0, 0, 2.5 - R * 0.6), L(-4.0, 0, 2.5 - R * 0.6))} stroke="#d9a520" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      <line {...line(L(2.0, 0, 3.6), L(-4.0, 0, 3.6))} stroke="#fff3b0" strokeWidth={3} strokeLinecap="round" />
      {[0.6, -2.2].map((a) => {
        const p = L(a, 0, 2.5 + R);
        return <ellipse key={a} cx={p[0]} cy={p[1]} rx={5} ry={2.8} fill="#d9a520" stroke={OUT} strokeWidth={1.4} />;
      })}
      <path d={ladder} stroke={OUT} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <circle cx={reel[0]} cy={reel[1]} r={6} fill="#30343c" stroke={OUT} strokeWidth={1.4} />
      <circle cx={reel[0]} cy={reel[1]} r={3.8} fill="none" stroke="#e8574a" strokeWidth={2} />
      <FaceText at={L(-1, 1.3, 1.9)} heading={heading} size={13}>Treibstoff</FaceText>
      <Glow at={L(3.9, 0, 3.7)} r={2.4} color={LIGHT.amber} className="blink" />
    </g>
  );
}

export function Tug({ x, y, heading, color = "#eef1f4" }: V & { color?: string }) {
  const L = local(x, y, heading);
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={5} w={2.8} />
      <line {...line(L(2.5, 0, 0.8), L(3.5, 0, 0.6))} stroke={OUT} strokeWidth={3.5} strokeLinecap="round" />
      {wheels(L, 1.6, 1.3, 0.6)}
      <Box x={x} y={y} heading={heading} l={5} w={2.8} h={1.3} z={0.5} color={color}>
        {(f) => (isFront(f) || isBack(f) ? <polygon points={windowPoly(f, 0.06, 0.94, 0.15, 0.65)} fill="url(#warn)" stroke={OUT} strokeWidth={1.2} /> : null)}
      </Box>
      <Box x={x - Math.cos(heading) * 1.2} y={y - Math.sin(heading) * 1.2} heading={heading} l={1.6} w={2} h={1.3} z={1.8} color={color}>
        {(f) => (
          <g>
            <polygon points={windowPoly(f, 0.15, 0.85, 0.3, 1.1)} fill="url(#glass)" stroke={OUT} strokeWidth={1.4} />
            <Driver at={f.at(0.5, 0.6)} />
          </g>
        )}
      </Box>
      <circle cx={L(-1.2, 0, 3.3)[0]} cy={L(-1.2, 0, 3.3)[1]} r={3} fill="#ffa62b" stroke={OUT} strokeWidth={1.2} className="blink" />
      <Glow at={L(-1.2, 0, 3.3)} r={2.4} color={LIGHT.amber} className="blink" />
    </g>
  );
}

const BAG_COLORS = ["#e8574a", "#4cbb6c", "#3aa3e8", "#f39a35", "#9a6ee8", "#ef6fae", "#f6c02c"];

export function BaggageCart({ x, y, heading, bags = 3, seed = 0 }: V & { bags?: number; seed?: number }) {
  const L = local(x, y, heading);
  const s = nearSide(heading);
  const e = Math.cos(heading) + Math.sin(heading) > 0 ? 1 : -1;
  const rail = (a0: number, b0: number, a1: number, b1: number) => `M${L(a0, b0, 2.0).join(",")}L${L(a1, b1, 2.0).join(",")}M${L(a0, b0, 0.8).join(",")}L${L(a0, b0, 2.0).join(",")}`;
  const back = rail(1.55, -s * 1.0, -1.55, -s * 1.0) + rail(-e * 1.55, s * 1.0, -e * 1.55, -s * 1.0);
  const front = rail(1.55, s * 1.0, -1.55, s * 1.0) + rail(e * 1.55, s * 1.0, e * 1.55, -s * 1.0) + `M${L(0, s * 1.0, 0.8).join(",")}L${L(0, s * 1.0, 2.0).join(",")}`;
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={3.2} w={2.1} />
      <line {...line(L(1.6, 0, 0.55), L(2.5, 0, 0.45))} stroke={OUT} strokeWidth={2.6} strokeLinecap="round" />
      {wheels(L, 1.1, 0.9, 0.4)}
      <Box x={x} y={y} heading={heading} l={3.2} w={2.1} h={0.35} z={0.45} color="#8a929c" />
      <path d={back} stroke="#5d6670" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      {[...Array(bags).keys()].map((i) => {
        const a = -1 + (i % 3) * 1;
        const b = i < 3 ? -0.45 : 0.45;
        return <Box key={i} x={x + Math.cos(heading) * a - Math.sin(heading) * b} y={y + Math.sin(heading) * a + Math.cos(heading) * b} heading={heading} l={0.8} w={0.75} h={0.9} z={0.8} color={BAG_COLORS[(i + seed) % BAG_COLORS.length]} />;
      })}
      <path d={front} stroke="#5d6670" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </g>
  );
}

export function DeiceTruck({ x, y, heading, basket }: V & { basket?: Pt }) {
  const L = local(x, y, heading);
  const pivot = L(-2.5, 0, 3.2);
  const b = basket ?? L(-6, 0, 9);
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={9} w={2.5} />
      {wheels(L, 3, 1.2)}
      <Box x={x} y={y} heading={heading} l={9} w={2.5} h={2.4} z={0.5} color="#f6c02c">
        {(f) => (isBack(f) ? <polygon points={windowPoly(f, 0.06, 0.94, 0.1, 0.6)} fill="url(#warn)" stroke={OUT} strokeWidth={1.2} /> : null)}
      </Box>
      <Box x={x + Math.cos(heading) * 3.8} y={y + Math.sin(heading) * 3.8} heading={heading} l={1.6} w={2.5} h={2.1} z={2.9} color="#f6c02c">
        {(f) => (
          <g>
            <polygon points={windowPoly(f, 0.15, 0.85, 0.4, 1.6)} fill="url(#glass)" stroke={OUT} strokeWidth={1.4} />
            <Driver at={f.at(0.5, 0.8)} />
          </g>
        )}
      </Box>
      <FaceText at={L(-0.5, 1.25, 1.2)} heading={heading} size={13}>Enteisung</FaceText>
      <line {...line(pivot, b)} stroke={OUT} strokeWidth={10} strokeLinecap="round" />
      <line {...line(pivot, b)} stroke="#f39a35" strokeWidth={6} strokeLinecap="round" />
      <rect x={b[0] - 11} y={b[1] - 4} width={22} height={14} rx={3} fill="#f39a35" stroke={OUT} strokeWidth={2} />
      <circle cx={b[0]} cy={b[1] - 9} r={5} fill="#ffd9a8" stroke={OUT} strokeWidth={1.5} />
      <path d={`M${b[0] - 6},${b[1] - 11} a6,6 0 0 1 12,0 z`} fill="#f6c02c" stroke={OUT} strokeWidth={1.5} />
      <Glow at={L(3.8, 0, 5.3)} r={2.4} color={LIGHT.amber} className="blink" />
    </g>
  );
}

export function BeltLoader({ x, y, heading, top }: V & { top: Pt }) {
  const L = local(x, y, heading);
  const bottom = L(-3, 0, 1.0);
  const mid: Pt = [(bottom[0] + top[0]) / 2, (bottom[1] + top[1]) / 2];
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={6} w={2.2} />
      {wheels(L, 1.8, 1, 0.5)}
      <Box x={x} y={y} heading={heading} l={6} w={2.2} h={0.8} z={0.5} color="#dfe3e8" />
      <line {...line(L(1.2, 0, 1.3), mid)} stroke={OUT} strokeWidth={6} strokeLinecap="round" />
      <line {...line(L(1.2, 0, 1.3), mid)} stroke="#9aa6b3" strokeWidth={3} strokeLinecap="round" />
      <line {...line(bottom, top)} stroke={OUT} strokeWidth={22} strokeLinecap="round" />
      <line {...line(bottom, top)} stroke="#4a5160" strokeWidth={17} strokeLinecap="round" />
      <line {...line(bottom, top)} stroke="#6f7787" strokeWidth={13} strokeDasharray="3 6" className="belt-move" />
      <line {...line([bottom[0], bottom[1] - 9], [top[0], top[1] - 9])} stroke={OUT} strokeWidth={5} strokeLinecap="round" />
      <line {...line([bottom[0], bottom[1] - 9], [top[0], top[1] - 9])} stroke="#f6c02c" strokeWidth={2.6} strokeLinecap="round" />
      <Glow at={L(2.6, 0, 1.6)} r={2.2} color={LIGHT.amber} className="blink" />
    </g>
  );
}

export function Stairs({ x, y, heading, h }: V & { h: number }) {
  const L = local(x, y, heading);
  const steps = 8;
  return (
    <g>
      <GroundShadow x={x} y={y} heading={heading} l={5} w={1.9} />
      {wheels(L, 2, 0.9, 0.45)}
      <Box x={x} y={y} heading={heading} l={5} w={1.9} h={0.6} z={0.4} color="#f2f4f6" />
      <line {...line(L(2.4, -0.95, 2), L(-2.0, -0.95, h + 1))} stroke="#e8574a" strokeWidth={3} strokeLinecap="round" />
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
const HAIR = ["#3b2a1e", "#e0b04a", "#1f1a17", "#8a4b2a", "#c96a2c"];

function Smile({ y, seed }: { y: number; seed: number }) {
  return (
    <g>
      <circle cx={-2.4} cy={y - 0.6} r={1.05} fill={OUT} />
      <circle cx={2.4} cy={y - 0.6} r={1.05} fill={OUT} />
      <circle cx={-4} cy={y + 1.8} r={1.3} fill="#ff8a8a" opacity={0.45} />
      <circle cx={4} cy={y + 1.8} r={1.3} fill="#ff8a8a" opacity={0.45} />
      <path d={`M-2.4,${y + 2} q2.4,${seed % 2 ? 2.6 : 2} 4.8,0`} fill="none" stroke={OUT} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

const arm = (d: string, color: string) => (
  <g>
    <path d={d} stroke={OUT} strokeWidth={5} strokeLinecap="round" fill="none" />
    <path d={d} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
  </g>
);

export type PersonPose = "stand" | "wave" | "point" | "carry";

export function Person({ at, scale = 1, seed = 0, pose = "stand" }: { at: Pt; scale?: number; seed?: number; pose?: PersonPose }) {
  const skin = SKIN[seed % SKIN.length];
  const vest = seed % 3 === 2 ? "#ff9a3c" : "#ffd23a";
  const helmet = seed % 2 === 0;
  const s = scale * (K / 8);
  const hand = (p: Pt) => <circle cx={p[0]} cy={p[1]} r={2.2} fill={skin} stroke={OUT} strokeWidth={1.2} />;
  const place = `translate(${at[0]},${at[1]}) scale(${s})`;
  const bob = pose === "wave" ? "bob" : undefined;
  return (
    <g transform={place} className={bob}>
      <Lamp>
        <g transform={place} className={bob}>
          <path d="M-6.4,-18.5 h12.8 M-6.4,-14.5 h12.8" stroke="#ffffff" strokeWidth={6} opacity={0.35} strokeLinecap="round" />
          <path d="M-6.4,-18.5 h12.8 M-6.4,-14.5 h12.8" stroke="#ffffff" strokeWidth={2.4} />
        </g>
      </Lamp>
      <ellipse cx={0} cy={0} rx={8} ry={3.2} fill="rgba(30,40,60,0.2)" />
      <rect x={-4.8} y={-13} width={4.2} height={13} rx={2} fill="#2f4a7a" stroke={OUT} strokeWidth={1.5} />
      <rect x={0.6} y={-13} width={4.2} height={13} rx={2} fill="#2f4a7a" stroke={OUT} strokeWidth={1.5} />
      <ellipse cx={-3} cy={-0.6} rx={3} ry={1.6} fill={OUT} />
      <ellipse cx={3} cy={-0.6} rx={3} ry={1.6} fill={OUT} />
      {pose === "carry" && (
        <g>
          <rect x={-16} y={-14} width={9} height={9} rx={1.8} fill={BAG_COLORS[(seed + 2) % BAG_COLORS.length]} stroke={OUT} strokeWidth={1.4} />
          <path d="M-13.5,-14 v-1.8 h4 v1.8" fill="none" stroke={OUT} strokeWidth={1.4} />
        </g>
      )}
      <rect x={-6.8} y={-28} width={13.6} height={17} rx={4.5} fill="#3d5a8a" stroke={OUT} strokeWidth={1.5} />
      <path d="M-6.8,-24 q0,-4 3.5,-4 h1.8 l1.5,6 l1.5,-6 h1.8 q3.5,0 3.5,4 v12.5 q0,0.5 -0.5,0.5 h-12.6 q-0.5,0 -0.5,-0.5 z" fill={vest} stroke={OUT} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M-6.4,-18.5 h12.8 M-6.4,-14.5 h12.8" stroke="#eef3f8" strokeWidth={2.2} />
      <path d="M-6.4,-18.5 h12.8 M-6.4,-14.5 h12.8" stroke="#b8c4cf" strokeWidth={0.6} />
      {pose === "wave" ? (
        <g className="wave-arm">
          {arm("M-6,-24 L-12,-36", vest)}
          {hand([-12.5, -37])}
        </g>
      ) : pose === "carry" ? (
        <g>
          {arm("M-6,-24 L-10,-15", vest)}
          {hand([-10.5, -14.5])}
        </g>
      ) : (
        <g>
          {arm("M-6,-24 L-9,-13", vest)}
          {hand([-9.2, -12.5])}
        </g>
      )}
      {pose === "point" ? (
        <g>
          {arm("M6,-24 L17,-27", vest)}
          {hand([17.5, -27])}
          <path d="M19,-27.4 l3.5,-0.8" stroke={OUT} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {arm("M6,-24 L9,-13", vest)}
          {hand([9.2, -12.5])}
        </g>
      )}
      <rect x={-2} y={-30.5} width={4} height={3} fill={skin} />
      <circle cx={0} cy={-35} r={7} fill={skin} stroke={OUT} strokeWidth={1.5} />
      <Smile y={-34.5} seed={seed} />
      {helmet ? (
        <g>
          <path d="M-7.4,-36.5 a7.4,7.4 0 0 1 14.8,0 z" fill={seed % 4 === 0 ? "#ffffff" : "#f6c02c"} stroke={OUT} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M-8.6,-36.5 h17.2" stroke={OUT} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M-2.5,-42 h5" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
        </g>
      ) : (
        <g>
          <path d="M-7,-36 q-0.5,-7.5 7,-7.5 q7.5,0 7,7.5 q-3,-3.5 -7,-3.2 q-4,-0.3 -7,3.2 z" fill={HAIR[seed % HAIR.length]} stroke={OUT} strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M-7.6,-35 a7.8,8.4 0 0 1 15.2,0" fill="none" stroke={OUT} strokeWidth={2.4} />
          <ellipse cx={-7.4} cy={-34.4} rx={2.2} ry={3.2} fill="#e8574a" stroke={OUT} strokeWidth={1.2} />
          <ellipse cx={7.4} cy={-34.4} rx={2.2} ry={3.2} fill="#e8574a" stroke={OUT} strokeWidth={1.2} />
        </g>
      )}
    </g>
  );
}

export function Passenger({ at, seed = 0 }: { at: Pt; seed?: number }) {
  const colors = ["#e8574a", "#3aa3e8", "#4cbb6c", "#9a6ee8", "#ef6fae", "#f39a35"];
  const skin = SKIN[(seed + 2) % SKIN.length];
  return (
    <g transform={`translate(${at[0]},${at[1]}) scale(1.15)`}>
      <ellipse cx={0} cy={0} rx={6.5} ry={2.6} fill="rgba(30,40,60,0.2)" />
      <rect x={-4} y={-10} width={8} height={10} rx={2} fill="#3d4a63" stroke={OUT} strokeWidth={1.3} />
      <rect x={-5} y={-22} width={10} height={13} rx={4} fill={colors[seed % colors.length]} stroke={OUT} strokeWidth={1.3} />
      <rect x={5} y={-12} width={6} height={7} rx={1.5} fill={colors[(seed + 3) % colors.length]} stroke={OUT} strokeWidth={1.2} />
      <path d="M6.5,-12 v-1.6 h3 v1.6" fill="none" stroke={OUT} strokeWidth={1.1} />
      <circle cx={0} cy={-28} r={5.6} fill={skin} stroke={OUT} strokeWidth={1.3} />
      <path d="M-5.6,-28.5 q-0.3,-6 5.6,-6 q5.9,0 5.6,6 q-2.4,-2.8 -5.6,-2.6 q-3.2,-0.2 -5.6,2.6 z" fill={HAIR[seed % HAIR.length]} stroke={OUT} strokeWidth={1.1} strokeLinejoin="round" />
      <circle cx={-1.9} cy={-28} r={0.85} fill={OUT} />
      <circle cx={1.9} cy={-28} r={0.85} fill={OUT} />
      <path d="M-1.8,-25.8 q1.8,1.6 3.6,0" fill="none" stroke={OUT} strokeWidth={1} strokeLinecap="round" />
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

/** side view, nose to the right; gear 1 = down, 0 = retracted, undefined = no gear */
export const SIDE_MAIN_GEAR_X = 68;
export function SidePlane({ type, color, width = 96, gear }: { type: AircraftType; color: string | null; width?: number; gear?: number }) {
  const c = color ?? "#b9c2cc";
  const cargo = !!type.freighter;
  const body = color ? (cargo ? c : "#f3f9ff") : "#d5dbe1";
  const belly = color ? (cargo ? shade(c, 0.86) : "#d3e2ef") : "#c3cad2";
  const long = type.longHaul;
  const shift = long ? 4 : 0;
  const end = long ? 98 : 92;
  const nose = long ? 116 : 110;
  const legs = gear !== undefined && gear > 0.04 ? [long ? 100 : 94, SIDE_MAIN_GEAR_X - 4, SIDE_MAIN_GEAR_X + 3] : [];
  const hull = `M10,28 C10,22 20,20 30,20 L${end},20 C${end + 14},20 ${nose},26 ${nose},30 C${nose},34 104,36 96,36 L24,36 C16,36 10,34 10,28 Z`;
  const cp = type.id === "B747" ? { x: long ? 99 : 93, y: 15.6 } : { x: long ? 103 : 97, y: 22.2 };
  const windows = (y: number, from: number, to: number, skip: number[]) => {
    let d = "";
    for (let x = from; x <= to; x += 4) if (!skip.some((s) => Math.abs(s - x) < 3)) d += `M${x},${y}v2.2`;
    return d;
  };
  const frontDoor = nose - 21;
  return (
    <svg viewBox="0 0 120 50" width={width} height={(width * 50) / 120} aria-hidden="true" overflow="visible">
      <g stroke={OUT} strokeWidth={2} strokeLinejoin="round">
        <path d="M14,30 L6,8 L16,8 L30,24 Z" fill={c} />
        <path d="M9,10 L14.5,10 L19,15 L11,15 Z" fill="#ffffff" opacity={0.35} stroke="none" />
        <path d={hull} fill={body} />
        {type.id === "B747" && <path d="M70,20 C76,12 96,12 104,20 Z" fill={body} />}
        {type.id === "A380" && <path d="M28,20 C40,12 96,12 108,24 L28,22 Z" fill={body} />}
        <path d={`M10.4,30 L${nose - 0.4},30 C${nose - 1},34 104,35.6 96,35.6 L24,35.6 C16,35.6 11,34 10.4,30 Z`} fill={belly} stroke="none" />
        <path d={hull} fill="none" />
        <path d={`M24,32.6 L${end + 6},32.6`} stroke={cargo ? shade(c, 0.72) : c} strokeWidth={3.4} />
        <path d={`M30,22.2 L${end - 2},22.2`} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
        {!cargo && <path d={windows(24.4, 34, end - 6, [frontDoor, 28])} stroke="#2c4a6b" strokeWidth={2.2} strokeLinecap="round" />}
        {cargo && color && <Parcel at={[15, 17]} size={7} />}
        {type.id === "A380" && <path d={windows(16.6, 38, 94, [])} stroke="#2c4a6b" strokeWidth={2} strokeLinecap="round" />}
        {type.id === "B747" && <path d={windows(16.4, 80, 92, [])} stroke="#2c4a6b" strokeWidth={2} strokeLinecap="round" />}
        <g fill="none" stroke="#8ea3b8" strokeWidth={0.9}>
          <rect x={frontDoor - 1.7} y={21.8} width={3.4} height={8.6} rx={1} />
          <rect x={26.4} y={22.4} width={3.2} height={8} rx={1} />
          <rect x={nose - 32} y={30.4} width={5} height={3.6} rx={0.8} />
        </g>
        <path d={`M${cp.x - 1},${cp.y} h3.2 l0.8,3 h-4 z M${cp.x + 3.4},${cp.y} h1.4 l2.8,3 h-3.4 z`} fill="#2c4a6b" strokeWidth={0.8} />
        <path d="M30,28 L19,28 L9,35 L16,35 Z" fill="#dbe9f4" />
        {type.props ? (
          <g>
            <rect x={42} y={16} width={34} height={5} rx={2.5} fill="#dbe9f4" />
            <rect x={56} y={20} width={14} height={7} rx={3} fill={c} />
            <ellipse cx={72} cy={23} rx={2} ry={9} fill="rgba(255,255,255,0.6)" strokeWidth={1.2} />
            <path d="M72,15.5 L72,30.5" stroke="rgba(38,48,63,0.35)" strokeWidth={1.2} />
            <ellipse cx={72.6} cy={23} rx={1.6} ry={1.8} fill={c} strokeWidth={1} />
          </g>
        ) : (
          <g>
            <path d={`M${62 + shift},36.5 L${66 + shift},31`} strokeWidth={4.2} strokeLinecap="round" />
            <path d={`M${62 + shift},36.5 L${66 + shift},31`} stroke="#c9d6e2" strokeWidth={2} strokeLinecap="round" />
            <path d={`M${76 + shift},29 L${56 + shift},31 L${40 + shift},43 L${50 + shift},43 Z`} fill="#dbe9f4" />
            <path d={`M${42 + shift},41.6 L${54 + shift},33`} stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" />
            <path d={`M${40 + shift},43 L${37 + shift},38.6 L${39.6 + shift},38.6 L${44 + shift},43 Z`} fill={c} strokeWidth={1.4} />
            {type.engines === 4 && <rect x={46 + shift} y={38} width={12} height={5} rx={2.5} fill={c} />}
            <path d={`M${59.5 + shift},38.4 l-3.2,1.6 l3.2,1.6 z`} fill="#6b7785" strokeWidth={1.1} />
            <rect x={59 + shift} y={36} width={17} height={8} rx={4} fill={c} />
            <path d={`M${62 + shift},37.6 h10`} stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.6} />
            <ellipse cx={75 + shift} cy={40} rx={2.3} ry={4} fill="#dfe7ef" strokeWidth={1.1} />
            <ellipse cx={75.4 + shift} cy={40} rx={1.4} ry={2.9} fill="#3a4757" strokeWidth={0.9} />
          </g>
        )}
        {legs.map((x) => (
          <g key={x}>
            <line x1={x} y1={34} x2={x} y2={36 + 9 * gear!} strokeWidth={2.2} />
            <circle cx={x} cy={36 + 9 * gear!} r={3.3 * gear!} fill="#30343c" strokeWidth={1.4} />
            <circle cx={x} cy={36 + 9 * gear!} r={1.4 * gear!} fill="#c3ccd6" stroke="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}
