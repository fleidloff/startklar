"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { FuelTruck, OUT, Plane, local, planeGeometry, type Drawable } from "../art";
import { IsoWorld, parkedPose } from "../World";
import { otherPlanes, turnaroundProps } from "./Apron";
import { Hand } from "./Tower";
import { Icon } from "../icons";
import { capture, dist, gateY, svgPoint, type Pt } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";

const RATE = 16;
const ZONE = 6;

export function Fuel({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pose = parkedPose(plane);
  const g = planeGeometry(pose.x, pose.y, pose.heading, plane.type);
  const nozzle = g.at(-0.02 * g.L, -g.S * 0.3, g.wingZ - 0.3);
  const y = gateY(plane.gate);
  const truck = { x: pose.x + 2, y: y + g.S * 0.3 + 5, heading: Math.PI };
  const reel = local(truck.x, truck.y, truck.heading)(-5.2, 0, 1.6);
  const target = 70 + Math.round(((plane.radarAngle * 100) % 4)) * 5;

  const [phase, setPhase] = useState<"hose" | "pump" | "drain" | "done">("hose");
  const [hoseEnd, setHoseEnd] = useState<Pt>(reel);
  const [dragging, setDragging] = useState(false);
  const [level, setLevel] = useState(8);
  const [pumping, setPumping] = useState(false);
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const text = {
      hose: "Zieh den Schlauch zum Tankstutzen am Flügel!",
      pump: `Treibstoff ${Math.round(level)}% (Ziel: ${target}%)`,
      drain: "Huch, etwas zu viel! Ich lasse ein bisschen ab.",
      done: `Treibstoff ${target}% – voll genug!`,
    }[phase];
    setHint(text);
  }, [phase, level, target, setHint]);

  useEffect(() => {
    if (!pumping && phase !== "drain") return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (phase === "drain") {
        const next = Math.max(target, levelRef.current - RATE * 1.5 * dt);
        setLevel(next);
        if (next <= target) {
          stopLoop("pump");
          setPhase("done");
          return;
        }
      } else {
        setLevel((l) => Math.min(100, l + RATE * dt));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pumping, phase, target]);

  useEffect(() => {
    if (phase !== "done") return;
    sfx.pneumatic();
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  useEffect(() => () => stopLoop("pump"), []);

  const startPump = () => {
    if (phase !== "pump" || pumping) return;
    setPumping(true);
    startLoop("pump");
  };
  const stopPump = () => {
    if (!pumping) return;
    setPumping(false);
    stopLoop("pump");
    const l = levelRef.current;
    if (Math.abs(l - target) <= ZONE) {
      setLevel(target);
      setPhase("done");
    } else if (l > target) {
      startLoop("pump", 0.5);
      setPhase("drain");
    } else {
      setHint(`Noch ein bisschen mehr! (${Math.round(l)}% von ${target}%)`);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    setHoseEnd(p);
  };
  const up = () => {
    if (!dragging) return;
    setDragging(false);
    if (dist(hoseEnd, nozzle) < 50) {
      setHoseEnd(nozzle);
      sfx.pneumatic();
      setPhase("pump");
    } else {
      setHoseEnd(reel);
      sfx.oops();
    }
  };

  const sag = Math.max(40, dist(reel, hoseEnd) * 0.35);
  const mid: Pt = [(reel[0] + hoseEnd[0]) / 2, Math.max(reel[1], hoseEnd[1]) + sag];
  const hose = `M${reel[0]},${reel[1]} Q${mid[0]},${mid[1]} ${hoseEnd[0]},${hoseEnd[1]}`;

  const drawables: Drawable[] = [
    ...otherPlanes(state, plane.id),
    { key: "plane", depth: pose.x + pose.y, node: <Plane {...pose} type={plane.type} livery={plane.livery} snow={state.season === "winter" && !plane.done.includes("enteisung") ? 1 : 0} /> },
    ...turnaroundProps(plane),
    { key: "truck", depth: truck.x + truck.y, node: <FuelTruck {...truck} /> },
  ];

  const ring = 2 * Math.PI * 80;
  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: (nozzle[0] + reel[0]) / 2 + 60, y: (nozzle[1] + reel[1]) / 2 + 10, zoom: 1.9 }}
        planes={state.planes}
        drawables={drawables}
        showProps={false}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label="Betankung: Schlauch zum Flügel ziehen, dann Pumpe gedrückt halten"
        overlay={
          <g>
            <circle cx={nozzle[0]} cy={nozzle[1]} r={13} fill={phase === "hose" ? "#4cbb6c" : "#3b4250"} stroke={OUT} strokeWidth={3} className={phase === "hose" ? "pulse-svg" : undefined} style={{ transformOrigin: `${nozzle[0]}px ${nozzle[1]}px` }} />
            <path d={hose} fill="none" stroke={OUT} strokeWidth={11} strokeLinecap="round" />
            <path d={hose} fill="none" stroke="#3b4250" strokeWidth={7} strokeLinecap="round" />
            {(pumping || phase === "drain") && <path d={hose} fill="none" stroke="#f6c02c" strokeWidth={3} strokeDasharray="6 10" className="dash-move" />}
            <circle cx={reel[0]} cy={reel[1]} r={10} fill="#9aa3ad" stroke={OUT} strokeWidth={3} />
            <g
              role="button"
              tabIndex={0}
              aria-label="Schlauch an den Flügel anschließen"
              onPointerDown={(e) => {
                if (phase !== "hose") return;
                capture(svgRef.current, e.pointerId);
                setDragging(true);
                sfx.click();
              }}
              onKeyDown={(e) => {
                if (phase === "hose" && (e.key === "Enter" || e.key === " ")) {
                  setHoseEnd(nozzle);
                  sfx.pneumatic();
                  setPhase("pump");
                }
              }}
              style={{ cursor: phase === "hose" ? "grab" : "default" }}
            >
              <circle cx={hoseEnd[0]} cy={hoseEnd[1]} r={phase === "hose" ? 26 : 12} fill={phase === "hose" ? "rgba(255,255,255,0.4)" : "#f6c02c"} stroke={OUT} strokeWidth={3} />
              <rect x={hoseEnd[0] - 7} y={hoseEnd[1] - 7} width={14} height={14} rx={3} fill="#f6c02c" stroke={OUT} strokeWidth={2} />
            </g>
            {phase === "hose" && !dragging && (
              <g className="hand-hint" style={{ ["--hx" as string]: `${nozzle[0] - reel[0]}px`, ["--hy" as string]: `${nozzle[1] - reel[1]}px` }} transform={`translate(${reel[0]},${reel[1]}) scale(0.6)`}>
                <Hand />
              </g>
            )}
          </g>
        }
      />
      {phase !== "hose" && (
        <div className="fuel-panel">
          <svg viewBox="0 0 200 200" width="230" height="230" aria-hidden="true">
            <circle cx={100} cy={100} r={92} fill="#fff" stroke={OUT} strokeWidth={5} />
            <circle cx={100} cy={100} r={80} fill="none" stroke="#e5e9ee" strokeWidth={22} />
            <circle cx={100} cy={100} r={80} fill="none" stroke="#bff0c9" strokeWidth={22} strokeDasharray={`${(ring * ZONE * 2) / 100} ${ring}`} strokeDashoffset={-((target - ZONE) / 100) * ring} transform="rotate(-90 100 100)" />
            <circle cx={100} cy={100} r={80} fill="none" stroke={Math.abs(level - target) <= ZONE ? "#4cbb6c" : level > target ? "#f39a35" : "#3aa3e8"} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${(ring * level) / 100} ${ring}`} transform="rotate(-90 100 100)" />
            <line x1={100} y1={8} x2={100} y2={36} stroke={OUT} strokeWidth={5} transform={`rotate(${(target / 100) * 360} 100 100)`} />
            <g transform="translate(66,48) scale(1.05)">
              <Icon name="tanken" size={64} />
            </g>
            <text x={100} y={150} textAnchor="middle" fontSize={30} fontWeight={800} fill={OUT}>{Math.round(level)}%</text>
          </svg>
          <button
            type="button"
            className={`pump-btn${pumping ? " pressed" : ""}`}
            disabled={phase !== "pump"}
            onPointerDown={(e) => {
              capture(e.currentTarget as Element, e.pointerId);
              startPump();
            }}
            onPointerUp={stopPump}
            onPointerCancel={stopPump}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), startPump())}
            onKeyUp={(e) => (e.key === " " || e.key === "Enter") && stopPump()}
          >
            {phase === "pump" ? "Gedrückt halten!" : phase === "drain" ? "Ablassen…" : "Fertig!"}
          </button>
        </div>
      )}
    </div>
  );
}
