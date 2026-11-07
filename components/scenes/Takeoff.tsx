"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { Front, LIGHT, Lamp, Lights, OUT, SIDE_MAIN_GEAR_X, SidePlane, Sock, useLit, useWind } from "../art";
import { Hand } from "./Tower";
import { HOME, aircraft, destination } from "@/game/data";
import { capture, clamp, svgPoint } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";

type Phase = "schub" | "abheben" | "fahrwerk" | "wolken" | "fertig";

const LIFT = 0.85;
const KMH = 300;
const GROUND = 760;
const PLANE_X = 640;
const PLANE_W = 560;
const SCALE = PLANE_W / 120;
const STARS = [[90, 80, 3], [260, 160, 2], [420, 60, 2.5], [610, 120, 2], [820, 50, 3], [990, 140, 2], [1330, 70, 2.5], [1490, 150, 2], [1560, 40, 3]];
const THROTTLE = { x0: 210, x1: 540, y: 915 };
const STICK = { x: 1320, top: 520, bottom: 860 };
const CLOUDS = [
  [200, 160, 1.1],
  [620, 90, 0.8],
  [1050, 210, 1.3],
  [1500, 130, 0.9],
  [1850, 260, 1.2],
  [400, 380, 0.7],
  [1300, 420, 1],
] as const;

const START = { v: 0, throttle: 0, pull: 0, pitch: 0, alt: 0, scroll: 0, gear: 1, retracting: false, phase: "schub" as Phase, fly: 0, tooSlow: false };

export function Takeoff({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const type = aircraft(plane.type);
  const dest = destination(plane.dest);
  const sim = useRef({ ...START });
  const [view, setView] = useState(START);
  const grabs = useRef(new Map<number, "throttle" | "stick">());

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      const airborne = s.alt > 0;
      if (!airborne) s.v = clamp(s.v + (s.throttle * 0.32 - 0.08 * (1 - s.throttle)) * dt, 0, 1);
      else s.v = Math.max(s.v, 0.9);
      if (s.phase === "schub" && s.v >= LIFT) s.phase = "abheben";
      s.scroll += s.v * 1100 * dt;

      const canLift = s.v >= LIFT || airborne;
      s.tooSlow = s.pull > 0.5 && !canLift;
      const target = airborne ? 11 : s.pull > 0.5 ? (canLift ? 12 : 3) : 0;
      s.pitch += (target - s.pitch) * Math.min(1, dt * 4);
      if (airborne || (canLift && s.pitch > 8)) {
        const cap = s.phase === "wolken" || s.phase === "fertig" ? Infinity : 260;
        s.alt = Math.min(cap, s.alt + 160 * dt);
      }
      if (s.phase === "abheben" && s.alt > 110) {
        s.phase = "fahrwerk";
        s.retracting = true;
        sfx.pneumatic();
      }
      if (s.retracting) s.gear = Math.max(0, s.gear - dt / 1.2);
      if (s.phase === "fahrwerk" && s.gear === 0) s.phase = "wolken";
      if (s.phase === "wolken") {
        s.fly += dt;
        if (s.fly > 2.6) {
          s.phase = "fertig";
          stopLoop("engine");
          onDone();
        }
      }
      if (s.phase !== "fertig") {
        if (s.throttle > 0.02 || airborne) startLoop("engine", 0.3 + 0.7 * Math.max(s.throttle, airborne ? 1 : 0));
        else stopLoop("engine");
      }
      setView({ ...s });
      if (s.phase !== "fertig") raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stopLoop("engine");
    };
  }, [onDone]);

  const kmh = Math.round((view.v * KMH) / 10) * 10;
  const ready = view.phase === "abheben" && view.v >= LIFT;
  useEffect(() => {
    if (view.phase === "schub" || (view.phase === "abheben" && !ready)) {
      if (view.tooSlow) setHint("Noch nicht schnell genug! Erst bis zur grünen Fahne.");
      else setHint(view.v < 0.03 ? "Schieb den Schubhebel nach vorne!" : `Tempo ${kmh} km/h – schneller!`);
    } else if (view.phase === "abheben") setHint("Jetzt abheben! Zieh den Knüppel nach oben!");
    else if (view.phase === "fahrwerk") setHint("Wir fliegen! Das Fahrwerk fährt ein.");
    else setHint(`Guten Flug nach ${dest.city}!`);
  }, [view.phase, ready, view.tooSlow, view.v < 0.03, kmh, dest.city, setHint]); // eslint-disable-line react-hooks/exhaustive-deps

  const setThrottle = (value: number) => {
    sim.current.throttle = clamp(value, 0, 1);
  };
  const setPull = (value: number) => {
    sim.current.pull = clamp(value, 0, 1);
  };
  const onMove = (e: React.PointerEvent) => {
    const which = grabs.current.get(e.pointerId);
    if (!which || !svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, e.clientX, e.clientY);
    if (which === "throttle") setThrottle((x - THROTTLE.x0) / (THROTTLE.x1 - THROTTLE.x0));
    else setPull((STICK.bottom - y) / (STICK.bottom - STICK.top));
  };
  const onUp = (e: React.PointerEvent) => {
    if (grabs.current.get(e.pointerId) === "stick") setPull(0);
    grabs.current.delete(e.pointerId);
  };
  const grab = (e: React.PointerEvent, which: "throttle" | "stick") => {
    capture(e.currentTarget as Element, e.pointerId);
    grabs.current.set(e.pointerId, which);
    sfx.click();
    onMove(e);
  };

  const winter = state.season === "winter";
  const lit = useLit();
  const onGround = view.alt <= 0;
  const flyX = view.fly * 420;
  const flyY = view.fly * 260;
  const flyScale = 1 - Math.min(0.45, view.fly * 0.18);
  const knobX = THROTTLE.x0 + view.throttle * (THROTTLE.x1 - THROTTLE.x0);
  const stickY = STICK.bottom - view.pull * (STICK.bottom - STICK.top);

  return (
    <div className="scene">
      <svg ref={svgRef} className="fill" viewBox="0 0 1600 1000" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label={`Start von Flug ${plane.flightNo} nach ${dest.city}`}>
        <defs>
          <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={winter ? "#a9cfe6" : "#6cc3f2"} />
            <stop offset="1" stopColor={winter ? "#e6f1f8" : "#d4effc"} />
          </linearGradient>
        </defs>
        <Lights>
        <rect width={1600} height={1000} fill="url(#tsky)" />
        {!lit && <circle cx={1180} cy={190 + view.alt * 0.2} r={60} fill="#ffe27a" stroke={OUT} strokeWidth={4} />}
        <Lamp back>
          <g fill="#fff8d8">
            {STARS.map(([x, y, r]) => <circle key={x} cx={x} cy={y + view.alt * 0.1} r={r} />)}
          </g>
          <path d={`M1180,${140 + view.alt * 0.2} A50,50 0 1 0 1180,${240 + view.alt * 0.2} A34,50 0 1 1 1180,${140 + view.alt * 0.2} Z`} fill="#fff4c2" />
        </Lamp>

        <Front>
        {CLOUDS.map(([x, y, s], i) => {
          const cx = ((((x - view.scroll * 0.12 * s) % 2000) + 2000) % 2000) - 200;
          return (
            <g key={i} transform={`translate(${cx},${y + view.alt * 0.6 * s}) scale(${s})`}>
              <path d="M-80,20 a34,34 0 0 1 30,-44 a46,46 0 0 1 84,-6 a32,32 0 0 1 50,30 a24,24 0 0 1 -6,40 h-150 a20,20 0 0 1 -8,-20 z" fill="#fff" stroke={OUT} strokeWidth={4 / s} />
            </g>
          );
        })}
        </Front>

        <g transform={`translate(0,${view.alt * 0.7})`}>
          {[0, 1, 2].map((i) => {
            const x = ((((i * 800 - view.scroll * 0.2) % 2400) + 2400) % 2400) - 400;
            return <path key={i} d={`M${x},660 q200,-120 400,-30 q200,-90 400,30 v80 h-800 z`} fill={winter ? "#dfeaf2" : "#5fae46"} stroke={OUT} strokeWidth={4} />;
          })}
        </g>

        <g transform={`translate(0,${view.alt})`}>
          <g transform={`translate(${1250 - view.scroll * 0.6},0)`}>
            <rect x={0} y={560} width={380} height={130} rx={6} fill="#d9dfe6" stroke={OUT} strokeWidth={4} />
            <rect x={20} y={585} width={340} height={45} rx={4} fill="#7cc4ec" stroke={OUT} strokeWidth={3} />
            {airportName}
            <rect x={420} y={420} width={36} height={270} fill="#fff" stroke={OUT} strokeWidth={4} />
            <path d="M392,380 H484 L470,430 H406 Z" fill="#5c86ad" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <rect x={398} y={365} width={80} height={16} rx={4} fill="#fff" stroke={OUT} strokeWidth={4} />
            {winter && <path d="M0,560 q190,-30 380,0 Z" fill="#fff" stroke="#c4dcef" strokeWidth={3} />}
          </g>
          <rect x={0} y={680} width={1600} height={500} fill={winter ? "#eef5fb" : "#8ccf55"} />
          <Windsock x={((((1500 - view.scroll) % 2400) + 2400) % 2400) - 400} />
          <rect x={0} y={720} width={1600} height={100} fill="#5c6168" stroke={OUT} strokeWidth={4} />
          <line x1={0} y1={732} x2={1600} y2={732} stroke="#fff" strokeWidth={4} />
          <line x1={0} y1={808} x2={1600} y2={808} stroke="#fff" strokeWidth={4} />
          <line x1={0} y1={770} x2={1600} y2={770} stroke="#fff" strokeWidth={8} strokeDasharray="70 60" strokeDashoffset={view.scroll} />
          {[...Array(10).keys()].map((i) => {
            const x = ((((i * 200 - view.scroll) % 2000) + 2000) % 2000) - 200;
            return <circle key={i} cx={x} cy={726} r={6} fill="#ffd23a" stroke={OUT} strokeWidth={2} />;
          })}
          {[726, 814].map((y) => (
            <Lamp key={y} back={y === 726}>
              <g transform={`translate(0,${view.alt})`}>
                {[...Array(10).keys()].map((i) => {
                  const x = ((((i * 200 - view.scroll) % 2000) + 2000) % 2000) - 200;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r={18} fill={LIGHT.white} opacity={0.3} />
                      <circle cx={x} cy={y} r={6} fill={LIGHT.white} />
                    </g>
                  );
                })}
              </g>
            </Lamp>
          ))}
          <Lamp back>
            <g transform={`translate(${1250 - view.scroll * 0.6},${view.alt})`}>{airportName}</g>
          </Lamp>
          <ellipse cx={PLANE_X + 20} cy={790} rx={PLANE_W * 0.42 * Math.max(0.3, 1 - view.alt / 300)} ry={14} fill="rgba(30,40,60,0.2)" />
        </g>

        {view.v > 0.45 && onGround && (
          <g stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.8}>
            {[0, 1, 2].map((i) => {
              const x = PLANE_X - SIDE_MAIN_GEAR_X * SCALE - 60 - ((view.scroll * 0.8 + i * 70) % 200);
              return <line key={i} x1={x} y1={600 + i * 40} x2={x - 90} y2={600 + i * 40} />;
            })}
          </g>
        )}

        <Front>
          <g transform={`translate(${PLANE_X + flyX},${GROUND - flyY}) scale(${flyScale}) rotate(${-view.pitch})`}>
            <g transform={`translate(${-SIDE_MAIN_GEAR_X * SCALE},${-49 * SCALE})`}>
              <SidePlane type={type} color={plane.livery} width={PLANE_W} gear={view.gear} />
            </g>
          </g>
        </Front>
        <Lamp>
          <g transform={`translate(${PLANE_X + flyX},${GROUND - flyY}) scale(${flyScale}) rotate(${-view.pitch})`}>
            <g transform={`translate(${-SIDE_MAIN_GEAR_X * SCALE},${-49 * SCALE}) scale(${SCALE})`}>
              <SideLights longHaul={type.longHaul} />
            </g>
          </g>
        </Lamp>
        </Lights>

        {view.phase !== "fertig" && view.phase !== "wolken" && (
          <g transform="translate(560,150)">
            <rect x={0} y={0} width={480} height={70} rx={18} fill="#fbf0cf" stroke={OUT} strokeWidth={4} />
            <text x={22} y={45} fontSize={26} fontWeight={700} fill={OUT}>Tempo</text>
            <rect x={120} y={22} width={240} height={26} rx={13} fill="#fff" stroke={OUT} strokeWidth={3} />
            <rect x={120 + LIFT * 240} y={22} width={(1 - LIFT) * 240} height={26} fill="#bff0c9" />
            <rect x={120} y={22} width={Math.max(26, view.v * 240)} height={26} rx={13} fill={view.v >= LIFT ? "#4cbb6c" : "#3aa3e8"} stroke={OUT} strokeWidth={3} />
            <g transform={`translate(${120 + LIFT * 240},20)`}>
              <line x1={0} y1={0} x2={0} y2={-26} stroke={OUT} strokeWidth={3} />
              <path d="M0,-26 h22 l-6,7 l6,7 h-22 z" fill="#4cbb6c" stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
            </g>
            <text x={462} y={45} fontSize={24} fontWeight={700} fill={OUT} textAnchor="end">{kmh} km/h</text>
          </g>
        )}

        {onGround && (
          <g>
            <rect x={THROTTLE.x0 - 70} y={THROTTLE.y - 75} width={THROTTLE.x1 - THROTTLE.x0 + 140} height={135} rx={22} fill="#fbf0cf" stroke={OUT} strokeWidth={4} />
            <text x={(THROTTLE.x0 + THROTTLE.x1) / 2} y={THROTTLE.y - 38} textAnchor="middle" fontSize={24} fontWeight={700} fill={OUT}>Schubhebel</text>
            <text x={THROTTLE.x0 - 50} y={THROTTLE.y + 48} fontSize={18} fill="#5b6779">langsam</text>
            <text x={THROTTLE.x1 + 50} y={THROTTLE.y + 48} fontSize={18} fill="#5b6779" textAnchor="end">Vollgas</text>
            <line x1={THROTTLE.x0} y1={THROTTLE.y} x2={THROTTLE.x1} y2={THROTTLE.y} stroke={OUT} strokeWidth={16} strokeLinecap="round" />
            <line x1={THROTTLE.x0} y1={THROTTLE.y} x2={THROTTLE.x1} y2={THROTTLE.y} stroke="#9aa3ad" strokeWidth={9} strokeLinecap="round" />
            <line x1={THROTTLE.x0} y1={THROTTLE.y} x2={knobX} y2={THROTTLE.y} stroke="#4cbb6c" strokeWidth={9} strokeLinecap="round" />
            <g
              role="slider"
              tabIndex={0}
              aria-label="Schubhebel (Pfeiltasten links und rechts)"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(view.throttle * 100)}
              onPointerDown={(e) => grab(e, "throttle")}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setThrottle(sim.current.throttle + 0.2);
                if (e.key === "ArrowLeft") setThrottle(sim.current.throttle - 0.2);
              }}
              style={{ cursor: "grab", touchAction: "none" }}
            >
              <circle cx={knobX} cy={THROTTLE.y} r={58} fill="rgba(255,255,255,0.01)" />
              <circle cx={knobX} cy={THROTTLE.y} r={36} fill="#fff" stroke={OUT} strokeWidth={4} />
              <circle cx={knobX} cy={THROTTLE.y} r={27} fill="#e8574a" stroke={OUT} strokeWidth={3} />
              <path d={`M${knobX - 8},${THROTTLE.y - 12} l12,12 l-12,12`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {view.throttle < 0.05 && (
              <g className="hand-hint" style={{ ["--hx" as string]: `${THROTTLE.x1 - THROTTLE.x0}px`, ["--hy" as string]: "0px" }} transform={`translate(${THROTTLE.x0 + 6},${THROTTLE.y + 8})`}>
                <Hand />
              </g>
            )}
          </g>
        )}

        {onGround && (
          <g className={ready ? undefined : "dim-control"}>
            <path d={`M${STICK.x},${STICK.top - 60} l-56,64 h30 v${STICK.bottom - STICK.top - 8} h52 v${-(STICK.bottom - STICK.top - 8)} h30 z`} fill="#f39a35" opacity={0.8} stroke="#d1702a" strokeWidth={4} strokeLinejoin="round" />
            <text x={STICK.x} y={STICK.bottom + 50} textAnchor="middle" fontSize={22} fontWeight={700} fill={OUT}>Abheben</text>
            <g
              role="slider"
              tabIndex={0}
              aria-label="Steuerknüppel nach oben ziehen (Pfeil hoch halten)"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(view.pull * 100)}
              onPointerDown={(e) => grab(e, "stick")}
              onKeyDown={(e) => e.key === "ArrowUp" && setPull(1)}
              onKeyUp={(e) => e.key === "ArrowUp" && setPull(0)}
              style={{ cursor: "grab", touchAction: "none", transformOrigin: `${STICK.x}px ${stickY}px` }}
              className={ready && view.pull === 0 ? "pulse-svg" : undefined}
            >
              <circle cx={STICK.x} cy={stickY} r={60} fill="rgba(255,255,255,0.01)" />
              <circle cx={STICK.x} cy={stickY} r={44} fill="#fff" stroke={OUT} strokeWidth={5} />
              <circle cx={STICK.x} cy={stickY} r={34} fill="#3b4250" stroke={OUT} strokeWidth={3} />
              <path d={`M${STICK.x - 14},${stickY + 6} l14,-14 l14,14`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {ready && view.pull === 0 && (
              <g className="hand-hint" style={{ ["--hx" as string]: "0px", ["--hy" as string]: `${STICK.top - STICK.bottom}px` }} transform={`translate(${STICK.x + 8},${STICK.bottom + 6})`}>
                <Hand />
              </g>
            )}
          </g>
        )}

      </svg>
    </div>
  );
}

/** in the 120 by 50 frame of SidePlane: we see the right side of the plane */
function SideLights({ longHaul }: { longHaul: boolean }) {
  const nose = longHaul ? 116 : 110;
  const shift = longHaul ? 4 : 0;
  const spot = (x: number, y: number, r: number, color: string, className?: string) => (
    <g className={className}>
      <circle cx={x} cy={y} r={r * 3} fill={color} opacity={0.3} />
      <circle cx={x} cy={y} r={r} fill={color} />
      <circle cx={x} cy={y} r={r * 0.5} fill="#ffffff" />
    </g>
  );
  return (
    <g>
      <polygon points={`${nose - 6},32 ${nose + 90},18 ${nose + 90},48`} fill={LIGHT.warm} opacity={0.3} />
      {spot(nose - 6, 32, 1.6, "#fff6d0")}
      {spot(41 + shift, 42, 1.2, LIGHT.green)}
      {spot(40 + shift, 43, 1.5, LIGHT.white, "strobe")}
      {spot(9, 29, 1.1, LIGHT.white)}
      {spot(62, 19.2, 1.2, LIGHT.red, "beacon")}
    </g>
  );
}

const airportName = (
  <text x={190} y={668} textAnchor="middle" fontSize={30} fontWeight={800} fill="#f6c02c" stroke={OUT} strokeWidth={4} paintOrder="stroke">
    {`FLUGHAFEN ${HOME.name.toUpperCase()}`}
  </text>
);

/** side view of the wind sock behind the runway; the plane rolls to the right, which is towards -y on the apron */
function Windsock({ x }: { x: number }) {
  const { angle, strength } = useWind();
  const droop = (1 - strength) * 1.1;
  const top: [number, number] = [x, 590];
  const tail: [number, number] = [x - Math.sin(angle) * Math.cos(droop) * 90, 590 + Math.sin(droop) * 90];
  return (
    <g>
      <rect x={x - 3} y={584} width={6} height={118} rx={3} fill="#9aa3ad" stroke={OUT} strokeWidth={2} />
      <Sock a={top} b={tail} r0={16} r1={8} />
    </g>
  );
}
