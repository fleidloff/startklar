import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { BaggageCart, Box, Cone, Cylinder, FaceText, Glow, LIGHT, Lamp, Lights, OUT, Person, Plane, Tug, Wheel, Detail, local, type Drawable } from "./art";
import { P, arc, gateY, pts, shade, viewBox, type Pt } from "@/game/iso";
import type { Plane as PlaneT, Season } from "@/game/state";
import { aircraft } from "@/game/data";

const poly = (list: [number, number][], z = 0) => pts(list.map(([x, y]) => P(x, y, z)));

export const RAINBOW = ["#e8574a", "#f39a35", "#f6c02c", "#4cbb6c", "#3aa3e8", "#9a6ee8"];

export function parkedPose(p: Pick<PlaneT, "gate" | "type">) {
  const L = aircraft(p.type).gameLength;
  return { x: 8 + L / 2, y: gateY(p.gate), heading: Math.PI };
}

export function waitingPose(p: Pick<PlaneT, "gate" | "type">) {
  const L = aircraft(p.type).gameLength;
  return { x: 46 + L / 2 - 4, y: gateY(p.gate), heading: Math.PI };
}

function Ground({ season }: { season: Season }) {
  const winter = season === "winter";
  const grass = winter ? "#eef5fb" : "#8ccf55";
  const concrete = winter ? "#d6d9de" : "#c9c1b5";
  const asphalt = winter ? "#6a6f77" : "#5c6168";
  return (
    <g>
      <polygon points={poly([[-80, -140], [300, -140], [300, 320], [-80, 320]])} fill={grass} />
      {winter && <polygon points={poly([[-80, -140], [300, -140], [300, 320], [-80, 320]])} fill="url(#snowdots)" />}
      {!winter && <polygon points={poly([[-80, -140], [300, -140], [300, 320], [-80, 320]])} fill="url(#grassdots)" />}
      <polygon points={poly([[0, -50], [62, -50], [62, 230], [0, 230]])} fill={concrete} stroke={shade("#c9c1b5", 0.85)} strokeWidth={2} />
      <path d={joints} stroke="rgba(60,50,40,0.09)" strokeWidth={1.5} fill="none" />
      <polygon points={poly([[62, -50], [96, -50], [96, 230], [62, 230]])} fill={asphalt} />
      <polygon points={poly([[96, -46], [104, -46], [104, -32], [96, -32]])} fill={asphalt} />
      <polygon points={poly([[104, -120], [136, -120], [136, 300], [104, 300]])} fill={shade(asphalt, 0.88)} />
      <polyline points={poly([[105.5, -120], [105.5, 300]])} stroke="#fff" strokeWidth={2.5} fill="none" />
      <polyline points={poly([[134.5, -120], [134.5, 300]])} stroke="#fff" strokeWidth={2.5} fill="none" />
      <polyline points={poly([[120, -120], [120, 300]])} stroke="#fff" strokeWidth={3} strokeDasharray="30 26" fill="none" />
      {[108, 112, 116, 124, 128, 132].map((x) => (
        <polygon key={x} points={poly([[x - 1, 250], [x + 1, 250], [x + 1, 270], [x - 1, 270]])} fill="#fff" />
      ))}
      <polyline points={poly([[80, -50], [80, 230]])} stroke="#f6c02c" strokeWidth={3} fill="none" />
      <polyline points={poly([[80, -39], [120, -39]])} stroke="#f6c02c" strokeWidth={3} fill="none" />
      <polyline points={poly([[48, -50], [48, 230]])} stroke="#f6c02c" strokeWidth={3} fill="none" />
      <polyline points={poly([[58, -50], [58, 230]])} stroke="#ffffff" strokeWidth={2} strokeDasharray="14 12" fill="none" />
      <polyline points={poly([[62, -50], [62, 230]])} stroke={winter ? "#a8b0ba" : "#ffffff"} strokeWidth={3} fill="none" />
      {[0, 1, 2].map((g) => {
        const y = gateY(g);
        return (
          <g key={g}>
            <polyline points={poly([[4, y - 26], [56, y - 26], [56, y + 26], [4, y + 26]])} fill="none" stroke="#ffffff" strokeWidth={2} />
            <polygon points={poly([[1, y + 27], [12, y + 27], [12, y + 40], [1, y + 40]])} fill="url(#hatch)" stroke="#e05555" strokeWidth={2} />
            <polygon points={poly([[1, y - 40], [12, y - 40], [12, y - 27], [1, y - 27]])} fill="url(#hatch)" stroke="#e05555" strokeWidth={2} />
            <polyline points={pts([[48, y + 30] as Pt, ...arc(40, y + 8, 8, 0, -Math.PI / 2, 8)].map(([x, yy]) => P(x, yy)))} fill="none" stroke="#f6c02c" strokeWidth={3} />
            <polyline points={poly([[40, y], [8, y]])} fill="none" stroke="#f6c02c" strokeWidth={3} />
            <polyline points={poly([[8, y - 3], [8, y + 3]])} fill="none" stroke="#e8574a" strokeWidth={4} />
            {[-1.6, 1.6].map((o) => (
              <polyline key={o} points={poly([[46, y + 4 + o], [24, y + o], [12, y + o]])} fill="none" stroke="rgba(40,40,40,0.07)" strokeWidth={7} strokeLinecap="round" />
            ))}
          </g>
        );
      })}
      <path d={chevrons} stroke="#f6c02c" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {winter && <SnowPiles />}
    </g>
  );
}


const joints = (() => {
  let d = "";
  const seg = (a: Pt, b: Pt) => (d += `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`);
  for (let x = 8; x < 62; x += 8) seg(P(x, -50), P(x, 230));
  for (let y = -42; y < 230; y += 8) seg(P(0, y), P(62, y));
  return d;
})();

/** groups of three yellow arrows: along the taxi lane towards the runway and along each lead-in line towards the stop mark */
const chevrons = (() => {
  let d = "";
  const arrow = (x: number, y: number, dx: number, dy: number) => {
    const tip = P(x + dx * 1.2, y + dy * 1.2);
    const l = P(x - dx * 0.6 - dy * 1.3, y - dy * 0.6 - dx * 1.3);
    const r = P(x - dx * 0.6 + dy * 1.3, y - dy * 0.6 + dx * 1.3);
    d += `M${l[0].toFixed(1)},${l[1].toFixed(1)}L${tip[0].toFixed(1)},${tip[1].toFixed(1)}L${r[0].toFixed(1)},${r[1].toFixed(1)}`;
  };
  for (let y = 210; y > -20; y -= 34) for (let i = 0; i < 3; i++) arrow(80, y - i * 3.2, 0, -1);
  for (let g = 0; g < 3; g++) for (let i = 0; i < 3; i++) {
    arrow(34 - i * 3.2, gateY(g), -1, 0);
    arrow(48, gateY(g) + 46 - i * 3.2, 0, -1);
  }
  return d;
})();

/** zero-length round-capped segments: one path draws a whole row of lights */
const dots = (list: Pt[]) => list.map(([x, y]) => `M${x.toFixed(1)},${y.toFixed(1)}h0.01`).join("");
const row = (x0: number, y0: number, x1: number, y1: number, step: number) => {
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / step);
  return [...Array(n + 1).keys()].map((i) => P(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n));
};
const GROUND_LIGHTS: [string, Pt[]][] = [
  [LIGHT.green, [...row(80, -46, 80, 226, 8), ...row(88, -39, 112, -39, 8)]],
  [LIGHT.blue, [...row(63, -48, 63, 228, 16), ...row(95, -28, 95, 228, 16)]],
  [LIGHT.white, [...row(105.5, -118, 105.5, 298, 16), ...row(134.5, -118, 134.5, 298, 16), ...row(120, -110, 120, 290, 20)]],
  [LIGHT.green, row(106, 276, 134, 276, 4)],
  [LIGHT.red, row(106, -116, 134, -116, 4)],
];

function GroundLights() {
  return (
    <Lamp>
      <g strokeLinecap="round" fill="none">
        {GROUND_LIGHTS.map(([color, list], i) => (
          <g key={i}>
            <path d={dots(list)} stroke={color} strokeWidth={14} opacity={0.3} />
            <path d={dots(list)} stroke={color} strokeWidth={5} />
            <path d={dots(list)} stroke="#ffffff" strokeWidth={2} />
          </g>
        ))}
      </g>
    </Lamp>
  );
}

/** floodlight mast in front of the terminal, shining onto the stands */
function Mast({ x, y }: { x: number; y: number }) {
  const head = P(x + 0.6, y, 22.4);
  const pool = P(x + 18, y, 0);
  const R = 20;
  const rx = 1.2247 * R * 8;
  const ry = 0.7071 * R * 8;
  return (
    <g>
      <Cylinder x={x} y={y} z0={0} z1={22} r={0.35} color="#9aa3ad" />
      <Box x={x} y={y} l={0.9} w={3.4} h={0.9} z={22} color="#5c6168" />
      <Lamp>
        <polygon points={pts([head, [pool[0] - rx * 0.7, pool[1]], [pool[0] + rx * 0.7, pool[1]]])} fill={LIGHT.warm} opacity={0.07} />
        <ellipse cx={pool[0]} cy={pool[1]} rx={rx} ry={ry} fill={LIGHT.warm} opacity={0.12} />
        <ellipse cx={pool[0]} cy={pool[1]} rx={rx * 0.6} ry={ry * 0.6} fill={LIGHT.warm} opacity={0.08} />
      </Lamp>
      {[-1.1, 0, 1.1].map((o) => (
        <Glow key={o} at={P(x + 0.5, y + o, 22.4)} r={2.6} color={LIGHT.warm} />
      ))}
    </g>
  );
}

const MASTS = [-4, 59, 117, 175].map((y) => ({ key: `mast${y}`, depth: 0.8 + y, node: <Mast x={0.8} y={y} /> }));

function SnowPiles() {
  const piles: [number, number, number][] = [[64, -20, 3], [64, 60, 4], [64, 150, 3], [98, 40, 3], [98, 180, 4], [140, 10, 5], [-4, 210, 4]];
  return (
    <g>
      {piles.map(([x, y, r], i) => {
        const c = P(x, y);
        return <ellipse key={i} cx={c[0]} cy={c[1]} rx={r * 12} ry={r * 6} fill="#ffffff" stroke="#c4dcef" strokeWidth={2} />;
      })}
    </g>
  );
}

export function Patterns() {
  return (
    <defs>
      <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="10" height="10" fill="rgba(232,87,74,0.08)" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="#e05555" strokeWidth="3" />
      </pattern>
      <pattern id="warn" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="9" height="9" fill="#f6c02c" />
        <rect width="4.5" height="9" fill="#26303f" />
      </pattern>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c4e8fb" />
        <stop offset="0.55" stopColor="#7cc4ec" />
        <stop offset="1" stopColor="#5aa6d6" />
      </linearGradient>
      <pattern id="grassdots" width="40" height="30" patternUnits="userSpaceOnUse">
        <path d="M8,12 l2,-5 l2,5 M26,25 l2,-5 l2,5" stroke="#6fb33f" strokeWidth="1.6" fill="none" />
      </pattern>
      <pattern id="snowdots" width="44" height="34" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="10" r="3" fill="#d7e8f5" />
        <circle cx="30" cy="26" r="2" fill="#d7e8f5" />
      </pattern>
      <radialGradient id="glow">
        <stop offset="0" stopColor="#ffb347" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Terminal({ season }: { season: Season }) {
  const winter = season === "winter";
  return (
    <g>
      <Box x={-9} y={95} l={18} w={290} h={11} color="#d9dfe6" top={winter ? "#ffffff" : "#b8c2cc"}>
        {(f) =>
          Math.abs(Math.cos(f.heading + Math.PI / 2)) > 0.5 ? (
            <g>
              <polygon points={pts([f.at(0.01, 2), f.at(0.99, 2), f.at(0.99, 9.5), f.at(0.01, 9.5)])} fill="url(#glass)" stroke={OUT} strokeWidth={2} />
              {[...Array(48).keys()].map((i) => {
                const s = 0.01 + (i * 0.98) / 48;
                const a = f.at(s, 2);
                const b = f.at(s, 9.5);
                return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#4e8db8" strokeWidth={1.6} />;
              })}
              <polyline points={pts([f.at(0.01, 6), f.at(0.99, 6)])} stroke="#4e8db8" strokeWidth={1.6} fill="none" />
              <polyline points={pts([f.at(0.01, 3.4), f.at(0.99, 3.4)])} stroke="#4e8db8" strokeWidth={1.6} fill="none" />
              <polyline points={pts([f.at(0.01, 9.2), f.at(0.99, 9.2)])} stroke="#e6f6ff" strokeWidth={2} fill="none" />
              <polyline points={pts([f.at(0, 10.4), f.at(1, 10.4)])} stroke="#9aa6b3" strokeWidth={2.4} fill="none" />
            </g>
          ) : null
        }
      </Box>
      <Box x={-9} y={95} l={19} w={291} h={0.9} z={11} color="#c3ccd6" top={winter ? "#ffffff" : "#9aa6b3"} />
      <Lamp>
        <polygon points={pts([P(0, -47, 2), P(0, 237, 2), P(0, 237, 9.5), P(0, -47, 9.5)])} fill="#ffeeb0" opacity={0.65} />
      </Lamp>
      {[0, 1, 2].map((g) => {
        const y = gateY(g);
        const a = P(0.2, y + 6, 10.4);
        return (
          <g key={g}>
            <polygon points={pts([P(0.2, y + 14, 8.4), P(0.2, y - 2, 8.4), P(0.2, y - 2, 12.8), P(0.2, y + 14, 12.8)])} fill="#f6c02c" stroke={OUT} strokeWidth={2.8} strokeLinejoin="round" />
            <polygon points={pts([P(0.2, y + 13.2, 8.9), P(0.2, y - 1.2, 8.9), P(0.2, y - 1.2, 9.4), P(0.2, y + 13.2, 9.4)])} fill="#d9a520" />
            <FaceText at={[a[0], a[1] + 9]} heading={Math.PI / 2} size={26}>{`Gate ${g + 1}`}</FaceText>
          </g>
        );
      })}
    </g>
  );
}

function Tower({ season }: { season: Season }) {
  const x = 14;
  const y = -64;
  const winter = season === "winter";
  return (
    <g>
      <Box x={x + 12} y={y + 2} l={14} w={18} h={5} color="#dfe5ec" top={winter ? "#ffffff" : "#b8c2cc"}>
        {(f) => <polygon points={pts([f.at(0.1, 1.5), f.at(0.9, 1.5), f.at(0.9, 3.8), f.at(0.1, 3.8)])} fill="#7cc4ec" stroke={OUT} strokeWidth={1.6} />}
      </Box>
      <Cylinder x={x} y={y} z0={0} z1={26} r={2.6} color="#e9edf2" />
      <Cylinder x={x} y={y} z0={26} z1={27.5} r={5} color="#c9d2dc" />
      <Cylinder x={x} y={y} z0={27.5} z1={31.5} r={5.2} color="#5c86ad" top="#8fb7d8" />
      {(() => {
        const rx = 1.2247 * 5.2 * 8;
        const ry = 0.7071 * 5.2 * 8;
        const [cx, cyB] = P(x, y, 27.5);
        const cyT = P(x, y, 31.5)[1];
        return (
          <g stroke="#2f5578" strokeWidth={1.6}>
            {[-0.8, -0.45, 0, 0.45, 0.8].map((u) => (
              <line key={u} x1={cx + u * rx} y1={cyT + Math.sqrt(1 - u * u) * ry} x2={cx + u * rx} y2={cyB + Math.sqrt(1 - u * u) * ry} />
            ))}
            <path d={`M${cx - rx * 0.9},${cyT + ry * 0.3} A${rx},${ry} 0 0 0 ${cx - rx * 0.2},${cyT + ry * 0.98}`} stroke="#d6efff" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </g>
        );
      })()}
      <Lamp>
        {(() => {
          const rx = 1.2247 * 5.2 * 8;
          const ry = 0.7071 * 5.2 * 8;
          const [bx, by] = P(x, y, 27.6);
          const ty = P(x, y, 31.4)[1];
          return <path d={`M${bx - rx},${ty} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${bx + rx},${ty} A${rx},${ry} 0 0 1 ${bx - rx},${ty} Z`} fill={LIGHT.warm} opacity={0.55} />;
        })()}
      </Lamp>
      <Cylinder x={x} y={y} z0={31.5} z1={32.6} r={5.6} color={winter ? "#ffffff" : "#e9edf2"} />
      {(() => {
        const a = P(x, y, 32.6);
        const b = P(x, y, 37);
        return (
          <g>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={OUT} strokeWidth={3} />
            <line x1={a[0] - 9} y1={a[1] - 14} x2={a[0] + 9} y2={a[1] - 14} stroke={OUT} strokeWidth={2.4} strokeLinecap="round" />
            <line x1={a[0] - 6} y1={a[1] - 24} x2={a[0] + 6} y2={a[1] - 24} stroke={OUT} strokeWidth={2.4} strokeLinecap="round" />
            <g transform={`translate(${a[0] + 22},${a[1] - 4})`}>
              <line x1={0} y1={0} x2={0} y2={-10} stroke={OUT} strokeWidth={2.4} />
              <ellipse cx={0} cy={-12} rx={9} ry={4} fill="#eef2f6" stroke={OUT} strokeWidth={1.8} transform="rotate(-18 0 -12)" />
            </g>
            <circle cx={b[0]} cy={b[1]} r={4} fill="#e8574a" stroke={OUT} strokeWidth={1.5} className="blink" />
            <Glow at={b} r={3.5} color={LIGHT.red} className="blink" />
          </g>
        );
      })()}
    </g>
  );
}

/** the rotunda the finger turns around; fixed per gate, so the finger angles in to fit every plane size */
export const bridgePivot = (gate: number): Pt => [1.8, gateY(gate) - 6.5];

/** cab centre when docked at the front door of a parked plane */
export function bridgeDoor(gate: number, type: string): Pt {
  const t = aircraft(type);
  return [8.2 + t.gameLength * 0.12, gateY(gate) - t.radius - 1.9];
}

/** cab centre when pulled in and turned away from the stand */
export function bridgeParked(gate: number): Pt {
  const [x, y] = bridgePivot(gate);
  return [x + 5.5 * Math.cos(-1.2), y + 5.5 * Math.sin(-1.2)];
}

export const bridgeDepth = (gate: number) => gateY(gate) - 8;

export const bridgeHeight = (type?: string) => (type ? aircraft(type).radius + 0.5 : 2.5);

export function Bridge({ gate, cab, z }: { gate: number; cab: Pt; z: number }) {
  const [px, py] = bridgePivot(gate);
  const end: Pt = [cab[0] - 0.9, cab[1]];
  const a = Math.atan2(end[1] - py, end[0] - px);
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const len = Math.max(0.6, Math.hypot(end[0] - px, end[1] - py) - 2.2);
  const n = Math.max(2, Math.round(len / 1.4));
  const seg = len / n;
  const at = (s: number): Pt => [px + ux * (2.2 + s), py + uy * (2.2 + s)];
  const leg = at(len * 0.7);
  const L = local(leg[0], leg[1], a);
  const parts: Drawable[] = [
    {
      key: "leg",
      depth: leg[0] + leg[1] + 0.5,
      node: (
        <g>
          <Box x={leg[0]} y={leg[1]} heading={a} l={0.8} w={0.8} h={z - 1} z={1} color="#9aa3ad" />
          <Wheel at={L(-1, 0.7, 0.5)} r={0.5} />
          <Box x={leg[0]} y={leg[1]} heading={a} l={2.6} w={1.4} h={0.6} z={0.5} color="#6f7787" />
          <Wheel at={L(1, 0.7, 0.5)} r={0.5} />
        </g>
      ),
    },
    ...[...Array(n).keys()].map((i) => {
      const c = RAINBOW[i % RAINBOW.length];
      const [x, y] = at(seg * (i + 0.5));
      return {
        key: `seg${i}`,
        depth: x + y,
        node: (
          <Box x={x} y={y} heading={a} l={seg * 1.02} w={2.6} h={3} z={z} color={c} top={shade(c, 1.25)}>
            {(f) => <path d={[0.25, 0.5, 0.75].map((t) => `M${f.at(t, 0.3).join(",")}L${f.at(t, 2.7).join(",")}`).join("")} stroke={shade(c, 0.72)} strokeWidth={1.6} />}
          </Box>
        ),
      };
    }),
    { key: "rotunda", depth: px + py, node: <Cylinder x={px} y={py} z0={z - 0.3} z1={z + 3.4} r={2.1} color="#c9d2dc" top="#e3e8ee" /> },
    {
      key: "cab",
      depth: cab[0] + cab[1],
      node: (
        <Box x={cab[0]} y={cab[1]} l={1.8} w={3.2} h={3.4} z={z - 0.2} color="#dfe5ec">
          {(f) => (
            <g>
              <polygon points={pts([f.at(0.2, 1.6), f.at(0.8, 1.6), f.at(0.8, 2.8), f.at(0.2, 2.8)])} fill="url(#glass)" stroke={OUT} strokeWidth={1.4} />
              <Lamp>
                <polygon points={pts([f.at(0.2, 1.6), f.at(0.8, 1.6), f.at(0.8, 2.8), f.at(0.2, 2.8)])} fill="#fff1b8" opacity={0.85} />
              </Lamp>
            </g>
          )}
        </Box>
      ),
    },
  ];
  return (
    <g>
      <Cylinder x={px} y={py} z0={0} z1={z} r={0.55} color="#9aa3ad" />
      {parts
        .sort((p, q) => p.depth - q.depth)
        .map((d) => (
          <g key={d.key}>{d.node}</g>
        ))}
    </g>
  );
}

export function propsForGate(gate: number, season: Season): Drawable[] {
  const y = gateY(gate);
  const at = (x: number, yy: number, z = 0): Pt => P(x, yy, z);
  const list: Drawable[] = [
    ...[5.7, 10, 14.3].map((x, i) => ({ key: `cart${gate}${i}`, depth: x + y + 30.5, node: <BaggageCart x={x} y={y + 30.5} heading={0} bags={[4, 6, 3][i]} seed={gate + i * 2} /> })),
    { key: `train${gate}`, depth: 19 + y + 30.5, node: <Tug x={19} y={y + 30.5} heading={0} color="#3aa3e8" /> },
    { key: `tug${gate}`, depth: 6 + y - 33, node: <Tug x={6} y={y - 33} heading={Math.PI / 2} /> },
    { key: `cone${gate}`, depth: 52 + y + 24, node: <Cone at={at(52, y + 24)} /> },
    { key: `p${gate}a`, depth: 22 + y + 27.5, node: <Person at={at(22, y + 27.5)} seed={gate} pose="carry" /> },
    { key: `p${gate}b`, depth: 3 + y - 24, node: <Person at={at(3, y - 24)} seed={gate + 3} pose="wave" /> },
    { key: `p${gate}c`, depth: 45 + y + 17, node: <Person at={at(45, y + 17)} seed={gate + 1} pose="point" /> },
  ];
  if (season === "winter") list.push({ key: `cone2${gate}`, depth: 54 + y - 24, node: <Cone at={at(54, y - 24)} /> });
  return list;
}

type Camera = { x: number; y: number; zoom: number };

export interface IsoWorldProps {
  season: Season;
  camera: Camera;
  planes: PlaneT[];
  drawables?: Drawable[];
  /** drawn above everything; as a function it gets the zoom the picture was painted at */
  overlay?: ReactNode | ((zoom: number) => ReactNode);
  under?: ReactNode;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>;
  onPointerMove?: React.PointerEventHandler<SVGSVGElement>;
  onPointerUp?: React.PointerEventHandler<SVGSVGElement>;
  onPointerCancel?: React.PointerEventHandler<SVGSVGElement>;
  showProps?: boolean;
  docked?: (p: PlaneT) => boolean;
  /** gate whose finger the scene draws itself */
  ownBridge?: number;
  label?: string;
}

/** the svg is painted this much larger than the screen, so small camera moves need no repaint */
const OVERSCAN = 1.3;
const NONE: Drawable[] = [];

/** the painted picture still fills the screen at camera c and is not scaled up enough to look blurry */
const covers = (b: Camera, c: Camera) =>
  c.zoom / b.zoom < 1.2 && Math.abs(c.x - b.x) + 800 / c.zoom <= (800 * OVERSCAN) / b.zoom && Math.abs(c.y - b.y) + 500 / c.zoom <= (500 * OVERSCAN) / b.zoom;

const WorldContent = memo(function WorldContent({ season, items, under }: { season: Season; items: Drawable[]; under?: ReactNode }) {
  return (
    <>
      <Patterns />
      <Ground season={season} />
      <GroundLights />
      {under}
      <Terminal season={season} />
      {items.map((d) => (
        <g key={d.key}>{d.node}</g>
      ))}
    </>
  );
});

/**
 * shared 2.5D airport. Parked/waiting planes come from state, extra things via drawables.
 * Camera moves only shift the painted svg with a CSS transform (GPU); it is repainted at the
 * new camera once the camera rests or the move leaves the painted area.
 */
export function IsoWorld({ season, camera, planes, drawables = NONE, overlay, under, className, svgRef, showProps = true, docked, ownBridge, label, ...handlers }: IsoWorldProps) {
  const [painted, setPainted] = useState(camera);
  const view = covers(painted, camera) ? painted : camera;
  if (view !== painted) setPainted(view);
  const { x, y, zoom } = camera;
  useEffect(() => {
    if (x === painted.x && y === painted.y && zoom === painted.zoom) return;
    const t = setTimeout(() => setPainted({ x, y, zoom }), 160);
    return () => clearTimeout(t);
  }, [x, y, zoom, painted]);

  const items = useMemo(() => {
    const list: Drawable[] = [...drawables];
    for (let g = 0; g < 3; g++) {
      const plane = planes.find((p) => p.gate === g && p.stage === "abfertigung");
      const at = plane?.done.includes("finger") && (docked?.(plane) ?? true) ? plane.type : undefined;
      if (g !== ownBridge) list.push({ key: `bridge${g}`, depth: bridgeDepth(g), node: <Bridge gate={g} cab={at ? bridgeDoor(g, at) : bridgeParked(g)} z={bridgeHeight(at)} /> });
      if (showProps) list.push(...propsForGate(g, season));
    }
    list.push({ key: "tower", depth: -40, node: <Tower season={season} /> });
    list.push(...MASTS);
    return list.sort((a, b) => a.depth - b.depth);
  }, [drawables, planes, docked, ownBridge, showProps, season]);

  const edge = `${(-(OVERSCAN - 1) * 50).toFixed(2)}%`;
  const moving = view.x !== x || view.y !== y || view.zoom !== zoom;
  // own GPU layer only while moving: Chrome keeps a will-change layer at its first raster scale, which blurs after the stage rescales
  const style = {
    left: edge,
    top: edge,
    width: `${OVERSCAN * 100}%`,
    height: `${OVERSCAN * 100}%`,
    willChange: moving ? "transform" : undefined,
    transform: moving ? `translate(${(view.x - x) * zoom}px, ${(view.y - y) * zoom}px) scale(${zoom / view.zoom})` : undefined,
  };
  return (
    <svg ref={svgRef} className={className} style={style} viewBox={viewBox(view.x, view.y, view.zoom / OVERSCAN)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...handlers}>
      <Detail value={view.zoom >= 1}>
        <Lights>
          <WorldContent season={season} items={items} under={under} />
        </Lights>
        {typeof overlay === "function" ? overlay(view.zoom) : overlay}
      </Detail>
    </svg>
  );
}

export function planeDrawable(p: PlaneT, pose: { x: number; y: number; heading: number; z?: number }, opts: { snow?: number; selected?: boolean } = {}): Drawable {
  return {
    key: `plane-${p.id}`,
    depth: pose.x + pose.y,
    node: <Plane x={pose.x} y={pose.y} z={pose.z} heading={pose.heading} type={p.type} livery={p.livery} snow={opts.snow} selected={opts.selected} />,
  };
}
