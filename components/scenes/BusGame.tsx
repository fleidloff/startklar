"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { Bus, Passenger, Plane, type Drawable } from "../art";
import { IsoWorld } from "../World";
import { otherPlanes, servicePoints, turnaroundProps } from "./Apron";
import { Hand } from "./Tower";
import { capture, P, clock, dist, lerp, makePath, pts, svgPoint, unproject, type Pt } from "@/game/iso";
import { sfx } from "@/game/sound";

const SPEED = 12;
const PASSENGERS = 8;

export function BusGame({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { pose, g, y, stairsX } = servicePoints(plane);
  const target: Pt = [stairsX + 1, y + g.r + 11];
  const start: Pt = [16, y + 42];
  const [drawing, setDrawing] = useState<Pt[] | null>(null);
  const [drive, setDrive] = useState<{ path: ReturnType<typeof makePath>; t0: number; points: Pt[] } | null>(null);
  const [now, setNow] = useState(0);
  const [phase, setPhase] = useState<"draw" | "drive" | "board" | "done">("draw");
  const [boardStart, setBoardStart] = useState(0);

  useEffect(() => {
    setHint(
      phase === "draw" ? "Zeichne den Weg vom Bus zur Treppe!" : phase === "drive" ? "Tüt-tüt! Der Bus fährt los." : "Alle steigen ein!",
    );
  }, [phase, setHint]);

  useEffect(() => {
    if (phase !== "drive" && phase !== "board") return;
    let raf = 0;
    const loop = () => {
      const t = performance.now();
      setNow(t);
      if (phase === "drive" && drive && ((t - drive.t0) / 1000) * SPEED >= drive.path.length) {
        sfx.pneumatic();
        setBoardStart(t);
        setPhase("board");
        return;
      }
      if (phase === "board" && boardStart && t - boardStart > 3600) {
        setPhase("done");
        onDone();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, drive, onDone, boardStart]);

  let bus = { x: start[0], y: start[1], heading: 0 };
  if (drive) {
    const s = phase === "drive" ? ((now - drive.t0) / 1000) * SPEED : drive.path.length;
    const a = drive.path.at(Math.max(0, s - 5.5));
    const b = drive.path.at(s);
    const heading = Math.hypot(b.x - a.x, b.y - a.y) > 0.5 ? Math.atan2(b.y - a.y, b.x - a.x) : drive.path.at(drive.path.length).angle;
    bus = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, heading };
  }

  const toWorld = (e: React.PointerEvent): Pt => {
    const [sx, sy] = svgPoint(svgRef.current!, e.clientX, e.clientY);
    return unproject(sx, sy);
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "draw") return;
    const w = toWorld(e);
    if (dist(w, [bus.x, bus.y]) > 10) return;
    capture(svgRef.current, e.pointerId);
    sfx.click();
    setDrawing([[bus.x + 5.5, bus.y], w]);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const w = toWorld(e);
    if (dist(w, drawing[drawing.length - 1]) > 1.2) setDrawing([...drawing, w]);
  };
  const up = () => {
    if (!drawing) return;
    const end = drawing[drawing.length - 1];
    if (dist(end, target) < 9 && drawing.length > 3) {
      const path = makePath([[bus.x - 5.5, bus.y], ...drawing.slice(0, -1), target]);
      setDrive({ path, t0: clock(), points: [...drawing.slice(0, -1), target] });
      setPhase("drive");
      sfx.honk();
    } else {
      sfx.oops();
      setHint("Fast! Zieh die Linie bis zum grünen Kreis bei der Treppe.");
    }
    setDrawing(null);
  };

  const boardT = phase === "board" ? Math.max(0, now - boardStart) / 1000 : phase === "done" ? 99 : -1;
  const people: Drawable[] = [];
  if (boardT >= 0) {
    const door: Pt = [bus.x, bus.y - 1.6];
    const foot: Pt = [stairsX, y + g.r + 6.2];
    const top: Pt = [stairsX, y + g.r + 1.4];
    for (let i = 0; i < PASSENGERS; i++) {
      const t = boardT - i * 0.32;
      if (t < 0 || t > 2.2) continue;
      const k = t / 2.2;
      const w: Pt = k < 0.5 ? [lerp(door[0], foot[0], k * 2), lerp(door[1], foot[1], k * 2)] : [lerp(foot[0], top[0], (k - 0.5) * 2), lerp(foot[1], top[1], (k - 0.5) * 2)];
      const z = k < 0.5 ? 0 : (k - 0.5) * 2 * (g.zc - 0.2);
      people.push({ key: `pax${i}`, depth: w[0] + w[1] + 0.5, node: <Passenger at={P(w[0], w[1], z)} seed={i} /> });
    }
  }

  const drawables: Drawable[] = [
    ...otherPlanes(state, plane.id),
    { key: "plane", depth: pose.x + pose.y, node: <Plane {...pose} type={plane.type} livery={plane.livery} snow={state.season === "winter" && !plane.done.includes("enteisung") ? 1 : 0} /> },
    ...turnaroundProps(plane),
    { key: "bus", depth: bus.x + bus.y, node: <Bus {...bus} /> },
    ...people,
  ];

  const c = P((start[0] + target[0]) / 2, (start[1] + target[1]) / 2);
  const t = P(target[0], target[1]);
  const busScreen = P(bus.x, bus.y, 3);
  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: c[0], y: c[1] - 60, zoom: 1.5 }}
        planes={state.planes}
        drawables={drawables}
        showProps={false}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label="Vorfeldbus: Zeichne den Weg vom Bus zur Treppe"
        under={
          <g>
            {phase === "draw" && (
              <g className="pulse-svg" style={{ transformOrigin: `${t[0]}px ${t[1]}px` }}>
                <ellipse cx={t[0]} cy={t[1]} rx={56} ry={30} fill="rgba(76,187,108,0.35)" stroke="#4cbb6c" strokeWidth={5} strokeDasharray="10 7" />
              </g>
            )}
            {(drawing || (drive && phase === "drive")) && (
              <polyline points={pts((drawing ?? drive?.points ?? []).map(([x, yy]) => P(x, yy)))} fill="none" stroke="#f6c02c" strokeWidth={8} strokeDasharray="14 10" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        }
        overlay={
          phase === "draw" &&
          !drawing && (
            <g className="hand-hint" style={{ ["--hx" as string]: `${t[0] - busScreen[0]}px`, ["--hy" as string]: `${t[1] - busScreen[1]}px` }} transform={`translate(${busScreen[0]},${busScreen[1]})`}>
              <Hand />
            </g>
          )
        }
      />
    </div>
  );
}
