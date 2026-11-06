"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { OUT } from "../art";
import { aircraft } from "@/game/data";
import { capture, clamp, svgPoint } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";

const START = 25;
const TRACK = { top: 300, bottom: 860 };
const SLIDERS = { left: 300, right: 1300 };

export function Marshaller({ plane, setHint, onDone, state }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const t = aircraft(plane.type);
  const sim = useRef({ d: START, off: (plane.radarAngle % 2 > 1 ? 1 : -1) * 1.6, v: 0, eL: 0, eR: 0, done: false });
  const [wands, setWands] = useState({ left: 0.3, right: 0.3 });
  const wandsRef = useRef(wands);
  const [view, setView] = useState({ d: START, off: 0, done: false });
  const grabs = useRef(new Map<number, "left" | "right">());

  const moveWand = (side: "left" | "right", value: number) => {
    const v = clamp(value, 0, 1);
    const s = sim.current;
    const delta = Math.abs(v - wandsRef.current[side]);
    if (side === "left") s.eL = Math.min(2.5, s.eL + delta * 2.2);
    else s.eR = Math.min(2.5, s.eR + delta * 2.2);
    wandsRef.current = { ...wandsRef.current, [side]: v };
    setWands(wandsRef.current);
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      if (!s.done) {
        const thrust = (s.eL + s.eR) / 2;
        s.v += (thrust * 3.2 - s.v) * Math.min(1, dt * 2.5);
        s.v = clamp(s.v, 0, 4.2);
        s.d -= s.v * dt;
        s.off += (s.eR - s.eL) * dt * 0.9;
        s.off = clamp(s.off, -3, 3);
        const decay = Math.pow(0.18, dt);
        s.eL *= decay;
        s.eR *= decay;
        if (s.v > 0.2) startLoop("engine", Math.min(1, s.v / 3));
        else stopLoop("engine");
        if (s.d <= 0) {
          s.d = 0;
          s.done = true;
          stopLoop("engine");
          sfx.pneumatic();
          setTimeout(onDone, 700);
        }
      }
      setView({ d: s.d, off: s.off, done: s.done });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopLoop("engine");
    };
  }, [onDone]);

  const s = view;
  const meters = Math.ceil(s.d);
  let advice = "Geradeaus!";
  if (s.off > 0.7) advice = "Nach links!";
  else if (s.off < -0.7) advice = "Nach rechts!";
  else if (s.d < 3) advice = "Gleich Stopp!";

  useEffect(() => {
    if (s.done) return setHint("Stopp! Perfekt!");
    const text =
      advice === "Nach links!" ? "Winke mit dem linken Stab!" : advice === "Nach rechts!" ? "Winke mit dem rechten Stab!" : "Geradeaus einwinken!";
    setHint(`${text} (Noch ${meters} ${meters === 1 ? "Meter" : "Meter"})`);
  }, [meters, advice, s.done, setHint]);

  const k = 12 / (12 + s.d);
  const groundY = 300 + 360 * k;
  const scale = (0.22 + 0.78 * k) * (0.75 + 0.25 * (t.gameSpan / 42));
  const px = 800 + s.off * 120 * k;

  const onDown = (side: "left" | "right") => (e: React.PointerEvent) => {
    capture(e.currentTarget as Element, e.pointerId);
    grabs.current.set(e.pointerId, side);
    sfx.click();
  };
  const onMove = (e: React.PointerEvent) => {
    const side = grabs.current.get(e.pointerId);
    if (!side || !svgRef.current) return;
    const [, y] = svgPoint(svgRef.current, e.clientX, e.clientY);
    moveWand(side, (TRACK.bottom - y) / (TRACK.bottom - TRACK.top));
  };
  const onUp = (e: React.PointerEvent) => grabs.current.delete(e.pointerId);

  const onKey = (side: "left" | "right") => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") moveWand(side, wandsRef.current[side] + 0.25);
    if (e.key === "ArrowDown") moveWand(side, wandsRef.current[side] - 0.25);
  };

  const arm = (side: "left" | "right") => {
    const v = wands[side];
    const sx = side === "left" ? 740 : 860;
    const sy = 800;
    const ang = (side === "left" ? -1 : 1) * (0.4 + v * 1.1);
    const ex = sx + Math.sin(ang) * 110;
    const ey = sy - Math.cos(ang) * 110 + 20;
    const wx = ex + Math.sin(ang * 0.6) * 90;
    const wy = ey - Math.cos(ang * 0.6) * 90;
    return (
      <g key={side}>
        <line x1={ex} y1={ey} x2={wx} y2={wy} stroke="#ffb347" strokeWidth={34} strokeLinecap="round" opacity={0.35} className="glow" />
        <line x1={ex} y1={ey} x2={wx} y2={wy} stroke={OUT} strokeWidth={20} strokeLinecap="round" />
        <line x1={ex} y1={ey} x2={wx} y2={wy} stroke="#ff6a1f" strokeWidth={14} strokeLinecap="round" />
        <line x1={ex + (wx - ex) * 0.3} y1={ey + (wy - ey) * 0.3} x2={wx} y2={wy} stroke="#ffd0a0" strokeWidth={5} strokeLinecap="round" />
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={OUT} strokeWidth={44} strokeLinecap="round" />
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#d4f53a" strokeWidth={36} strokeLinecap="round" />
        <circle cx={ex} cy={ey} r={18} fill="#3b4250" stroke={OUT} strokeWidth={3} />
      </g>
    );
  };

  const slider = (side: "left" | "right") => {
    const x = SLIDERS[side];
    const y = TRACK.bottom - wands[side] * (TRACK.bottom - TRACK.top);
    return (
      <g key={side}>
        <path d={`M${x},${TRACK.top - 50} L${x - 60},${TRACK.top + 20} L${x - 26},${TRACK.top + 20} L${x - 26},${TRACK.bottom - 20} L${x - 60},${TRACK.bottom - 20} L${x},${TRACK.bottom + 50} L${x + 60},${TRACK.bottom - 20} L${x + 26},${TRACK.bottom - 20} L${x + 26},${TRACK.top + 20} L${x + 60},${TRACK.top + 20} Z`} fill="#f39a35" opacity={0.75} stroke="#d1702a" strokeWidth={4} strokeLinejoin="round" />
        <g
          role="slider"
          tabIndex={0}
          aria-label={side === "left" ? "Linker Leuchtstab (Pfeiltasten hoch und runter)" : "Rechter Leuchtstab (Pfeiltasten hoch und runter)"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(wands[side] * 100)}
          onPointerDown={onDown(side)}
          onKeyDown={onKey(side)}
          style={{ cursor: "grab", touchAction: "none" }}
        >
          <circle cx={x} cy={y} r={62} fill="rgba(255,255,255,0.01)" />
          <circle cx={x} cy={y} r={46} fill="#fff" stroke={OUT} strokeWidth={5} />
          <circle cx={x} cy={y} r={36} fill="#ff6a1f" stroke={OUT} strokeWidth={3} />
          <path d={`M${x - 14},${y - 6} l14,-14 l14,14 M${x - 14},${y + 6} l14,14 l14,-14`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    );
  };

  return (
    <div className="scene">
      <svg ref={svgRef} className="fill" viewBox="0 0 1600 1000" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label="Einwinken: Bewege beide Leuchtstäbe auf und ab">
        <defs>
          <linearGradient id="msky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fd0f5" />
            <stop offset="1" stopColor="#d8f0fb" />
          </linearGradient>
        </defs>
        <rect width={1600} height={260} fill="url(#msky)" />
        <rect y={200} width={1600} height={70} fill={state.season === "winter" ? "#eef5fb" : "#8ccf55"} stroke={OUT} strokeWidth={3} />
        <path d="M0,265 L1600,265 L1600,1000 L0,1000 Z" fill={state.season === "winter" ? "#d6d9de" : "#c9c1b5"} />
        <path d="M0,760 L1600,760 L1600,1000 L0,1000 Z" fill="#5c6168" />
        <path d="M790,265 L810,265 L830,1000 L770,1000 Z" fill="#f6c02c" />
        <g transform="translate(800,640)">
          <rect x={-200} y={-14} width={400} height={28} fill="#f6c02c" stroke={OUT} strokeWidth={3} />
          {[...Array(10).keys()].map((i) => <path key={i} d={`M${-190 + i * 40},14 l20,-28 h12 l-20,28 z`} fill={OUT} />)}
          <text y={-34} textAnchor="middle" fontSize={44} fontWeight={800} fill="#f6c02c" stroke={OUT} strokeWidth={2} transform="rotate(180 0 -48)">STOP</text>
        </g>
        {[5, 1].map((m) => {
          const kk = 12 / (12 + m);
          const y = 300 + 360 * kk;
          return (
            <g key={m} transform={`translate(1010,${y - 20})`}>
              <path d="M0,0 h70 v34 h-70 l-18,-17 z" fill="#f6c02c" stroke={OUT} strokeWidth={3} />
              <text x={36} y={25} textAnchor="middle" fontSize={22} fontWeight={800} fill={OUT}>{m}m</text>
            </g>
          );
        })}
        <path d="M1250,250 h120 v80 h-120 z M1370,270 h230 v40 h-230 z" fill="#d9dfe6" stroke={OUT} strokeWidth={3} />
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={1380 + i * 36} y={272} width={34} height={36} fill={["#e8574a", "#f39a35", "#f6c02c", "#4cbb6c", "#3aa3e8", "#9a6ee8"][i]} stroke={OUT} strokeWidth={2} />)}
        {state.season === "winter" && (
          <g fill="#fff" stroke="#c4dcef" strokeWidth={3}>
            <ellipse cx={80} cy={780} rx={140} ry={50} />
            <ellipse cx={1540} cy={820} rx={140} ry={60} />
          </g>
        )}
        <g transform={`translate(${px},${groundY}) scale(${scale})`}>
          <HeadOnPlane livery={plane.livery} engines={t.engines} props={!!t.props} />
        </g>
        <g>
          <path d="M650,1000 C650,880 690,800 800,790 C910,800 950,880 950,1000 Z" fill="#d4f53a" stroke={OUT} strokeWidth={5} />
          <path d="M660,930 L940,930 M672,880 L928,880" stroke="#f2f4f6" strokeWidth={14} />
          <line x1={800} y1={800} x2={800} y2={1000} stroke="#b8d030" strokeWidth={6} />
          {arm("left")}
          {arm("right")}
          <path d="M730,790 C720,740 880,740 870,790 C860,808 740,808 730,790 Z" fill="#8a6a4a" stroke={OUT} strokeWidth={4} />
          <circle cx={800} cy={740} r={56} fill="#6b4a2f" stroke={OUT} strokeWidth={5} />
          <path d="M748,720 C770,690 830,690 852,720" fill="none" stroke="#4a311d" strokeWidth={8} strokeLinecap="round" />
        </g>
        <g transform={`translate(${1130},${250})`}>
          <circle r={70} fill="#bff0f5" stroke={OUT} strokeWidth={5} />
          <text y={-38} textAnchor="middle" fontSize={20} fontWeight={800} fill={OUT}>{advice}</text>
          <circle cy={-6} r={12} fill="#a8704a" stroke={OUT} strokeWidth={2.5} />
          <rect x={-14} y={6} width={28} height={30} rx={6} fill="#f39a35" stroke={OUT} strokeWidth={2.5} />
          <path d={advice === "Nach links!" ? "M-22,10 l-26,-4 m10,-10 l-10,10 l10,10" : advice === "Nach rechts!" ? "M22,10 l26,-4 m-10,-10 l10,10 l-10,10" : "M-22,6 l-10,-30 M22,6 l10,-30 M-38,-14 l6,-10 l8,8 M38,-14 l-6,-10 l-8,8"} stroke={OUT} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {slider("left")}
        {slider("right")}
      </svg>
    </div>
  );
}

function HeadOnPlane({ livery, engines, props }: { livery: string; engines: number; props: boolean }) {
  const eng = engines === 4 ? [-330, -190, 190, 330] : [-210, 210];
  return (
    <g stroke={OUT} strokeWidth={5} strokeLinejoin="round">
      <ellipse cx={0} cy={10} rx={360} ry={30} fill="rgba(30,40,60,0.18)" stroke="none" />
      <path d="M-20,-330 L-8,-470 L8,-470 L20,-330 Z" fill={livery} />
      <path d="M-160,-300 L160,-300 L150,-285 L-150,-285 Z" fill="#dbe9f4" />
      <path d={props ? "M-500,-230 L500,-230 L500,-210 L-500,-210 Z" : "M-500,-190 L-60,-130 L60,-130 L500,-190 L500,-170 L60,-100 L-60,-100 L-500,-170 Z"} fill="#e3eff8" />
      {eng.map((x) =>
        props ? (
          <g key={x}>
            <ellipse cx={x} cy={-210} rx={36} ry={40} fill="#f3f9ff" />
            <circle cx={x} cy={-210} r={95} fill="rgba(255,255,255,0.25)" strokeDasharray="10 12" strokeWidth={3} />
          </g>
        ) : (
          <g key={x}>
            <line x1={x} y1={-150 + Math.abs(x) * 0.05} x2={x} y2={-110 + Math.abs(x) * 0.05} strokeWidth={14} />
            <circle cx={x} cy={-80 + Math.abs(x) * 0.08} r={62} fill={livery} />
            <circle cx={x} cy={-80 + Math.abs(x) * 0.08} r={46} fill="#3a4757" />
            <circle cx={x} cy={-80 + Math.abs(x) * 0.08} r={14} fill="#9aa3ad" />
          </g>
        ),
      )}
      <line x1={0} y1={-80} x2={0} y2={-10} strokeWidth={12} />
      <rect x={-22} y={-30} width={18} height={34} rx={8} fill="#30343c" />
      <rect x={4} y={-30} width={18} height={34} rx={8} fill="#30343c" />
      {[-120, 120].map((x) => (
        <g key={x}>
          <line x1={x} y1={-120} x2={x} y2={-30} strokeWidth={10} />
          <rect x={x - 26} y={-40} width={22} height={44} rx={9} fill="#30343c" />
          <rect x={x + 4} y={-40} width={22} height={44} rx={9} fill="#30343c" />
        </g>
      ))}
      <circle cx={0} cy={-190} r={120} fill="#f3f9ff" />
      <path d="M-118,-170 A120,120 0 0 0 118,-170 Z" fill={livery} opacity={0.85} />
      <path d="M-70,-235 Q0,-260 70,-235 L60,-205 Q0,-222 -60,-205 Z" fill="#2c4a6b" />
      <line x1={0} y1={-252} x2={0} y2={-210} stroke="#f3f9ff" strokeWidth={6} />
      <circle cx={0} cy={-150} r={34} fill="#dbe9f4" />
    </g>
  );
}
