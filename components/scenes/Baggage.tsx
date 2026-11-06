"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneProps } from "../Game";
import { BeltLoader, Box, OUT, Plane, Wheel, local, type Drawable } from "../art";
import { IsoWorld } from "../World";
import { otherPlanes, servicePoints } from "./Apron";
import { Hand } from "./Tower";
import { Progress } from "./Pushback";
import { aircraft } from "@/game/data";
import { capture, P, clock, dist, lerp, svgPoint, type Pt } from "@/game/iso";
import { sfx } from "@/game/sound";

const KINDS = ["koffer", "tasche", "truhe", "rucksack"] as const;
const COLORS = ["#e8574a", "#4cbb6c", "#3aa3e8", "#f39a35", "#9a6ee8", "#ef6fae", "#f6c02c", "#2fb7a8"];
const RIDE = 1.4;

interface Bag {
  id: number;
  kind: (typeof KINDS)[number];
  color: string;
  home: Pt;
  state: "cart" | "drag" | "ride" | "back" | "in";
  pos: Pt;
  t0: number;
  from: Pt;
}

export function Baggage({ state, plane, setHint, onDone }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { pose, g, y, beltX } = servicePoints(plane);
  const loader = { x: beltX, y: y + g.r + 5.5, heading: -Math.PI / 2 };
  const top = P(beltX, y + g.r * 0.9, g.zc - g.r * 0.4);
  const bottom = local(loader.x, loader.y, loader.heading)(-3, 0, 1.0);
  const cart = { x: beltX + 3, y: y + g.r + 15.5, heading: 0 };
  const count = aircraft(plane.type).bags;

  const initial = useMemo<Bag[]>(() => {
    const at = local(cart.x, cart.y, cart.heading);
    return [...Array(count).keys()].map((i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const base = at(-3.2, 0, 1.0);
      const home: Pt = [base[0] + col * 30 + row * 8, base[1] + col * 17 - row * 26];
      return { id: i, kind: KINDS[(i + plane.gate) % KINDS.length], color: COLORS[(i * 3 + plane.gate) % COLORS.length], home, state: "cart", pos: home, t0: 0, from: home };
    });
  }, [count, plane.gate]); // eslint-disable-line react-hooks/exhaustive-deps
  const [bags, setBags] = useState(initial);
  const [now, setNow] = useState(0);
  const loaded = bags.filter((b) => b.state === "in").length;
  const animating = bags.some((b) => b.state === "ride" || b.state === "back");
  const doneRef = useRef(false);

  useEffect(() => {
    setHint(loaded === count ? "Frachtraum voll beladen!" : `Gepäck einladen! (${loaded} von ${count})`);
    if (loaded === count && !doneRef.current) {
      doneRef.current = true;
      sfx.pneumatic();
      setTimeout(onDone, 700);
    }
  }, [loaded, count, onDone, setHint]);

  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const loop = () => {
      const t = performance.now();
      setNow(t);
      setBags((list) =>
        list.map((b) => {
          if (b.state === "ride" && (t - b.t0) / 1000 > RIDE) {
            sfx.pop();
            return { ...b, state: "in" };
          }
          if (b.state === "back" && (t - b.t0) / 1000 > 0.4) return { ...b, state: "cart", pos: b.home };
          return b;
        }),
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const nearBelt = (p: Pt) => {
    for (let t = 0; t <= 0.6; t += 0.05) {
      const q: Pt = [lerp(bottom[0], top[0], t), lerp(bottom[1], top[1], t)];
      if (dist(p, q) < 55) return true;
    }
    return false;
  };

  const send = (id: number, from: Pt) => {
    sfx.click();
    setBags((list) => list.map((b) => (b.id === id ? { ...b, state: "ride", t0: clock(), from } : b)));
  };

  const move = (e: React.PointerEvent) => {
    const dragged = bags.find((b) => b.state === "drag");
    if (!dragged) return;
    const p = svgPoint(svgRef.current!, e.clientX, e.clientY);
    setBags((list) => list.map((b) => (b.state === "drag" ? { ...b, pos: p } : b)));
  };
  const up = () => {
    const dragged = bags.find((b) => b.state === "drag");
    if (!dragged) return;
    if (nearBelt(dragged.pos)) send(dragged.id, bottom);
    else {
      sfx.oops();
      setBags((list) => list.map((b) => (b.state === "drag" ? { ...b, state: "back", t0: clock(), from: b.pos } : b)));
    }
  };

  const bagPos = (b: Bag): Pt => {
    if (b.state === "ride") {
      const k = Math.min(1, (now - b.t0) / 1000 / RIDE);
      return [lerp(b.from[0], top[0], k), lerp(b.from[1], top[1], k)];
    }
    if (b.state === "back") {
      const k = Math.min(1, (now - b.t0) / 400);
      return [lerp(b.from[0], b.home[0], k), lerp(b.from[1], b.home[1], k)];
    }
    return b.state === "drag" ? b.pos : b.home;
  };

  const cartAt = local(cart.x, cart.y, cart.heading);
  const drawables: Drawable[] = [
    ...otherPlanes(state, plane.id),
    { key: "plane", depth: pose.x + pose.y, node: <Plane {...pose} type={plane.type} livery={plane.livery} snow={state.season === "winter" && !plane.done.includes("enteisung") ? 1 : 0} /> },
    { key: "loader", depth: loader.x + loader.y, node: <BeltLoader {...loader} top={top} /> },
    {
      key: "cart",
      depth: cart.x + cart.y,
      node: (
        <g>
          {[[3.6, 1.5], [3.6, -1.5], [-3.6, 1.5], [-3.6, -1.5]].map(([a, b], i) => <Wheel key={i} at={cartAt(a, b, 0.5)} r={0.5} />)}
          <Box {...cart} l={9} w={3.6} h={0.4} z={0.5} color="#8a929c" />
          <Box x={cart.x - 4.4} y={cart.y} l={0.3} w={3.6} h={1.6} z={0.9} color="#c9d0d8" />
        </g>
      ),
    },
  ];

  const door = top;
  const center: Pt = [(bottom[0] + cartAt(0, 0)[0]) / 2, (bottom[1] + top[1]) / 2 + 10];
  const sorted = [...bags].sort((a, b) => (a.state === "drag" ? 1 : b.state === "drag" ? -1 : a.home[1] - b.home[1]));
  const firstOnCart = bags.find((b) => b.state === "cart");

  return (
    <div className="scene">
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={{ x: center[0], y: center[1], zoom: 2.4 }}
        planes={state.planes}
        drawables={drawables}
        showProps={false}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        label={`Gepäck verladen: Zieh die Koffer auf das Förderband. ${loaded} von ${count} eingeladen.`}
        overlay={
          <g>
            <polygon points={`${door[0] - 12},${door[1] - 14} ${door[0] + 12},${door[1] - 8} ${door[0] + 12},${door[1] + 12} ${door[0] - 12},${door[1] + 6}`} fill="#3b4250" stroke={OUT} strokeWidth={2} />
            {loaded < count && (
              <g className="pulse-svg" style={{ transformOrigin: `${bottom[0]}px ${bottom[1]}px` }}>
                <ellipse cx={bottom[0]} cy={bottom[1]} rx={30} ry={18} fill="rgba(76,187,108,0.3)" stroke="#4cbb6c" strokeWidth={3} strokeDasharray="7 5" />
              </g>
            )}
            {sorted
              .filter((b) => b.state !== "in")
              .map((b) => {
                const p = bagPos(b);
                const scale = b.state === "ride" ? 1 - Math.min(1, (now - b.t0) / 1000 / RIDE) * 0.35 : b.state === "drag" ? 1.15 : 1;
                return (
                  <g
                    key={b.id}
                    role="button"
                    tabIndex={b.state === "cart" ? 0 : -1}
                    aria-label={`${b.kind === "koffer" ? "Koffer" : b.kind === "tasche" ? "Reisetasche" : b.kind === "truhe" ? "Truhe" : "Rucksack"} aufs Band legen`}
                    transform={`translate(${p[0]},${p[1]}) scale(${scale})`}
                    style={{ cursor: b.state === "cart" ? "grab" : "default" }}
                    onPointerDown={(e) => {
                      if (b.state !== "cart") return;
                      capture(svgRef.current, e.pointerId);
                      sfx.click();
                      setBags((list) => list.map((x) => (x.id === b.id ? { ...x, state: "drag", pos: svgPoint(svgRef.current!, e.clientX, e.clientY) } : x)));
                    }}
                    onKeyDown={(e) => b.state === "cart" && (e.key === "Enter" || e.key === " ") && send(b.id, b.home)}
                  >
                    <g transform="scale(1.7)"><BagSprite kind={b.kind} color={b.color} /></g>
                  </g>
                );
              })}
            {firstOnCart && loaded === 0 && !bags.some((b) => b.state === "drag") && (
              <g className="hand-hint" style={{ ["--hx" as string]: `${bottom[0] - firstOnCart.home[0]}px`, ["--hy" as string]: `${bottom[1] - firstOnCart.home[1]}px` }} transform={`translate(${firstOnCart.home[0]},${firstOnCart.home[1]}) scale(0.4)`}>
                <Hand />
              </g>
            )}
          </g>
        }
      />
      <Progress value={loaded / count} label="Gepäck" />
    </div>
  );
}

function BagSprite({ kind, color }: { kind: Bag["kind"]; color: string }) {
  const s = { stroke: OUT, strokeWidth: 1.6, strokeLinejoin: "round" as const };
  switch (kind) {
    case "koffer":
      return (
        <g {...s}>
          <path d="M-3,-20 v-3 h6 v3" fill="none" />
          <rect x={-8} y={-20} width={16} height={20} rx={3} fill={color} />
          <line x1={-3} y1={-20} x2={-3} y2={0} />
          <line x1={3} y1={-20} x2={3} y2={0} />
          <rect x={-5} y={-12} width={5} height={4} rx={1} fill="#fff" strokeWidth={1} />
        </g>
      );
    case "tasche":
      return (
        <g {...s}>
          <path d="M-6,-14 q6,-8 12,0" fill="none" />
          <rect x={-11} y={-14} width={22} height={13} rx={6} fill={color} />
          <line x1={-11} y1={-8} x2={11} y2={-8} stroke="#fff" strokeWidth={1.6} />
        </g>
      );
    case "truhe":
      return (
        <g {...s}>
          <rect x={-11} y={-16} width={22} height={15} rx={2} fill={color} />
          <path d="M-11,-11 h22" />
          <rect x={-8} y={-16} width={3} height={15} fill="#c9a24a" strokeWidth={1} />
          <rect x={5} y={-16} width={3} height={15} fill="#c9a24a" strokeWidth={1} />
          <rect x={-2} y={-12} width={4} height={4} fill="#ffd23a" strokeWidth={1} />
        </g>
      );
    case "rucksack":
      return (
        <g {...s}>
          <rect x={-7} y={-19} width={14} height={18} rx={6} fill={color} />
          <rect x={-5} y={-9} width={10} height={6} rx={2} fill="#fff" opacity={0.6} />
          <path d="M-3,-19 q3,-4 6,0" fill="none" />
        </g>
      );
  }
}
