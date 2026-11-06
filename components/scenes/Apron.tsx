"use client";
import { useEffect, useRef, useState } from "react";
import { BeltLoader, Stairs, planeGeometry, type Drawable } from "../art";
import { Icon } from "../icons";
import { IsoWorld, parkedPose, planeDrawable, waitingPose } from "../World";
import { GATE_COLORS, tool, type ToolId } from "@/game/data";
import { capture, P, clamp, gateY } from "@/game/iso";
import { PUSHBACK_END, pushbackPose } from "@/game/motion";
import { openTasks, readyForPushback, type GameState, type Plane } from "@/game/state";

export type Screen = "title" | "vorfeld" | "tower" | "weltkarte" | ToolId;

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

export function turnaroundProps(p: Plane): Drawable[] {
  const { g, y, stairsX, beltX } = servicePoints(p);
  return [
    { key: `stairs-${p.id}`, depth: stairsX + y + g.r + 3.5, node: <Stairs x={stairsX} y={y + g.r + 3.5} heading={Math.PI / 2} h={g.zc - 0.2} /> },
    { key: `belt-${p.id}`, depth: beltX + y + g.r + 5, node: <BeltLoader x={beltX} y={y + g.r + 5.5} heading={-Math.PI / 2} top={P(beltX, y + g.r * 0.9, g.zc - g.r * 0.4)} /> },
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

export function Apron({ state, onSelect, onOpen }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const selected = state.planes.find((p) => p.id === state.selected);
  const focus = (gate: number) => {
    const c = P(30, gateY(gate));
    return { x: c[0] + 60, y: c[1] - 40, zoom: 0.9 };
  };
  const [cam, setCam] = useState(() => focus(selected?.gate ?? 1));
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (!selected) return;
    const target = focus(selected.gate);
    let raf = 0;
    const step = () => {
      let done = false;
      setCam((c) => {
        const nx = c.x + (target.x - c.x) * 0.15;
        const ny = c.y + (target.y - c.y) * 0.15;
        done = Math.abs(nx - target.x) < 1 && Math.abs(ny - target.y) < 1;
        return { ...c, x: nx, y: ny };
      });
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [selected?.id, selected?.gate]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawables: Drawable[] = [];
  const bubbles: React.ReactNode[] = [];
  const bubbleR = 30 / cam.zoom;

  for (const p of state.planes) {
    const color = GATE_COLORS[p.gate];
    const pose = standingPose(p);
    let actions: { id: Screen; icon: string; label: string; color: string; pulse?: boolean }[] = [];
    if (p.stage === "anflug") {
      const c = P(30, gateY(p.gate), 6);
      bubbles.push(
        <Bubble key={p.id} at={c} r={bubbleR} title={`${p.flightNo} im Anflug`} color={color} actions={[{ id: "tower", icon: "radar", label: "Zum Tower", color: "#2c7a52", pulse: true }]} onOpen={(s) => onOpen(s, p.id)} onSelect={() => onSelect(p.id)} />,
      );
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
        <g onClick={() => onSelect(p.id)} style={{ cursor: "pointer" }}>
          {d.node}
        </g>
      ),
    });
    const g = planeGeometry(pose.x, pose.y, pose.heading, p.type);
    const c = P(pose.x, pose.y, g.zc + g.r + 9);
    bubbles.push(<Bubble key={p.id} at={c} r={bubbleR} title={p.flightNo} color={color} actions={actions} onOpen={(s) => onOpen(s, p.id)} onSelect={() => onSelect(p.id)} />);
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-bubble]")) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const ctm = svgRef.current?.getScreenCTM();
    if (!d || !ctm) return;
    const dx = (e.clientX - d.x) / ctm.a;
    const dy = (e.clientY - d.y) / ctm.d;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      d.moved = true;
      capture(svgRef.current, e.pointerId);
    }
    if (d.moved) setCam((c) => ({ ...c, x: clamp(d.cx - dx, -700, 1300), y: clamp(d.cy - dy, -100, 1250) }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className="scene"
      onWheel={(e) => setCam((c) => ({ ...c, zoom: clamp(c.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.55, 1.6) }))}
    >
      <IsoWorld
        svgRef={svgRef}
        className="fill"
        season={state.season}
        camera={cam}
        planes={state.planes}
        drawables={drawables}
        overlay={<g>{bubbles}</g>}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        label="Vorfeld mit drei Gates. Tippe auf die runden Knöpfe über den Flugzeugen."
      />
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
