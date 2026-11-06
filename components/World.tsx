import type { ReactNode } from "react";
import { BaggageCart, Box, Cone, Cylinder, FaceText, OUT, Person, Plane, Tug, type Drawable } from "./art";
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
      <polygon points={poly([[0, -50], [62, -50], [62, 230], [0, 230]])} fill="url(#slabs)" />
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
          </g>
        );
      })}
      {winter && <SnowPiles />}
    </g>
  );
}


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
      <pattern id="slabs" width="64" height="37" patternUnits="userSpaceOnUse">
        <path d="M0,0 L64,37 M64,0 L0,37" stroke="rgba(0,0,0,0.05)" strokeWidth="1.5" />
      </pattern>
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
              <polygon points={pts([f.at(0.01, 2), f.at(0.99, 2), f.at(0.99, 9.5), f.at(0.01, 9.5)])} fill="#7cc4ec" stroke={OUT} strokeWidth={2} />
              {[...Array(48).keys()].map((i) => {
                const s = 0.01 + (i * 0.98) / 48;
                const a = f.at(s, 2);
                const b = f.at(s, 9.5);
                return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#4e8db8" strokeWidth={1.6} />;
              })}
              <polyline points={pts([f.at(0.01, 6), f.at(0.99, 6)])} stroke="#4e8db8" strokeWidth={1.6} fill="none" />
              <polyline points={pts([f.at(0.01, 9.2), f.at(0.99, 9.2)])} stroke="#bfe5fa" strokeWidth={2} fill="none" />
            </g>
          ) : null
        }
      </Box>
      {[0, 1, 2].map((g) => {
        const y = gateY(g);
        const a = P(0.2, y + 6, 10.4);
        return (
          <g key={g}>
            <polygon points={pts([P(0.2, y + 12, 9), P(0.2, y, 9), P(0.2, y, 12.2), P(0.2, y + 12, 12.2)])} fill="#f6c02c" stroke={OUT} strokeWidth={2.4} strokeLinejoin="round" />
            <FaceText at={[a[0], a[1] + 7]} heading={Math.PI / 2} size={20}>{`Gate ${g + 1}`}</FaceText>
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
      <Cylinder x={x} y={y} z0={31.5} z1={32.6} r={5.6} color={winter ? "#ffffff" : "#e9edf2"} />
      {(() => {
        const a = P(x, y, 32.6);
        const b = P(x, y, 37);
        return (
          <g>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={OUT} strokeWidth={3} />
            <circle cx={b[0]} cy={b[1]} r={4} fill="#e8574a" stroke={OUT} strokeWidth={1.5} className="blink" />
          </g>
        );
      })()}
    </g>
  );
}

function Bridge({ gate, docked, plane }: { gate: number; docked: boolean; plane?: string }) {
  const y = gateY(gate);
  const r = plane ? aircraft(plane).radius : 2;
  const L = plane ? aircraft(plane).gameLength : 30;
  const yb = y - r - 1.9;
  const start: [number, number] = [0, yb];
  const end: [number, number] = docked ? [8.6 + L * 0.12, yb] : [6, yb];
  const n = 6;
  const dx = (end[0] - start[0]) / n;
  const dy = (end[1] - start[1]) / n;
  const heading = Math.atan2(dy, dx);
  const segLen = Math.hypot(dx, dy) * 1.02;
  const z = docked ? r - 0.2 : 2.5;
  const pillar = [start[0] + dx * 4.5, start[1] + dy * 4.5];
  return (
    <g>
      <Box x={pillar[0]} y={pillar[1]} l={1} w={1} h={z} color="#9aa3ad" />
      {[...Array(n).keys()].map((i) => (
        <Box key={i} x={start[0] + dx * (i + 0.5)} y={start[1] + dy * (i + 0.5)} heading={heading} l={segLen} w={2.6} h={3} z={z} color={RAINBOW[i % RAINBOW.length]} top={shade(RAINBOW[i % RAINBOW.length], 1.25)} />
      ))}
    </g>
  );
}

export function propsForGate(gate: number, season: Season): Drawable[] {
  const y = gateY(gate);
  const at = (x: number, yy: number, z = 0): Pt => P(x, yy, z);
  const list: Drawable[] = [
    { key: `cart${gate}a`, depth: 4 + y + 33, node: <BaggageCart x={4} y={y + 33} heading={Math.PI / 2} bags={4} seed={gate} /> },
    { key: `cart${gate}b`, depth: 8 + y + 33, node: <BaggageCart x={8} y={y + 33} heading={Math.PI / 2} bags={3} seed={gate + 2} /> },
    { key: `tug${gate}`, depth: 6 + y - 33, node: <Tug x={6} y={y - 33} heading={Math.PI / 2} /> },
    { key: `cone${gate}`, depth: 52 + y + 24, node: <Cone at={at(52, y + 24)} /> },
    { key: `p${gate}a`, depth: 14 + y + 30, node: <Person at={at(14, y + 30)} seed={gate} /> },
    { key: `p${gate}b`, depth: 3 + y - 24, node: <Person at={at(3, y - 24)} seed={gate + 3} wave /> },
  ];
  if (season === "winter") list.push({ key: `cone2${gate}`, depth: 54 + y - 24, node: <Cone at={at(54, y - 24)} /> });
  return list;
}

export interface IsoWorldProps {
  season: Season;
  camera: { x: number; y: number; zoom: number };
  planes: PlaneT[];
  drawables?: Drawable[];
  overlay?: ReactNode;
  under?: ReactNode;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
  onPointerDown?: React.PointerEventHandler<SVGSVGElement>;
  onPointerMove?: React.PointerEventHandler<SVGSVGElement>;
  onPointerUp?: React.PointerEventHandler<SVGSVGElement>;
  onPointerCancel?: React.PointerEventHandler<SVGSVGElement>;
  showProps?: boolean;
  docked?: (p: PlaneT) => boolean;
  label?: string;
}

/** shared 2.5D airport. Parked/waiting planes come from state, extra things via drawables */
export function IsoWorld({ season, camera, planes, drawables = [], overlay, under, className, svgRef, showProps = true, docked, label, ...handlers }: IsoWorldProps) {
  const items: Drawable[] = [...drawables];
  for (let g = 0; g < 3; g++) {
    const plane = planes.find((p) => p.gate === g && p.stage === "abfertigung");
    items.push({ key: `bridge${g}`, depth: 6 + gateY(g) - 14, node: <Bridge gate={g} docked={!!plane && (docked?.(plane) ?? true)} plane={plane?.type} /> });
    if (showProps) items.push(...propsForGate(g, season));
  }
  items.push({ key: "tower", depth: -40, node: <Tower season={season} /> });
  items.sort((a, b) => a.depth - b.depth);
  return (
    <svg ref={svgRef} className={className} viewBox={viewBox(camera.x, camera.y, camera.zoom)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...handlers}>
      <Patterns />
      <Ground season={season} />
      {under}
      <Terminal season={season} />
      {items.map((d) => (
        <g key={d.key}>{d.node}</g>
      ))}
      {overlay}
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
