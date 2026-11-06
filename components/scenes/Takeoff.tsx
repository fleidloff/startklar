"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { OUT, SIDE_MAIN_GEAR_X, SidePlane } from "../art";
import { Hand } from "./Tower";
import { aircraft, destination } from "@/game/data";
import { capture, clamp, svgPoint } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";

type Phase = "schub" | "abheben" | "fahrwerk" | "wolken" | "fertig";

const LIFT = 0.85;
const KMH = 300;
const GROUND = 760;
const PLANE_X = 640;
const PLANE_W = 560;
const SCALE = PLANE_W / 120;
const THROTTLE = { x0: 210, x1: 540, y: 915 };
const STICK = { x: 1320, top: 520, bottom: 860 };
const GEAR = { x: 1320, top: 560, bottom: 800 };
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
      if (s.phase === "abheben" && s.alt > 110) s.phase = "fahrwerk";
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
  useEffect(() => {
    if (view.phase === "schub") {
      if (view.tooSlow) setHint("Noch nicht schnell genug! Erst bis zur grünen Fahne.");
      else setHint(view.v < 0.03 ? "Schieb den Schubhebel nach vorne!" : `Tempo ${kmh} km/h – schneller!`);
    } else if (view.phase === "abheben") setHint("Jetzt abheben! Zieh den Knüppel nach oben!");
    else if (view.phase === "fahrwerk") setHint("Wir fliegen! Jetzt das Fahrwerk einfahren!");
    else setHint(`Guten Flug nach ${dest.city}!`);
  }, [view.phase, view.tooSlow, view.v < 0.03, kmh, dest.city, setHint]); // eslint-disable-line react-hooks/exhaustive-deps

  const setThrottle = (value: number) => {
    sim.current.throttle = clamp(value, 0, 1);
  };
  const setPull = (value: number) => {
    sim.current.pull = clamp(value, 0, 1);
  };
  const retract = () => {
    const s = sim.current;
    if (s.phase !== "fahrwerk" || s.retracting) return;
    s.retracting = true;
    sfx.pneumatic();
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
  const onGround = view.alt <= 0;
  const flyX = view.fly * 420;
  const flyY = view.fly * 260;
  const flyScale = 1 - Math.min(0.45, view.fly * 0.18);
  const knobX = THROTTLE.x0 + view.throttle * (THROTTLE.x1 - THROTTLE.x0);
  const stickY = STICK.bottom - view.pull * (STICK.bottom - STICK.top);
  const leverY = GEAR.bottom - (1 - view.gear) * (GEAR.bottom - GEAR.top);

  return (
    <div className="scene">
      <svg ref={svgRef} className="fill" viewBox="0 0 1600 1000" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="application" aria-label={`Start von Flug ${plane.flightNo} nach ${dest.city}`}>
        <defs>
          <linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={winter ? "#a9cfe6" : "#6cc3f2"} />
            <stop offset="1" stopColor={winter ? "#e6f1f8" : "#d4effc"} />
          </linearGradient>
        </defs>
        <rect width={1600} height={1000} fill="url(#tsky)" />
        <circle cx={1180} cy={190 + view.alt * 0.2} r={60} fill="#ffe27a" stroke={OUT} strokeWidth={4} />

        {CLOUDS.map(([x, y, s], i) => {
          const cx = ((((x - view.scroll * 0.12 * s) % 2000) + 2000) % 2000) - 200;
          return (
            <g key={i} transform={`translate(${cx},${y + view.alt * 0.6 * s}) scale(${s})`}>
              <path d="M-80,20 a34,34 0 0 1 30,-44 a46,46 0 0 1 84,-6 a32,32 0 0 1 50,30 a24,24 0 0 1 -6,40 h-150 a20,20 0 0 1 -8,-20 z" fill="#fff" stroke={OUT} strokeWidth={4 / s} />
            </g>
          );
        })}

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
            <rect x={420} y={420} width={36} height={270} fill="#fff" stroke={OUT} strokeWidth={4} />
            <path d="M392,380 H484 L470,430 H406 Z" fill="#5c86ad" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            <rect x={398} y={365} width={80} height={16} rx={4} fill="#fff" stroke={OUT} strokeWidth={4} />
            {winter && <path d="M0,560 q190,-30 380,0 Z" fill="#fff" stroke="#c4dcef" strokeWidth={3} />}
          </g>
          <rect x={0} y={680} width={1600} height={500} fill={winter ? "#eef5fb" : "#8ccf55"} />
          <rect x={0} y={720} width={1600} height={100} fill="#5c6168" stroke={OUT} strokeWidth={4} />
          <line x1={0} y1={732} x2={1600} y2={732} stroke="#fff" strokeWidth={4} />
          <line x1={0} y1={808} x2={1600} y2={808} stroke="#fff" strokeWidth={4} />
          <line x1={0} y1={770} x2={1600} y2={770} stroke="#fff" strokeWidth={8} strokeDasharray="70 60" strokeDashoffset={view.scroll} />
          {[...Array(10).keys()].map((i) => {
            const x = ((((i * 200 - view.scroll) % 2000) + 2000) % 2000) - 200;
            return <circle key={i} cx={x} cy={726} r={6} fill="#ffd23a" stroke={OUT} strokeWidth={2} />;
          })}
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

        <g transform={`translate(${PLANE_X + flyX},${GROUND - flyY}) scale(${flyScale}) rotate(${-view.pitch})`}>
          <g transform={`translate(${-SIDE_MAIN_GEAR_X * SCALE},${-49 * SCALE})`}>
            <SidePlane type={type} color={plane.livery} width={PLANE_W} gear={view.gear} />
          </g>
        </g>

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

        {onGround && view.v > 0.3 && (
          <g className={view.phase === "abheben" ? undefined : "dim-control"}>
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
              style={{ cursor: "grab", touchAction: "none" }}
              className={view.phase === "abheben" && view.pull === 0 ? "pulse-svg" : undefined}
            >
              <circle cx={STICK.x} cy={stickY} r={60} fill="rgba(255,255,255,0.01)" />
              <circle cx={STICK.x} cy={stickY} r={44} fill="#fff" stroke={OUT} strokeWidth={5} />
              <circle cx={STICK.x} cy={stickY} r={34} fill="#3b4250" stroke={OUT} strokeWidth={3} />
              <path d={`M${STICK.x - 14},${stickY + 6} l14,-14 l14,14`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {view.phase === "abheben" && view.pull === 0 && (
              <g className="hand-hint" style={{ ["--hx" as string]: "0px", ["--hy" as string]: `${STICK.top - STICK.bottom}px` }} transform={`translate(${STICK.x + 8},${STICK.bottom + 6})`}>
                <Hand />
              </g>
            )}
          </g>
        )}

        {(view.phase === "fahrwerk" || (view.phase === "wolken" && view.fly < 1)) && (
          <g>
            <rect x={GEAR.x - 110} y={GEAR.top - 110} width={220} height={GEAR.bottom - GEAR.top + 190} rx={22} fill="#fbf0cf" stroke={OUT} strokeWidth={4} />
            <text x={GEAR.x} y={GEAR.top - 70} textAnchor="middle" fontSize={24} fontWeight={700} fill={OUT}>Fahrwerk</text>
            {[-40, 0, 40].map((dx) => (
              <circle key={dx} cx={GEAR.x + dx} cy={GEAR.top - 35} r={11} fill={view.gear > 0.5 ? "#4cbb6c" : "#9aa3ad"} stroke={OUT} strokeWidth={3} />
            ))}
            <rect x={GEAR.x - 12} y={GEAR.top} width={24} height={GEAR.bottom - GEAR.top} rx={12} fill="#3b4250" stroke={OUT} strokeWidth={3} />
            <text x={GEAR.x + 30} y={GEAR.top + 10} fontSize={18} fill="#5b6779">rein</text>
            <text x={GEAR.x + 30} y={GEAR.bottom} fontSize={18} fill="#5b6779">raus</text>
            <g
              role="button"
              tabIndex={0}
              aria-label="Fahrwerk einfahren"
              onClick={retract}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && retract()}
              style={{ cursor: "pointer" }}
              className={view.retracting ? undefined : "pulse-svg"}
            >
              <circle cx={GEAR.x} cy={leverY} r={58} fill="rgba(255,255,255,0.01)" />
              <circle cx={GEAR.x} cy={leverY} r={36} fill="#fff" stroke={OUT} strokeWidth={4} />
              <circle cx={GEAR.x} cy={leverY} r={27} fill="#30343c" stroke={OUT} strokeWidth={3} />
              <circle cx={GEAR.x} cy={leverY} r={10} fill="#9aa3ad" stroke={OUT} strokeWidth={2} />
              {[0, 60, 120].map((a) => (
                <line key={a} x1={GEAR.x} y1={leverY - 24} x2={GEAR.x} y2={leverY + 24} stroke="#9aa3ad" strokeWidth={3} transform={`rotate(${a} ${GEAR.x} ${leverY})`} />
              ))}
            </g>
            {!view.retracting && (
              <g className="hand-hint" style={{ ["--hx" as string]: "0px", ["--hy" as string]: `${GEAR.top - GEAR.bottom}px` }} transform={`translate(${GEAR.x + 8},${GEAR.bottom + 6})`}>
                <Hand />
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
