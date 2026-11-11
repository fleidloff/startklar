"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BeltLoader, Bus, Stairs, planeGeometry, type Drawable } from "../art";
import { Icon } from "../icons";
import { RoundButton } from "../ui";
import { IsoWorld, parkedPose, planeDrawable, waitingPose } from "../World";
import { GATE_COLORS, HOME, aircraft, tool, type ToolId } from "@/game/data";
import { capture, P, clamp, gateY, svgPoint } from "@/game/iso";
import { PUSHBACK_END, pushbackPose } from "@/game/motion";
import { openTasks, readyForPushback, type GameState, type Plane } from "@/game/state";

export type Screen = "title" | "vorfeld" | "tower" | "weltkarte" | "parkplatz" | ToolId;

interface Props {
  state: GameState;
  onSelect: (id: string) => void;
  onOpen: (screen: Screen, planeId?: string) => void;
}

export function servicePoints(p: Pick<Plane, "gate" | "type">) {
  const pose = parkedPose(p);
  const g = planeGeometry(pose.x, pose.y, pose.heading, p.type);
  return { pose, g, y: gateY(p.gate), stairsX: pose.x + 0.36 * g.L, beltX: pose.x - 0.26 * g.L };
}

/** where the apron bus waits before its trip: at the outer edge of the stand, clear of every plane size */
export const busWait = (gate: number) => ({ x: 56, y: gateY(gate) + 44, heading: -Math.PI / 2 });

export function turnaroundProps(p: Plane, waitingBus = true): Drawable[] {
  const { g, y, stairsX, beltX } = servicePoints(p);
  return [
    { key: `stairs-${p.id}`, depth: stairsX + y + g.r + 3.5, node: <Stairs x={stairsX} y={y + g.r + 3.5} heading={Math.PI / 2} h={g.zc - 0.2} /> },
    { key: `belt-${p.id}`, depth: beltX + y + g.r + 5, node: <BeltLoader x={beltX} y={y + g.r + 5.5} heading={-Math.PI / 2} top={P(beltX, y + g.r * 0.9, g.zc - g.r * 0.4)} /> },
    ...(!waitingBus || p.done.some((t) => t === "bus" || t === "finger") ? [] : [{ key: `bus-${p.id}`, depth: busWait(p.gate).x + busWait(p.gate).y, node: <Bus {...busWait(p.gate)} /> }]),
  ];
}

/** other planes standing around, as backdrop for the close-up minigames */
export function otherPlanes(state: GameState, exclude: string): Drawable[] {
  const list: Drawable[] = [];
  for (const p of state.planes) {
    if (p.id === exclude || p.stage === "anflug") continue;
    const snow = state.season === "winter" && p.stage === "abfertigung" && !p.done.includes("enteisung") ? 1 : 0;
    list.push(planeDrawable(p, standingPose(p), { snow }));
    if (p.stage === "abfertigung") list.push(...turnaroundProps(p));
  }
  return list;
}

export function standingPose(p: Plane) {
  if (p.stage === "einwinken") return waitingPose(p);
  if (p.stage === "abflug") return pushbackPose(p.gate, p.type, PUSHBACK_END);
  return parkedPose(p);
}

type Cam = { x: number; y: number; zoom: number };

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 3.2;

/** close-up on a gate: the plane fills about half of the screen width, a little below the banner */
const focus = (p?: Plane): Cam => {
  const t = aircraft(p?.type ?? "A320");
  const zoom = clamp((2.2 * 66) / (t.gameLength + t.gameSpan), 1.5, 2.3);
  const pose = p ? standingPose(p) : parkedPose({ gate: 0, type: t.id });
  const c = P(pose.x, pose.y, t.radius);
  return { x: c[0], y: c[1] - 60 / zoom, zoom };
};

const fit = (c: Cam): Cam => ({ x: clamp(c.x, -1400, 1700), y: clamp(c.y, -300, 1500), zoom: clamp(c.zoom, ZOOM_MIN, ZOOM_MAX) });

export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Apron({ state, onSelect, onOpen }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const selected = state.planes.find((p) => p.id === state.selected);
  const [cam, setCam] = useState(() => focus(selected));
  const camRef = useRef(cam);
  const raf = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pinch = useRef<{ d: number; mid: { x: number; y: number }; cam: Cam; a: number } | null>(null);

  const move = (c: Cam) => {
    camRef.current = fit(c);
    setCam(camRef.current);
  };
  const stopGlide = () => cancelAnimationFrame(raf.current);
  const glide = (goal: Cam) => {
    stopGlide();
    goal = fit(goal);
    if (reducedMotion()) return move(goal);
    const step = () => {
      const c = camRef.current;
      const next = { x: c.x + (goal.x - c.x) * 0.15, y: c.y + (goal.y - c.y) * 0.15, zoom: c.zoom * (goal.zoom / c.zoom) ** 0.15 };
      const done = Math.abs(next.x - goal.x) < 1 && Math.abs(next.y - goal.y) < 1 && Math.abs(next.zoom - goal.zoom) < 0.005;
      move(done ? goal : next);
      if (!done) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (selected) glide(focus(selected));
    return stopGlide;
  }, [selected?.id, selected?.gate, selected?.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sceneRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;
    // native, non-passive: React wheel listeners are passive, so a trackpad pinch would zoom the whole page
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopGlide();
      const c = camRef.current;
      const scale = svg.getScreenCTM()?.a ?? 1;
      const px = e.deltaMode === 1 ? 16 : 1;
      if (e.ctrlKey || e.metaKey) {
        const p = svgPoint(svg, e.clientX, e.clientY);
        const k = c.zoom / clamp(c.zoom * Math.exp(-e.deltaY * px * 0.01), ZOOM_MIN, ZOOM_MAX);
        move({ x: p[0] - (p[0] - c.x) * k, y: p[1] - (p[1] - c.y) * k, zoom: c.zoom / k });
      } else {
        move({ ...c, x: c.x + (e.deltaX * px) / scale, y: c.y + (e.deltaY * px) / scale });
      }
    };
    const block = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", block);
    el.addEventListener("gesturechange", block);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", block);
      el.removeEventListener("gesturechange", block);
    };
  }, []);
  const zoomButton = (f: number) => glide({ ...camRef.current, zoom: camRef.current.zoom * f });

  const { drawables, marks } = useMemo(() => {
    const drawables: Drawable[] = [];
    const marks: (Omit<BubbleProps, "r"> & { id: string })[] = [];
    for (const p of state.planes) {
      const color = GATE_COLORS[p.gate];
      const pose = standingPose(p);
      const open = (s: Screen) => onOpen(s, p.id);
      const select = () => onSelect(p.id);
      let actions: BubbleProps["actions"] = [];
      if (p.stage === "anflug") {
        marks.push({ id: p.id, at: P(30, gateY(p.gate), 6), title: `${p.flightNo} im Anflug`, color, actions: [{ id: "tower", icon: "radar", label: "Zum Tower", color: "#2c7a52", pulse: true }], onOpen: open, onSelect: select });
        continue;
      }
      if (p.stage === "einwinken") {
        actions = [{ id: "einwinker", icon: "einwinker", label: "Einwinken", color: tool("einwinker").color, pulse: true }];
      } else if (p.stage === "abfertigung") {
        drawables.push(...turnaroundProps(p));
        actions = openTasks(p, state.season).map((t) => ({ id: t, icon: t, label: tool(t).label, color: tool(t).color }));
        if (readyForPushback(p, state.season)) actions = [{ id: "pushback", icon: "pushback", label: "Zurückschieben", color: tool("pushback").color, pulse: true }];
      } else if (p.stage === "abflug") {
        actions = [{ id: "start", icon: "start", label: "Start", color: tool("start").color, pulse: true }];
      }
      const snow = state.season === "winter" && p.stage === "abfertigung" && !p.done.includes("enteisung") ? 1 : 0;
      const d = planeDrawable(p, pose, { snow, selected: p.id === state.selected });
      drawables.push({
        ...d,
        node: (
          <g onClick={select} style={{ cursor: "pointer" }}>
            {d.node}
          </g>
        ),
      });
      const g = planeGeometry(pose.x, pose.y, pose.heading, p.type);
      marks.push({ id: p.id, at: P(pose.x, pose.y, g.zc + g.r + 9), title: p.flightNo, color, actions, onOpen: open, onSelect: select });
    }
    return { drawables, marks };
  }, [state, onSelect, onOpen]);

  const bubbles = (zoom: number) => (
    <g>
      {marks.map(({ id, ...m }) => (
        <Bubble key={id} {...m} r={30 / zoom} />
      ))}
    </g>
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-bubble]")) return;
    if (e.isPrimary) pointers.current.clear();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopGlide();
    const svg = svgRef.current;
    const list = [...pointers.current.values()];
    if (list.length === 2 && svg) {
      const [a, b] = list;
      drag.current = null;
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam: camRef.current, a: svg.getScreenCTM()?.a ?? 1 };
      capture(svg, e.pointerId);
      return;
    }
    if (list.length === 1) drag.current = { x: e.clientX, y: e.clientY, cx: camRef.current.x, cy: camRef.current.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const svg = svgRef.current;
    const pz = pinch.current;
    if (pz && svg && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = (svg.parentElement ?? svg).getBoundingClientRect();
      const mx = rect.left + rect.width / 2;
      const my = rect.top + rect.height / 2;
      const zoom = clamp((pz.cam.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pz.d, ZOOM_MIN, ZOOM_MAX);
      const a1 = (pz.a * zoom) / pz.cam.zoom;
      const wx = pz.cam.x + (pz.mid.x - mx) / pz.a;
      const wy = pz.cam.y + (pz.mid.y - my) / pz.a;
      move({ x: wx - ((a.x + b.x) / 2 - mx) / a1, y: wy - ((a.y + b.y) / 2 - my) / a1, zoom });
      return;
    }
    const d = drag.current;
    const ctm = svg?.getScreenCTM();
    if (!d || !ctm) return;
    const dx = (e.clientX - d.x) / ctm.a;
    const dy = (e.clientY - d.y) / ctm.d;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      d.moved = true;
      capture(svg!, e.pointerId);
    }
    if (d.moved) move({ ...camRef.current, x: d.cx - dx, y: d.cy - dy });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    drag.current = null;
    pinch.current = null;
  };

  return (
    <div className="scene" ref={sceneRef}>
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={cam}
        planes={state.planes}
        drawables={drawables}
        overlay={bubbles}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        label={`Vorfeld am Flughafen ${HOME.name} mit drei Gates. Tippe auf die runden Knöpfe über den Flugzeugen. Zwei Finger, Trackpad oder die Lupen-Knöpfe zoomen.`}
      />
      <div className="zoom-controls">
        <RoundButton icon="zoom-out" label="Weiter weg" color="#9ad0f0" size={78} dim={cam.zoom <= ZOOM_MIN + 0.01} onClick={() => zoomButton(1 / 1.4)} />
        <RoundButton icon="zoom-in" label="Näher ran" color="#9ad0f0" size={78} dim={cam.zoom >= ZOOM_MAX - 0.01} onClick={() => zoomButton(1.4)} />
      </div>
    </div>
  );
}

interface BubbleProps {
  at: [number, number];
  r: number;
  title: string;
  color: string;
  actions: { id: Screen; icon: string; label: string; color: string; pulse?: boolean }[];
  onOpen: (s: Screen) => void;
  onSelect: () => void;
}

function Bubble({ at, r, title, color, actions, onOpen, onSelect }: BubbleProps) {
  const gap = r * 2.3;
  const x0 = at[0] - ((actions.length - 1) * gap) / 2;
  const tagW = Math.max(r * 3.6, title.length * r * 0.42 + r * 1.2);
  return (
    <g data-bubble>
      <g role="button" tabIndex={0} aria-label={`Flug ${title} auswählen`} onClick={onSelect} onKeyDown={(e) => e.key === "Enter" && onSelect()} style={{ cursor: "pointer" }}>
        <rect x={at[0] - tagW / 2} y={at[1] - r * 3.3} width={tagW} height={r * 1.1} rx={r * 0.4} fill="#fbf0cf" stroke="#26303f" strokeWidth={r * 0.1} />
        <rect x={at[0] - tagW / 2} y={at[1] - r * 3.3} width={r * 0.5} height={r * 1.1} rx={r * 0.2} fill={color} stroke="#26303f" strokeWidth={r * 0.1} />
        <text x={at[0] + r * 0.2} y={at[1] - r * 2.5} textAnchor="middle" fontSize={r * 0.72} fontWeight={700} fill="#26303f">
          {title}
        </text>
      </g>
      {actions.map((a, i) => (
        <g
          key={a.id}
          role="button"
          tabIndex={0}
          aria-label={a.label}
          className={a.pulse ? "pulse-svg" : undefined}
          style={{ cursor: "pointer", transformOrigin: `${x0 + i * gap}px ${at[1] - r}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(a.id);
          }}
          onKeyDown={(e) => e.key === "Enter" && onOpen(a.id)}
        >
          <path d={`M${x0 + i * gap - r * 0.35},${at[1] - r * 0.2} L${x0 + i * gap},${at[1] + r * 0.5} L${x0 + i * gap + r * 0.35},${at[1] - r * 0.2} Z`} fill="#fff" stroke="#26303f" strokeWidth={r * 0.1} strokeLinejoin="round" />
          <circle cx={x0 + i * gap} cy={at[1] - r} r={r} fill="#fff" stroke="#26303f" strokeWidth={r * 0.1} />
          <circle cx={x0 + i * gap} cy={at[1] - r} r={r * 0.82} fill={a.color} stroke="#26303f" strokeWidth={r * 0.08} />
          <g transform={`translate(${x0 + i * gap - r * 0.6},${at[1] - r * 1.6}) scale(${(r * 1.2) / 56})`}>
            <Icon name={a.icon} size={56} />
          </g>
        </g>
      ))}
    </g>
  );
}
