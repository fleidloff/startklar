"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { DeiceTruck, Plane, SnowCap, local, planeGeometry, wingPolygon, type Drawable } from "../art";
import { IsoWorld, parkedPose } from "../World";
import { otherPlanes, turnaroundProps } from "./Apron";
import { Hand } from "./Tower";
import { Progress } from "./Pushback";
import { capture, K, dist, gateY, lerp, svgPoint, type Pt } from "@/game/iso";
import { sfx, startLoop, stopLoop } from "@/game/sound";

const BRUSH = 20;
const GOAL = 0.9;

export function Deice({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pose = parkedPose(plane);
  const g = planeGeometry(pose.x, pose.y, pose.heading, plane.type);
  const y = gateY(plane.gate);
  const wing = wingPolygon(g, -1, 0.25);
  const nose = g.at(0.42 * g.L, 0, g.zc + g.r * 0.75);
  const tail = g.at(-0.28 * g.L, 0, g.zc + g.r * 0.75);
  const truck = { x: pose.x + 4, y: y + g.S * 0.5 + 7, heading: Math.PI };
  const pivot = local(truck.x, truck.y, truck.heading)(-2.5, 0, 3.2);

  const samples = useMemo(() => {
    const list: Pt[] = [];
    const [a, b, c, d] = wing;
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 4; j++) {
        const u = 0.06 + (i / 10) * 0.88;
        const v = 0.1 + (j / 4) * 0.8;
        const lead: Pt = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
        const trail: Pt = [lerp(d[0], c[0], u), lerp(d[1], c[1], u)];
        list.push([lerp(lead[0], trail[0], v), lerp(lead[1], trail[1], v)]);
      }
    }
    for (let i = 0; i <= 16; i++) list.push([lerp(nose[0], tail[0], i / 16), lerp(nose[1], tail[1], i / 16) - g.r * K * 0.3]);
    return list;
  }, [plane.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [cleared, setCleared] = useState<Set<number>>(() => new Set());
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [spray, setSpray] = useState<Pt | null>(null);
  const [basket, setBasket] = useState<Pt>(() => [pivot[0] - 60, pivot[1] - 90]);
  const progress = cleared.size / samples.length;
  const done = progress >= GOAL;

  useEffect(() => {
    setHint(done ? "Alles frei! Enteisung 100%" : `Schnee entfernen! Enteisung ${Math.round(progress * 100)}%`);
  }, [progress, done, setHint]);


  useEffect(() => () => stopLoop("spray"), []);

  const sprayAt = (p: Pt) => {
    setBasket((b) => [lerp(b[0], p[0] + 30, 0.35), lerp(b[1], p[1] - 50, 0.35)]);
    setSpray(p);
    setStrokes((s) => {
      const copy = s.slice();
      copy[copy.length - 1] = [...(copy[copy.length - 1] ?? []), p];
      return copy;
    });
    const next = new Set(cleared);
    samples.forEach((s, i) => {
      if (dist(s, p) < BRUSH * 1.3) next.add(i);
    });
    if (next.size === cleared.size) return;
    setCleared(next);
    if (next.size / samples.length >= GOAL) {
      stopLoop("spray");
      setSpray(null);
      sfx.pop();
      setTimeout(onDone, 1200);
    }
  };

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (done) return;
    capture(svgRef.current, e.pointerId);
    setStrokes((s) => [...s, []]);
    startLoop("spray");
    sprayAt(svgPoint(svgRef.current!, e.clientX, e.clientY));
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!spray || done) return;
    sprayAt(svgPoint(svgRef.current!, e.clientX, e.clientY));
  };
  const up = () => {
    setSpray(null);
    stopLoop("spray");
  };

  const drawables: Drawable[] = [
    ...otherPlanes(state, plane.id),
    {
      key: "plane",
      depth: pose.x + pose.y,
      node: (
        <g>
          <Plane {...pose} type={plane.type} livery={plane.livery} />
          <g mask="url(#sprayMask)" className={done ? "melt" : undefined}>
            <SnowCap poly={wing} />
            <line x1={nose[0]} y1={nose[1]} x2={tail[0]} y2={tail[1]} stroke="#7fb6dc" strokeWidth={g.r * K * 0.9 + 6} strokeLinecap="round" />
            <line x1={nose[0]} y1={nose[1]} x2={tail[0]} y2={tail[1]} stroke="#fff" strokeWidth={g.r * K * 0.9} strokeLinecap="round" />
            <line x1={nose[0]} y1={nose[1] + g.r * K * 0.35} x2={tail[0]} y2={tail[1] + g.r * K * 0.35} stroke="#b9d9ef" strokeWidth={2} strokeDasharray="4 6" />
          </g>
        </g>
      ),
    },
    ...turnaroundProps(plane),
    { key: "truck", depth: truck.x + truck.y + 30, node: <DeiceTruck {...truck} basket={basket} /> },
  ];

  const center: Pt = [(wing[1][0] + nose[0]) / 2, (wing[1][1] + nose[1]) / 2 + 20];
  const hintFrom = samples[Math.floor(samples.length / 3)];
  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: center[0], y: center[1], zoom: 1.75 }}
        planes={state.planes}
        drawables={drawables}
        showProps={false}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label="Enteisung: Wisch mit dem Finger über den Schnee auf dem Flugzeug"
        under={
          <defs>
            <mask id="sprayMask" maskUnits="userSpaceOnUse" x={-5000} y={-5000} width={10000} height={10000}>
              <rect x={-5000} y={-5000} width={10000} height={10000} fill="#fff" />
              {strokes.map((s, i) => (
                <polyline key={i} points={s.map((p) => p.join(",")).join(" ")} fill="none" stroke="#000" strokeWidth={BRUSH * 2.4} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </mask>
          </defs>
        }
        overlay={
          <g pointerEvents="none">
            {spray && (
              <g>
                <path d={`M${basket[0]},${basket[1]} L${spray[0] - 16},${spray[1] - 6} L${spray[0] + 16},${spray[1] + 6} Z`} fill="rgba(255,150,60,0.45)" />
                <line x1={basket[0]} y1={basket[1]} x2={spray[0]} y2={spray[1]} stroke="#ff9a3c" strokeWidth={7} strokeDasharray="0.1 14" strokeLinecap="round" className="dash-move" />
              </g>
            )}
            {!spray && strokes.length === 0 && (
              <g className="hand-sweep" transform={`translate(${hintFrom[0]},${hintFrom[1]}) scale(0.5)`}>
                <Hand />
              </g>
            )}
          </g>
        }
      />
      <Progress value={progress / GOAL} label="Enteisung" />
    </div>
  );
}
