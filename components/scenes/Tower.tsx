"use client";
import { useEffect, useRef, useState } from "react";
import { IsoWorld, parkedPose, planeDrawable, waitingPose } from "../World";
import { destination } from "@/game/data";
import { capture, P, clock, dist, makePath, svgPoint, type Pt } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";
import { PAUSE_MS, ROUND_MS, clockMinutes, type GameState } from "@/game/state";

interface Props {
  state: GameState;
  setHint: (t: string | null) => void;
  onLanded: (id: string) => void;
  now: number;
  paused: boolean;
  onParent: () => void;
}

const RADAR = { x: 400, y: 470, w: 800, h: 500 };
const RUNWAYS = [
  { name: "Bahn 1", a: [640, 680] as Pt, b: [1000, 680] as Pt },
  { name: "Bahn 2", a: [640, 820] as Pt, b: [1000, 820] as Pt },
];
const HOLDS: Pt[] = [[500, 560], [1110, 570], [1110, 900], [500, 900]];
const SPEED = 150;

interface Flight {
  path: ReturnType<typeof makePath>;
  points: Pt[];
  start: number;
}

export function Tower({ state, setHint, onLanded, now: wall, paused, onParent }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [now, setNow] = useState(() => performance.now());
  const [drawing, setDrawing] = useState<{ id: string; points: Pt[] } | null>(null);
  const [flights, setFlights] = useState<Record<string, Flight>>({});
  const [miss, setMiss] = useState<Pt[] | null>(null);
  const landedRef = useRef(new Set<string>());
  const inbound = state.planes.filter((p) => p.stage === "anflug");

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = performance.now();
      setNow(t);
      for (const [id, f] of Object.entries(flights)) {
        if (((t - f.start) / 1000) * SPEED < f.path.length || landedRef.current.has(id)) continue;
        landedRef.current.add(id);
        stopLoop("engine");
        onLanded(id);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flights, onLanded]);

  useEffect(() => () => stopLoop("engine"), []);

  useEffect(() => {
    if (Object.keys(flights).length) return;
    setHint(inbound.length ? "Zieh eine Linie vom Flugzeug zum grünen Pfeil!" : paused ? null : "Gerade ist kein Flugzeug im Anflug. Bald kommt eins!");
  }, [inbound.length, flights, paused, setHint]);

  const holdPos = (id: string, radarAngle: number, index: number) => {
    const c = HOLDS[index % HOLDS.length];
    const a = radarAngle + (now / 1000) * 0.45;
    return { pos: [c[0] + Math.cos(a) * 34, c[1] + Math.sin(a) * 34] as Pt, heading: a + Math.PI / 2, id };
  };

  const planes = inbound.map((p, i) => {
    const f = flights[p.id];
    if (f) {
      const s = ((now - f.start) / 1000) * SPEED;
      const q = f.path.at(s);
      const k = Math.max(0, (s - (f.path.length - 360)) / 360);
      return { plane: p, pos: [q.x, q.y] as Pt, heading: q.angle, scale: 1 - k * 0.3, flying: true };
    }
    const h = holdPos(p.id, p.radarAngle, i);
    return { plane: p, pos: h.pos, heading: h.heading, scale: 1, flying: false };
  });

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = svgPoint(svgRef.current!, e.clientX, e.clientY);
    const hit = planes.find((p) => !p.flying && dist(p.pos, pt) < 60);
    if (!hit) return;
    capture(e.target as Element, e.pointerId);
    sfx.click();
    setMiss(null);
    setDrawing({ id: hit.plane.id, points: [hit.pos, pt] });
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const pt = svgPoint(svgRef.current!, e.clientX, e.clientY);
    const last = drawing.points[drawing.points.length - 1];
    if (dist(last, pt) > 8) setDrawing({ ...drawing, points: [...drawing.points, pt] });
  };
  const up = () => {
    if (!drawing) return;
    const end = drawing.points[drawing.points.length - 1];
    const rw = RUNWAYS.find((r) => dist(r.a, end) < 70);
    if (rw && drawing.points.length > 2) {
      const p = inbound.find((x) => x.id === drawing.id);
      const points: Pt[] = [...drawing.points.slice(0, -1), rw.a, rw.b];
      setFlights((f) => ({ ...f, [drawing.id]: { path: makePath(points), points, start: clock() } }));
      sfx.pop();
      startLoop("engine", 0.7);
      setHint(p ? `Flug ${p.flightNo} landet auf ${rw.name}!` : null);
    } else {
      sfx.oops();
      setMiss(drawing.points);
      setHint("Fast! Zieh die Linie bis ganz zum grünen Pfeil.");
      setTimeout(() => setMiss(null), 1200);
    }
    setDrawing(null);
  };

  const background = state.planes
    .filter((p) => p.stage === "abfertigung" || p.stage === "einwinken")
    .map((p) => planeDrawable(p, p.stage === "einwinken" ? waitingPose(p) : parkedPose(p), { snow: state.season === "winter" && !p.done.includes("enteisung") && p.stage === "abfertigung" ? 1 : 0 }));
  const c = P(60, 90);
  const first = planes.find((p) => !p.flying);

  return (
    <div className="scene">
      <IsoWorld className="fill" season={state.season} camera={{ x: c[0], y: c[1] - 60, zoom: 0.62 }} planes={state.planes} drawables={background} label="Blick aus dem Tower auf das Vorfeld" />
      <svg ref={svgRef} className="fill" viewBox="0 0 1600 1000" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="application" aria-label="Radar: Zieh eine Linie vom Flugzeug zur Landebahn">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0f5" />
            <stop offset="1" stopColor="#d8f0fb" />
          </linearGradient>
          <radialGradient id="radarbg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0" stopColor="#2a7a4e" />
            <stop offset="1" stopColor="#123d27" />
          </radialGradient>
          <clipPath id="radarclip">
            <rect x={RADAR.x} y={RADAR.y} width={RADAR.w} height={RADAR.h} rx={24} />
          </clipPath>
        </defs>
        <path d="M0,0 H1600 V150 Q1400,175 1200,160 T800,165 T400,158 T0,168 Z" fill="url(#sky)" />
        <path d="M0,168 Q60,140 120,165 Q180,135 250,162 Q330,140 400,158 Q480,138 560,163 Q640,142 720,162 Q800,140 880,164 Q980,138 1060,160 Q1150,140 1220,160 Q1300,136 1400,160 Q1500,140 1600,158 V180 H0 Z" fill="#4f9d3a" stroke="#26303f" strokeWidth={3} />
        <g fill="#fff" stroke="#26303f" strokeWidth={3}>
          <path d="M210,70 a22,22 0 0 1 40,-10 a26,26 0 0 1 48,8 a18,18 0 0 1 4,34 h-90 a16,16 0 0 1 -2,-32 z" />
          <path d="M1050,50 a20,20 0 0 1 36,-8 a24,24 0 0 1 44,6 a16,16 0 0 1 4,30 h-82 a14,14 0 0 1 -2,-28 z" />
        </g>
        <g fill="#37475a" stroke="#26303f" strokeWidth={4}>
          <rect x={0} y={0} width={1600} height={22} />
          <path d="M300,22 L330,22 L350,1000 L310,1000 Z" />
          <path d="M790,22 L812,22 L812,470 L790,470 Z" />
          <path d="M1270,22 L1300,22 L1290,1000 L1250,1000 Z" />
        </g>
        <path d="M0,860 Q800,800 1600,860 V1000 H0 Z" fill="#4a5a6e" stroke="#26303f" strokeWidth={4} />
        <path d="M0,880 Q800,822 1600,880" fill="none" stroke="#6c7f96" strokeWidth={6} />
        <g stroke="#26303f" strokeWidth={3}>
          <rect x={150} y={880} width={150} height={70} rx={10} fill="#d9dfe6" />
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={178 + i * 32} cy={905} r={9} fill={["#e8574a", "#f6c02c", "#4cbb6c", "#3aa3e8"][i]} />)}
          <rect x={170} y={925} width={110} height={14} rx={4} fill="#9aa3ad" />
          <circle cx={1330} cy={920} r={26} fill="#37475a" />
          <circle cx={1385} cy={920} r={26} fill="#37475a" />
          <circle cx={1330} cy={920} r={14} fill="#5ab0d8" />
          <circle cx={1385} cy={920} r={14} fill="#5ab0d8" />
          <rect x={1340} y={905} width={35} height={18} fill="#37475a" />
          <rect x={1250} y={872} width={60} height={80} rx={4} fill="#fff" transform="rotate(-8 1280 912)" />
        </g>
        <rect x={RADAR.x - 18} y={RADAR.y - 18} width={RADAR.w + 36} height={RADAR.h + 36} rx={34} fill="#37475a" stroke="#26303f" strokeWidth={5} />
        <rect x={RADAR.x} y={RADAR.y} width={RADAR.w} height={RADAR.h} rx={24} fill="url(#radarbg)" stroke="#26303f" strokeWidth={4} />
        <g clipPath="url(#radarclip)">
          {[90, 180, 270, 360].map((r) => <circle key={r} cx={800} cy={720} r={r} fill="none" stroke="#3f9a63" strokeWidth={2} />)}
          <line x1={RADAR.x} y1={720} x2={RADAR.x + RADAR.w} y2={720} stroke="#3f9a63" strokeWidth={1.5} />
          <line x1={800} y1={RADAR.y} x2={800} y2={RADAR.y + RADAR.h} stroke="#3f9a63" strokeWidth={1.5} />
          <g className="radar-sweep" style={{ transformOrigin: "800px 720px" }}>
            <path d="M800,720 L800,320 A400,400 0 0 1 1083,437 Z" fill="rgba(125,224,143,0.18)" />
          </g>
          {RUNWAYS.map((r) => (
            <g key={r.name}>
              <rect x={r.a[0]} y={r.a[1] - 18} width={r.b[0] - r.a[0]} height={36} rx={6} fill="#c9d3dc" stroke="#26303f" strokeWidth={3} />
              <line x1={r.a[0] + 20} y1={r.a[1]} x2={r.b[0] - 10} y2={r.a[1]} stroke="#fff" strokeWidth={3} strokeDasharray="16 12" />
              <text x={(r.a[0] + r.b[0]) / 2} y={r.a[1] + 44} textAnchor="middle" fill="#bff5c9" fontSize={22} fontWeight={700}>{r.name}</text>
              <g className="pulse-svg" style={{ transformOrigin: `${r.a[0] - 34}px ${r.a[1]}px` }}>
                <circle cx={r.a[0] - 34} cy={r.a[1]} r={26} fill="#4cbb6c" stroke="#fff" strokeWidth={4} />
                <path d={`M${r.a[0] - 46},${r.a[1] - 10} L${r.a[0] - 30},${r.a[1]} L${r.a[0] - 46},${r.a[1] + 10} M${r.a[0] - 34},${r.a[1] - 10} L${r.a[0] - 18},${r.a[1]} L${r.a[0] - 34},${r.a[1] + 10}`} stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          ))}
          {Object.entries(flights).map(([id, f]) => (
            <polyline key={id} points={f.points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#f6c02c" strokeWidth={5} strokeDasharray="12 10" strokeLinecap="round" opacity={0.8} />
          ))}
          {drawing && <polyline points={drawing.points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#f6c02c" strokeWidth={6} strokeDasharray="14 10" strokeLinecap="round" strokeLinejoin="round" />}
          {miss && <polyline points={miss.map((p) => p.join(",")).join(" ")} fill="none" stroke="#ff8a80" strokeWidth={6} strokeDasharray="14 10" strokeLinecap="round" className="fade-out" />}
          {planes.map(({ plane, pos, heading, scale, flying }) => {
            const d = destination(plane.dest);
            return (
              <g key={plane.id}>
                <g transform={`translate(${pos[0]},${pos[1]}) rotate(${(heading * 180) / Math.PI}) scale(${1.7 * scale})`}>
                  <circle r={22} fill="rgba(255,255,255,0.12)" />
                  <path d="M14,0 L4,-2 L-2,-14 L-6,-14 L-3,-2 L-10,-2 L-13,-6 L-15,-6 L-14,0 L-15,6 L-13,6 L-10,2 L-3,2 L-6,14 L-2,14 L4,2 Z" fill="#fff" stroke="#26303f" strokeWidth={1.5} strokeLinejoin="round" />
                </g>
                {!flying && (
                  <g transform={`translate(${pos[0] + (pos[0] > 800 ? -250 : 40)},${pos[1] + (pos[1] > 800 ? 10 : -70)})`}>
                    <rect width={210} height={50} rx={10} fill="#fbf0cf" stroke="#26303f" strokeWidth={3} />
                    <text x={12} y={21} fontSize={18} fontWeight={700} fill="#26303f">Flug {plane.flightNo}</text>
                    <text x={12} y={42} fontSize={16} fill="#26303f">aus {d.city}</text>
                  </g>
                )}
              </g>
            );
          })}
          {first && !drawing && Object.keys(flights).length === 0 && (
            <g className="hand-hint" style={{ ["--hx" as string]: `${RUNWAYS[0].a[0] - first.pos[0]}px`, ["--hy" as string]: `${RUNWAYS[0].a[1] - first.pos[1]}px` }} transform={`translate(${first.pos[0]},${first.pos[1]})`}>
              <Hand />
            </g>
          )}
        </g>
        {inbound.length === 0 && Object.keys(flights).length === 0 && (
          <text x={800} y={paused ? 772 : 740} textAnchor="middle" fill="#bff5c9" fontSize={30} fontWeight={700}>
            {paused ? "Mittagspause! Der Himmel ist frei." : "Der Himmel ist frei. Bald kommt ein Flugzeug!"}
          </text>
        )}
      </svg>
      <TowerClock played={state.round.played} paused={paused} />
      {paused && <PauseSun progress={(wall - state.round.lastPlay) / PAUSE_MS} onHold={onParent} />}
    </div>
  );
}

export function Hand() {
  return (
    <g pointerEvents="none">
      <path
        d="M0,0 C-3,-6 6,-9 8,-3 L14,14 C16,8 25,10 24,17 C27,13 35,16 33,23 C37,21 43,25 41,32 L40,46 C39,58 30,64 20,64 L10,64 C2,64 -4,58 -8,50 L-20,28 C-23,22 -15,16 -10,22 L-3,30 Z"
        fill="#ffd9b8"
        stroke="#26303f"
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </g>
  );
}

const dial = (deg: number, r: number): [number, number] => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];

function TowerClock({ played, paused }: { played: number; paused: boolean }) {
  const total = clockMinutes(played);
  const [h, m] = [Math.floor(total / 60), total % 60];
  const left = Math.max(0, Math.ceil((ROUND_MS - played) / 60_000));
  const minuteAngle = m * 6;
  const hourAngle = ((h % 12) + m / 60) * 30;
  const time = `${h}:${String(m).padStart(2, "0")}`;
  const label = `Flughafenuhr, ${time} Uhr${paused ? ", Mittagspause" : left > 0 ? `, noch ${left} ${left === 1 ? "Minute" : "Minuten"} bis Mittag` : ""}`;
  return (
    <div className="tower-clock" role="img" aria-label={label}>
      <svg viewBox="-100 -100 200 200" width={118} height={118} aria-hidden="true">
        {h < 12 && <path d={`M0,0 L${dial(minuteAngle, 92)} A92,92 0 0 1 0,-92 Z`} fill="#ffb347" opacity={0.75} />}
        {[...Array(12).keys()].map((i) => (
          <path key={i} d={`M${dial(i * 30, i % 3 ? 82 : 74)} L${dial(i * 30, 92)}`} stroke="#26303f" strokeWidth={i % 3 ? 4 : 8} strokeLinecap="round" />
        ))}
        <path d={`M0,0 L${dial(hourAngle, 46)}`} stroke="#26303f" strokeWidth={14} strokeLinecap="round" />
        <path d={`M0,0 L${dial(minuteAngle, 72)}`} stroke="#26303f" strokeWidth={8} strokeLinecap="round" />
        <circle r={10} fill="#e8574a" stroke="#26303f" strokeWidth={3} />
      </svg>
    </div>
  );
}

const HOLD_MS = 3000;

function PauseSun({ progress, onHold }: { progress: number; onHold: () => void }) {
  const [calm] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onHold, HOLD_MS);
  };
  const stop = () => window.clearTimeout(timer.current);
  useEffect(() => stop, []);
  const minutes = PAUSE_MS / 60_000;
  const done = Math.min(1, Math.max(0, calm ? Math.floor(progress * minutes) / minutes : progress));
  const ring = 2 * Math.PI * 66;
  return (
    <button
      type="button"
      className="pause-sun"
      aria-label="Pause, für Eltern: gedrückt halten zum Überspringen"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== " " && e.key !== "Enter") return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={stop}
      onBlur={stop}
    >
      <svg viewBox="-80 -80 160 160" width={160} height={160} aria-hidden="true">
        <circle r={66} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={10} />
        <circle r={66} fill="none" stroke="#ffd23a" strokeWidth={10} strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - done)} transform="rotate(-90)" />
        <g stroke="#ffd23a" strokeWidth={5} strokeLinecap="round">
          {[...Array(8).keys()].map((i) => (
            <line key={i} x1={0} y1={-46} x2={0} y2={-54} transform={`rotate(${i * 45})`} />
          ))}
        </g>
        <circle r={38} fill="#ffd23a" stroke="#26303f" strokeWidth={3} />
        <g fill="none" stroke="#26303f" strokeWidth={3} strokeLinecap="round">
          <path d="M-20,-4 q7,7 14,0 M6,-4 q7,7 14,0" />
          <path d="M-7,14 q7,4 14,0" />
        </g>
        <g fill="#fff" stroke="#26303f" strokeWidth={1.5} fontWeight={700}>
          <text x={36} y={-40} fontSize={16}>z</text>
          <text x={48} y={-52} fontSize={20}>z</text>
          <text x={60} y={-64} fontSize={24}>Z</text>
        </g>
      </svg>
    </button>
  );
}
