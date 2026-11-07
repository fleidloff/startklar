"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { Bright, Cover, Plane, Tug } from "../art";
import { IsoWorld } from "../World";
import { otherPlanes } from "./Apron";
import { Hand } from "./Tower";
import { capture, P, gateY, pts, svgPoint, unproject } from "@/game/iso";
import { PUSHBACK_END, pushbackPath, pushbackPose } from "@/game/motion";
import { sfx, startLoop, stopLoop } from "@/game/sound";

export function Pushback({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [s, setS] = useState(0);
  const [grab, setGrab] = useState(false);
  const [off, setOff] = useState(false);
  const done = s >= PUSHBACK_END - 0.3;
  const path = pushbackPath(plane.gate);
  const pose = pushbackPose(plane.gate, plane.type, s);
  const nose = path.at(s);
  const tugX = nose.x + Math.cos(pose.heading) * 3.6;
  const tugY = nose.y + Math.sin(pose.heading) * 3.6;
  const handle = P(tugX, tugY, 1.5);

  useEffect(() => {
    if (done) {
      stopLoop("engine");
      sfx.pneumatic();
      setHint("Geschafft! Schlepper abgekoppelt.");
      const t = setTimeout(onDone, 1100);
      return () => clearTimeout(t);
    }
    setHint(off ? "Bleib auf der gelben Linie!" : "Zieh den Schlepper an der gelben Linie entlang!");
  }, [done, off, onDone, setHint]);

  useEffect(() => () => stopLoop("engine"), []);

  const advance = (to: number) => {
    const next = Math.min(PUSHBACK_END, Math.max(0, to));
    setS(next);
    startLoop("engine", 0.6);
  };

  const move = (e: React.PointerEvent) => {
    if (!grab || done) return;
    const [sx, sy] = svgPoint(svgRef.current!, e.clientX, e.clientY);
    const w = unproject(sx, sy, 1.5);
    const near = path.nearest(w, Math.max(0, s - 6), Math.min(PUSHBACK_END, s + 12));
    setOff(near.d > 12);
    if (near.d <= 12) advance(near.s);
  };
  const up = () => {
    setGrab(false);
    stopLoop("engine");
  };

  const y = gateY(plane.gate);
  const center = P(54, y + 20);
  const guide: [number, number][] = [];
  for (let t = 0; t <= PUSHBACK_END; t += 2) {
    const q = path.at(t);
    guide.push(P(q.x, q.y));
  }
  const endPt = path.at(PUSHBACK_END);
  const drawables = [
    ...otherPlanes(state, plane.id),
    {
      key: "pushplane",
      depth: pose.x + pose.y,
      node: (
        <Cover>
          <Plane x={pose.x} y={pose.y} heading={pose.heading} type={plane.type} livery={plane.livery} />
        </Cover>
      ),
    },
    { key: "tug", depth: tugX + tugY + 0.1, node: <Cover><Tug x={tugX} y={tugY} heading={pose.heading + Math.PI} color="#f2f4f6" /></Cover> },
  ];

  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: center[0], y: center[1] - 40, zoom: 1.1 }}
        planes={state.planes}
        docked={(p) => p.id !== plane.id}
        drawables={drawables}
        showProps={false}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label="Pushback: Zieh den Schlepper an der gelben Linie entlang"
        under={
          <Bright>
            <g>
              <polyline points={pts(guide)} fill="none" stroke="#26303f" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
              <polyline points={pts(guide)} fill="none" stroke="#ffd23a" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="18 12" className="dash-move" />
              {(() => {
                const e = P(endPt.x, endPt.y);
                return (
                  <g transform={`translate(${e[0]},${e[1]})`}>
                    <ellipse rx={34} ry={18} fill="#4cbb6c" stroke="#26303f" strokeWidth={3} />
                    <text y={6} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fff">ZIEL</text>
                  </g>
                );
              })()}
            </g>
          </Bright>
        }
        overlay={
          !done && (
            <g
              role="button"
              tabIndex={0}
              aria-label="Schlepper ziehen (Pfeil rechts)"
              onPointerDown={(e) => {
                capture(e.currentTarget as Element, e.pointerId);
                setGrab(true);
                sfx.click();
              }}
              onKeyDown={(e) => (e.key === "ArrowRight" || e.key === " ") && advance(s + 2)}
              style={{ cursor: "grab" }}
            >
              <circle cx={handle[0]} cy={handle[1]} r={44} fill="rgba(255,255,255,0.35)" stroke="#fff" strokeWidth={4} strokeDasharray="8 6" className={grab ? undefined : "pulse-svg"} style={{ transformOrigin: `${handle[0]}px ${handle[1]}px` }} />
              {!grab && s === 0 && (
                <g transform={`translate(${handle[0] + 10},${handle[1] + 6}) scale(0.9)`}>
                  <Hand />
                </g>
              )}
            </g>
          )
        }
      />
      <Progress value={s / PUSHBACK_END} label="Pushback" />
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${Math.min(100, value * 100)}%` }} />
      <span>{label} {Math.round(Math.min(1, value) * 100)}%</span>
    </div>
  );
}
