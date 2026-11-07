"use client";
import { useEffect, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { Passenger, type Drawable } from "../art";
import { Bridge, IsoWorld, bridgeDepth, bridgeDoor, bridgeHeight, bridgeParked, bridgePivot, parkedPose, planeDrawable } from "../World";
import { otherPlanes, turnaroundProps } from "./Apron";
import { Hand } from "./Tower";
import { P, capture, clamp, clock, dist, lerp, makePath, svgPoint, unproject, type Pt } from "@/game/iso";
import { sfx } from "@/game/sound";

const PASSENGERS = 8;
const SNAP = 3;
const DOCK_MS = 500;
const WALK = 2.4;
const GAP = 0.35;
const BOARD_MS = ((PASSENGERS - 1) * GAP + WALK) * 1000 + 400;

export function FingerGame({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pose = parkedPose(plane);
  const pivot = bridgePivot(plane.gate);
  const door = bridgeDoor(plane.gate, plane.type);
  const parked = bridgeParked(plane.gate);
  const [cab, setCab] = useState<Pt>(parked);
  const [grab, setGrab] = useState<Pt | null>(null);
  const [phase, setPhase] = useState<"drag" | "dock" | "board" | "done">("drag");
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setHint(
      phase === "drag" ? "Der Finger ist eine Brücke ins Flugzeug. Zieh ihn an die grüne Tür!" : phase === "dock" ? "Der Finger dockt an." : "Alle laufen durch den Finger ins Flugzeug!",
    );
  }, [phase, setHint]);

  useEffect(() => {
    if (phase !== "dock" && phase !== "board") return;
    let raf = 0;
    const loop = () => {
      const t = clock();
      setNow(t);
      if (phase === "dock" && t - t0 > DOCK_MS) {
        sfx.pneumatic();
        setT0(t);
        setPhase("board");
        return;
      }
      if (phase === "board" && t - t0 > BOARD_MS) {
        setPhase("done");
        onDone();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, t0, onDone]);

  const shown: Pt = phase === "drag" ? cab : phase === "dock" ? [lerp(cab[0], door[0], clamp((now - t0) / DOCK_MS, 0, 1)), lerp(cab[1], door[1], clamp((now - t0) / DOCK_MS, 0, 1))] : door;
  const near = clamp(1 - dist(shown, door) / dist(parked, door), 0, 1);
  const z = lerp(bridgeHeight(), bridgeHeight(plane.type), near);

  /** the cab swings around the rotunda, stays in its reach and never enters the fuselage */
  const limit = ([x, y]: Pt): Pt => {
    const a = clamp(Math.atan2(y - pivot[1], x - pivot[0]), -1.3, 0.6);
    const r = clamp(Math.hypot(x - pivot[0], y - pivot[1]), 5, dist(pivot, door) + 3);
    return [pivot[0] + Math.cos(a) * r, Math.min(door[1], pivot[1] + Math.sin(a) * r)];
  };
  const toWorld = (e: React.PointerEvent): Pt => {
    const [sx, sy] = svgPoint(svgRef.current!, e.clientX, e.clientY);
    return unproject(sx, sy, z + 1.7);
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "drag") return;
    const w = toWorld(e);
    if (dist(w, cab) > 6) return;
    capture(svgRef.current, e.pointerId);
    sfx.click();
    setGrab([cab[0] - w[0], cab[1] - w[1]]);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!grab) return;
    const w = toWorld(e);
    setCab(limit([w[0] + grab[0], w[1] + grab[1]]));
  };
  const up = () => {
    if (!grab) return;
    setGrab(null);
    if (dist(cab, door) < SNAP) {
      setT0(clock());
      setNow(clock());
      setPhase("dock");
    } else {
      sfx.oops();
      setHint("Fast! Zieh die Kabine bis an die grüne Tür.");
    }
  };

  const people: Drawable[] = [];
  if (phase === "board") {
    const zDock = bridgeHeight(plane.type);
    const end: Pt = [door[0] - 0.9, door[1]];
    const a = Math.atan2(end[1] - pivot[1], end[0] - pivot[0]);
    // along the near wall, so the small figures stay inside the tunnel picture instead of standing on its roof
    const wall = (p: Pt, s: number): Pt => [p[0] + Math.cos(a) * s - Math.sin(a), p[1] + Math.sin(a) * s + Math.cos(a)];
    const walk = makePath([wall(pivot, 2.2), wall(end, 0), [door[0], door[1] + 1.2]]);
    const boardT = (now - t0) / 1000;
    for (let i = 0; i < PASSENGERS; i++) {
      const t = boardT - i * GAP;
      if (t < 0 || t > WALK) continue;
      const q = walk.at((t / WALK) * walk.length);
      const [sx, sy] = P(q.x, q.y, zDock);
      people.push({
        key: `pax${i}`,
        depth: bridgeDepth(plane.gate) + 0.01 * (i + 1),
        node: (
          <g transform={`translate(${sx},${sy}) scale(0.5) translate(${-sx},${-sy})`}>
            <Passenger at={[sx, sy]} seed={i} />
          </g>
        ),
      });
    }
  }

  const drawables: Drawable[] = [
    ...otherPlanes(state, plane.id),
    planeDrawable(plane, pose, { snow: state.season === "winter" && !plane.done.includes("enteisung") ? 1 : 0 }),
    ...turnaroundProps(plane),
    { key: "finger", depth: bridgeDepth(plane.gate), node: <Bridge gate={plane.gate} cab={shown} z={z} /> },
    ...people,
  ];

  const zDoor = bridgeHeight(plane.type) + 1.7;
  const target = P(door[0], door[1], zDoor);
  const handle = P(shown[0], shown[1], z + 1.7);
  const c = P((parked[0] + door[0]) / 2 + 3, (parked[1] + door[1]) / 2 + 3, 2);
  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: c[0], y: c[1], zoom: 3 }}
        planes={state.planes}
        drawables={drawables}
        showProps={false}
        ownBridge={plane.gate}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label="Finger: Zieh die Brücke vom Gebäude an die Tür des Flugzeugs"
        overlay={
          phase === "drag" && (
            <g pointerEvents="none">
              <g className="pulse-svg" style={{ transformOrigin: `${target[0]}px ${target[1]}px` }}>
                <circle cx={target[0]} cy={target[1]} r={22} fill="rgba(76,187,108,0.35)" stroke="#4cbb6c" strokeWidth={4} strokeDasharray="8 6" />
              </g>
              {!grab && (
                <>
                  <g className="pulse-svg" style={{ transformOrigin: `${handle[0]}px ${handle[1]}px` }}>
                    <circle cx={handle[0]} cy={handle[1]} r={20} fill="none" stroke="#f6c02c" strokeWidth={5} />
                  </g>
                  <g className="hand-hint" style={{ ["--hx" as string]: `${target[0] - handle[0]}px`, ["--hy" as string]: `${target[1] - handle[1]}px` }} transform={`translate(${handle[0]},${handle[1]}) scale(0.6)`}>
                    <Hand />
                  </g>
                </>
              )}
            </g>
          )
        }
      />
    </div>
  );
}
