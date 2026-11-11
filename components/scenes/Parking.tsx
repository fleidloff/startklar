"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Bright, Car, Cover, Cylinder, FaceText, Glow, LIGHT, Lamp, Lights, OUT, Passenger, SnowPlow, type Drawable } from "../art";
import { Patterns } from "../World";
import { reducedMotion } from "./Apron";
import { Hand } from "./Tower";
import { FLAGS } from "../ui";
import { CARS, HOME, SPACES, colorName, destination, familySize, type CarKind } from "@/game/data";
import { K, P, capture, clamp, clock, makePath, pts, svgPoint, unproject, viewBox, type Path, type Pt } from "@/game/iso";
import { sfx } from "@/game/sound";
import { nextCar, roomFor, visitFree, type Action, type GameState } from "@/game/state";

const LANE = 3.5;
const ROW = 7;
const SMALL = 3.4;
const IN_X = 1.75;
const OUT_X = -1.75;
const GATE_Y = 17;
const WAIT: Pt = [IN_X, 22];
const STOP: Pt = [0.6, 4];
const DOOR: Pt = [0, -15.2];
const ROAD_END = 80;
const SPEED = 14;
const WALK = 3.2;
const NEXT_MS = 2000;
const VISIT_CARS = 3;
const HONK_MS = 8000;
const BARRIER_MS = 2600;
const SIGN: Pt = [-LANE - 4, GATE_Y + 5];
const PLOW_HOME = { x: -7, y: -10, heading: 0 };
const CAMERA = { x: 0, y: -50, zoom: 2.4 };

interface Place {
  kind: CarKind;
  x: number;
  y: number;
  w: number;
  heading: number;
  /** +1 for the front row, -1 for the back row */
  side: 1 | -1;
}

const PLACES: Place[] = (() => {
  const next = [12, 12];
  return SPACES.map((kind, i) => {
    const row = i < 5 ? 0 : 1;
    const w = kind === "camper" ? SMALL * 2 : SMALL;
    const y = next[row] - w / 2;
    next[row] -= w;
    const side = row === 0 ? -1 : 1;
    return { kind, x: side * (LANE + ROW / 2), y, w, heading: row === 0 ? Math.PI : 0, side };
  });
})();

const inPlace = (p: Place, [x, y]: Pt) => Math.abs(x - p.x) < ROW / 2 && Math.abs(y - p.y) < p.w / 2;

interface Move {
  path: Path;
  t0: number;
  ms: number;
  h0: number;
  h1: number | null;
}

function move(points: Pt[], t0: number, opts: { ms?: number; h0?: number; h1?: number } = {}): Move {
  const path = makePath(points);
  const ms = reducedMotion() ? 0 : (opts.ms ?? (path.length / SPEED) * 1000);
  return { path, t0, ms, h0: opts.h0 ?? 0, h1: opts.h1 ?? null };
}

const done = (m: Move, t: number) => t >= m.t0 + m.ms;

function poseAt(m: Move, t: number) {
  const k = m.ms <= 0 ? 1 : clamp((t - m.t0) / m.ms, 0, 1);
  const e = 1 - (1 - k) ** 2;
  const q = m.path.at(e * m.path.length);
  const heading = m.h1 === null ? q.angle : m.h0 + (m.h1 - m.h0) * e;
  return { x: q.x, y: q.y, heading };
}

/** the shorter way round from a to b */
const turn = (a: number, b: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));

type Phase = "arrive" | "gate" | "enter" | "lane" | "drag" | "roll" | "back";

interface Incoming {
  plane: string | null;
  kind: CarKind;
  color: string;
  phase: Phase;
  pos: Pt;
  heading: number;
  move: Move | null;
  spot?: number;
  grab?: Pt;
  wiggle?: number;
}

interface Scene {
  car: Incoming | null;
  leaving: { key: number; kind: CarKind; color: string; move: Move }[];
  /** color: null for a visitor, who wears no family colour and carries no suitcase */
  families: { key: number; color: string | null; n: number; path: Path; t0: number }[];
  barrier: number;
  plow: { pos: Pt; heading: number; grab: Pt } | null;
  wait: number;
}

interface Props {
  state: GameState;
  dispatch: (action: Action) => void;
  setHint: (text: string | null) => void;
  onFlight: (planeId: string | null) => void;
  onFull: () => void;
}

export function Parking({ state, dispatch, setHint, onFlight, onFull }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scene, setScene] = useState<Scene>(() => ({ car: null, leaving: [], families: [], barrier: 0, plow: null, wait: 0 }));
  const sceneRef = useRef(scene);
  const gameRef = useRef(state);
  const keyRef = useRef(0);
  const carsRef = useRef(0);
  const fullRef = useRef(false);
  const [since] = useState(() => Date.now());
  const [now, setNow] = useState(0);
  const winter = state.season === "winter";

  useEffect(() => {
    gameRef.current = state;
  });

  const update = (change: (s: Scene) => Scene) => {
    sceneRef.current = change(sceneRef.current);
    setScene(sceneRef.current);
  };

  const { car } = scene;
  const freeCount = state.lot.filter((s) => !s.car).length;
  const fits = (i: number) => !!car && SPACES[i] === car.kind && !state.lot[i].car;
  const parkable = (i: number) => fits(i) && !state.lot[i].snow;
  const snowBlocked = (car?.phase === "lane" || car?.phase === "drag") && SPACES.every((_, i) => !parkable(i)) && SPACES.some((_, i) => fits(i));

  const spawn = () => {
    const game = gameRef.current;
    const done = carsRef.current >= VISIT_CARS;
    const next = done ? null : nextCar(game, Math.random, since);
    if (!next) {
      onFlight(null);
      setHint(game.planes.length ? "Der Parkplatz ist voll! Jetzt warten die Flugzeuge auf dich." : null);
      if (done && !fullRef.current) {
        fullRef.current = true;
        onFull();
      }
      return;
    }
    carsRef.current++;
    const t = clock();
    const room = roomFor(game, next.kind, since)!;
    const out = room.leave ? game.lot[room.spot].car : null;
    if (room.leave) dispatch({ type: "leave", spot: room.spot });
    const place = PLACES[room.spot];
    onFlight(next.plane);
    if (sceneRef.current.families.length === 0) setHint("Ein Auto kommt zum Parkplatz!");
    update((s) => ({
      ...s,
      leaving: out ? [...s.leaving, { key: keyRef.current++, kind: out.kind, color: out.color, move: move([[place.x, place.y], [OUT_X, place.y], [OUT_X, ROAD_END]], t) }] : s.leaving,
      car: { ...next, phase: "arrive", pos: [IN_X, ROAD_END], heading: -Math.PI / 2, move: move([[IN_X, ROAD_END], WAIT], t, { ms: reducedMotion() ? 0 : 2200 }) },
    }));
  };

  useEffect(() => {
    dispatch({ type: "visit", free: visitFree(gameRef.current, Math.random) });
  }, [dispatch]);

  const idle = !car;
  useEffect(() => {
    if (!idle) return;
    const t = setTimeout(spawn, Math.max(400, sceneRef.current.wait - clock()));
    return () => clearTimeout(t);
  }, [idle, state.planes, state.lot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => onFlight(null), [onFlight]);

  const phase = car?.phase;
  useEffect(() => {
    if (!car) return;
    if (phase === "gate") setHint("Tipp die Schranke!");
    else if (phase === "lane") setHint(snowBlocked ? "Erst Schnee räumen! Zieh den Schneepflug über den Platz." : `${CARS[car.kind].name} braucht ${CARS[car.kind].space}!`);
  }, [phase, snowBlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "gate") return;
    const t = setTimeout(() => sfx.honk(), HONK_MS);
    return () => clearTimeout(t);
  }, [phase, car?.plane, car?.color]);

  const park = (spot: number, t: number) => {
    const s = sceneRef.current;
    const c = s.car!;
    const place = PLACES[spot];
    const game = gameRef.current;
    const plane = game.planes.find((p) => p.id === c.plane);
    dispatch({ type: "park", spot, kind: c.kind, color: c.color, plane: c.plane, at: Date.now() });
    sfx.success();
    setHint(plane ? `Familie ${colorName(c.color)} fliegt nach ${destination(plane.dest).city}!` : "Gut geparkt! Der Besuch holt jemanden vom Flugzeug ab.");
    const walk = place.side * (LANE + ROW + 1.7);
    update((x) => ({
      ...x,
      car: null,
      wait: t + NEXT_MS,
      families: [...x.families, { key: keyRef.current++, color: c.plane ? c.color : null, n: c.plane ? familySize(c.color) : 1, path: makePath([[place.side * (LANE + ROW + 0.4), place.y], [walk, place.y], [walk, DOOR[1] - 0.1], DOOR]), t0: t }],
    }));
  };

  const finish = (t: number) => {
    const s = sceneRef.current;
    const c = s.car;
    if (c?.move && done(c.move, t)) {
      const end = poseAt(c.move, t);
      const pos: Pt = [end.x, end.y];
      if (c.phase === "roll") return park(c.spot!, t);
      const phaseAfter: Phase = c.phase === "arrive" ? "gate" : c.phase === "back" ? "lane" : "lane";
      update((x) => ({ ...x, car: { ...c, phase: phaseAfter, pos, heading: end.heading, move: null, wiggle: c.phase === "back" ? t : undefined } }));
    }
    const leaving = s.leaving.filter((l) => !done(l.move, t));
    const families = s.families.filter((f) => t < f.t0 + (f.path.length / WALK + (f.n - 1) * 0.4) * 1000);
    if (leaving.length !== s.leaving.length || families.length !== s.families.length) update((x) => ({ ...x, leaving, families }));
  };

  const busy =
    !!car?.move || scene.leaving.length > 0 || scene.families.length > 0 || now < scene.barrier + BARRIER_MS || (!!car?.wiggle && now < car.wiggle + 600);
  useEffect(() => {
    if (!busy) return;
    let raf = 0;
    const loop = () => {
      const t = clock();
      setNow(t);
      finish(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBarrier = () => {
    const c = sceneRef.current.car;
    if (c?.phase !== "gate") return;
    const t = clock();
    sfx.click();
    update((s) => ({ ...s, barrier: t, car: { ...c, phase: "enter", move: move([WAIT, [IN_X, 9], STOP], t + (reducedMotion() ? 0 : 450), { h0: c.heading, h1: -Math.PI / 2 }) } }));
    setNow(t);
  };

  const rollTo = (spot: number) => {
    const c = sceneRef.current.car!;
    const place = PLACES[spot];
    const t = clock();
    update((s) => ({ ...s, car: { ...c, phase: "roll", spot, grab: undefined, move: move([c.pos, [place.x, place.y]], t, { ms: 450, h0: c.heading, h1: turn(c.heading, place.heading) }) } }));
    setNow(t);
  };

  const rollBack = (text: string) => {
    const c = sceneRef.current.car!;
    const t = clock();
    sfx.oops();
    setHint(text);
    update((s) => ({ ...s, car: { ...c, phase: "back", grab: undefined, move: move([c.pos, STOP], t, { ms: 400, h0: c.heading, h1: turn(c.heading, -Math.PI / 2) }) } }));
    setNow(t);
  };

  const clear = (spot: number) => {
    if (!gameRef.current.lot[spot].snow) return;
    sfx.pop();
    dispatch({ type: "clear", spot });
  };

  const toWorld = (e: React.PointerEvent, z = 0): Pt => {
    const [sx, sy] = svgPoint(svgRef.current!, e.clientX, e.clientY);
    return unproject(sx, sy, z);
  };
  const near = (a: Pt, b: Pt, r: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) < r;

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sceneRef.current;
    const w = toWorld(e, 0.8);
    if (s.car?.phase === "lane" && near(w, s.car.pos, s.car.kind === "camper" ? 4.5 : 3.5)) {
      capture(svgRef.current, e.pointerId);
      sfx.click();
      update((x) => ({ ...x, car: { ...s.car!, phase: "drag", grab: [s.car!.pos[0] - w[0], s.car!.pos[1] - w[1]] } }));
      return;
    }
    if (winter && near(w, [PLOW_HOME.x, PLOW_HOME.y], 3)) {
      capture(svgRef.current, e.pointerId);
      sfx.click();
      update((x) => ({ ...x, plow: { pos: [PLOW_HOME.x, PLOW_HOME.y], heading: PLOW_HOME.heading, grab: [PLOW_HOME.x - w[0], PLOW_HOME.y - w[1]] } }));
    }
  };

  const drag = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = sceneRef.current;
    if (s.car?.phase === "drag" && s.car.grab) {
      const w = toWorld(e, 0.8);
      const pos: Pt = [clamp(w[0] + s.car.grab[0], -14, 14), clamp(w[1] + s.car.grab[1], -14, 14)];
      update((x) => ({ ...x, car: { ...s.car!, pos } }));
    } else if (s.plow) {
      const w = toWorld(e, 0.5);
      const pos: Pt = [clamp(w[0] + s.plow.grab[0], -14, 14), clamp(w[1] + s.plow.grab[1], -14, 20)];
      const dx = pos[0] - s.plow.pos[0];
      const dy = pos[1] - s.plow.pos[1];
      const heading = Math.hypot(dx, dy) > 0.3 ? Math.atan2(dy, dx) : s.plow.heading;
      update((x) => ({ ...x, plow: { ...s.plow!, pos, heading } }));
      PLACES.forEach((p, i) => inPlace(p, pos) && clear(i));
    }
  };

  const up = () => {
    const s = sceneRef.current;
    if (s.car?.phase === "drag") {
      const c = s.car;
      const spot = PLACES.findIndex((p) => inPlace(p, c.pos));
      const game = gameRef.current;
      if (spot >= 0 && SPACES[spot] === c.kind && !game.lot[spot].car && !game.lot[spot].snow) return rollTo(spot);
      if (spot >= 0 && SPACES[spot] === c.kind && game.lot[spot].snow) return rollBack("Hier liegt Schnee. Räum ihn erst mit dem Schneepflug weg!");
      return rollBack(spot >= 0 && SPACES[spot] === c.kind ? "Der Platz ist schon besetzt. Such einen freien Platz!" : `Passt nicht! ${CARS[c.kind].name} braucht ${CARS[c.kind].space}.`);
    }
    if (s.plow) update((x) => ({ ...x, plow: null }));
  };

  const drawables: Drawable[] = [];
  state.lot.forEach((spot, i) => {
    const p = PLACES[i];
    if (spot.car) drawables.push({ key: `car${i}`, depth: p.x + p.y, node: <Car x={p.x} y={p.y} heading={p.heading} kind={spot.car.kind} color={spot.car.color} /> });
    if (p.kind === "strom") {
      const x = p.side * (LANE + ROW + 0.5);
      drawables.push({ key: `post${i}`, depth: x + p.y, node: <Charger x={x} y={p.y} /> });
    }
  });
  for (const l of scene.leaving) {
    const q = poseAt(l.move, now);
    drawables.push({ key: `out${l.key}`, depth: q.x + q.y, node: <Car {...q} kind={l.kind} color={l.color} lights /> });
  }
  if (car) {
    const q = car.move ? poseAt(car.move, now) : { x: car.pos[0], y: car.pos[1], heading: car.heading };
    const shake = car.wiggle && now < car.wiggle + 600 ? Math.sin((now - car.wiggle) / 40) * 0.25 : 0;
    const x = q.x - Math.sin(q.heading) * shake;
    const y = q.y + Math.cos(q.heading) * shake;
    drawables.push({ key: "incoming", depth: car.phase === "drag" ? 99 : x + y, node: <Car x={x} y={y} heading={q.heading} kind={car.kind} color={car.color} lights /> });
  }
  for (const f of scene.families) {
    for (let i = 0; i < f.n; i++) {
      const s = ((now - f.t0) / 1000 - i * 0.4) * WALK;
      if (s < 0 || s > f.path.length) continue;
      const q = f.path.at(s);
      const at = P(q.x + (i % 2) * 0.5, q.y);
      drawables.push({
        key: `fam${f.key}-${i}`,
        depth: q.x + q.y + 0.1 * i,
        node: (
          <g transform={`translate(${at[0]},${at[1]}) scale(0.55) translate(${-at[0]},${-at[1]})`}>
            <Passenger at={at} seed={i + f.key} color={f.color ?? undefined} bag={!!f.color && i === 0} />
          </g>
        ),
      });
    }
  }
  const barrierUp = barrierLift(now - scene.barrier);
  const outUp = scene.leaving.some((l) => Math.abs(poseAt(l.move, now).y - GATE_Y) < 7) ? 1 : 0;
  drawables.push(
    { key: "terminal", depth: -22, node: <Terminal winter={winter} /> },
    { key: "in-barrier", depth: LANE + 0.5 + GATE_Y, node: <Barrier post={[LANE + 0.5, GATE_Y]} dir={-1} lift={barrierUp} /> },
    { key: "out-barrier", depth: -LANE - 0.5 + GATE_Y, node: <Barrier post={[-LANE - 0.5, GATE_Y]} dir={1} lift={outUp} /> },
    { key: "ticket", depth: LANE + 1.4 + GATE_Y + 2.4, node: <Ticket x={LANE + 1.4} y={GATE_Y + 2.4} /> },
    { key: "sign", depth: SIGN[0] + SIGN[1], node: <FreeSign at={SIGN} free={freeCount} /> },
    ...[[-LANE - ROW - 1.4, 2], [LANE + ROW + 1.4, -4], [-LANE - ROW - 1.4, -12]].map(([x, y]) => ({ key: `lamp${x}${y}`, depth: x + y, node: <Lantern x={x} y={y} /> })),
    ...BUSHES.map(([x, y], i) => ({ key: `bush${i}`, depth: x + y, node: <Bush x={x} y={y} winter={winter} /> })),
  );
  if (winter) {
    const plow = scene.plow ?? { pos: [PLOW_HOME.x, PLOW_HOME.y] as Pt, heading: PLOW_HOME.heading };
    drawables.push({ key: "plow", depth: scene.plow ? 98 : plow.pos[0] + plow.pos[1], node: <SnowPlow x={plow.pos[0]} y={plow.pos[1]} heading={plow.heading} /> });
  }
  drawables.sort((a, b) => a.depth - b.depth);

  const showTargets = car?.phase === "lane" || car?.phase === "drag";
  const carScreen = car ? P(car.pos[0], car.pos[1], 1.5) : null;
  const firstTarget = PLACES.findIndex((_, i) => parkable(i));
  const gateScreen = P(LANE + 0.5, GATE_Y, 1.5);
  const label = car
    ? `Parkplatz: ${CARS[car.kind].name} ${car.plane ? `von Familie ${colorName(car.color)}` : "vom Besuch"} ${phase === "gate" ? "wartet an der Schranke" : "wartet auf einen Platz"}.`
    : "Parkplatz vor dem Terminal";
  const freeText = freeCount ? `${freeCount === 1 ? "Ein Platz ist" : `${freeCount} Plätze sind`} frei.` : "Der Parkplatz ist voll.";

  return (
    <div className="scene">
      <svg
        ref={svgRef}
        className="fill"
        viewBox={viewBox(CAMERA.x, CAMERA.y, CAMERA.zoom)}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${label} ${freeText}`}
        onPointerDown={down}
        onPointerMove={drag}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <Lights>
          <Patterns />
          <Ground winter={winter} lot={state.lot} blink={snowBlocked ? car?.kind : undefined} />
          {drawables.map((d) => (d.key === "terminal" || d.key === "sign" ? <g key={d.key}>{d.node}</g> : <Cover key={d.key}>{d.node}</Cover>))}
        </Lights>
        {PLACES.map((p, i) => {
          const corners = pts([P(p.x - ROW / 2, p.y - p.w / 2), P(p.x + ROW / 2, p.y - p.w / 2), P(p.x + ROW / 2, p.y + p.w / 2), P(p.x - ROW / 2, p.y + p.w / 2)]);
          if (showTargets && parkable(i)) {
            return (
              <polygon
                key={i}
                points={corners}
                role="button"
                tabIndex={0}
                aria-label={`Freier ${CARS[p.kind].spaceName}, Platz ${i + 1}`}
                fill="rgba(76,187,108,0.2)"
                stroke="#4cbb6c"
                strokeWidth={4}
                strokeDasharray="10 7"
                className="dash-move"
                style={{ cursor: "pointer" }}
                onClick={() => car?.phase === "lane" && rollTo(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && car?.phase === "lane" && (e.preventDefault(), rollTo(i))}
              />
            );
          }
          if (winter && state.lot[i].snow) {
            return (
              <polygon
                key={i}
                points={corners}
                role="button"
                tabIndex={0}
                aria-label={`Schnee räumen auf Platz ${i + 1}`}
                fill="transparent"
                onClick={() => clear(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), clear(i))}
              />
            );
          }
          return null;
        })}
        {car?.phase === "gate" && (
          <g
            role="button"
            tabIndex={0}
            aria-label="Schranke öffnen"
            style={{ cursor: "pointer" }}
            onClick={openBarrier}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openBarrier())}
          >
            <g className="pulse-svg" style={{ transformOrigin: `${gateScreen[0]}px ${gateScreen[1]}px` }}>
              <circle cx={gateScreen[0]} cy={gateScreen[1]} r={34} fill="rgba(246,192,44,0.3)" stroke="#f6c02c" strokeWidth={5} />
            </g>
          </g>
        )}
        {car?.phase === "lane" && carScreen && firstTarget >= 0 && !snowBlocked && (
          <g pointerEvents="none" className="hand-hint" style={{ ["--hx" as string]: `${P(PLACES[firstTarget].x, PLACES[firstTarget].y)[0] - carScreen[0]}px`, ["--hy" as string]: `${P(PLACES[firstTarget].x, PLACES[firstTarget].y)[1] - carScreen[1]}px` }} transform={`translate(${carScreen[0]},${carScreen[1]}) scale(0.5)`}>
            <Hand />
          </g>
        )}
        {snowBlocked && !scene.plow && (() => {
          const goal = PLACES.findIndex((_, i) => fits(i));
          const from = P(PLOW_HOME.x, PLOW_HOME.y, 1.5);
          const to = P(PLACES[goal].x, PLACES[goal].y);
          return (
            <g pointerEvents="none" className="hand-hint" style={{ ["--hx" as string]: `${to[0] - from[0]}px`, ["--hy" as string]: `${to[1] - from[1]}px` }} transform={`translate(${from[0]},${from[1]}) scale(0.5)`}>
              <Hand />
            </g>
          );
        })()}
        {car?.phase === "gate" && (
          <Bubble at={P(WAIT[0], WAIT[1], car.kind === "camper" ? 4.2 : 3)} plane={state.planes.find((p) => p.id === car.plane)} />
        )}
      </svg>
    </div>
  );
}

function FreeSign({ at, free }: { at: Pt; free: number }) {
  const [sx, sy] = P(at[0], at[1], 4.2);
  return (
    <g>
      <Cylinder x={at[0]} y={at[1]} z0={0} z1={3.6} r={0.15} color="#9aa3ad" />
      <Bright>
        <rect x={sx - 44} y={sy - 15} width={88} height={30} rx={6} fill="#1d2026" stroke={OUT} strokeWidth={2.5} />
        <text x={sx} y={sy + 6} textAnchor="middle" fontSize={16} fontWeight={800} letterSpacing={1} fill={free ? "#5fe07a" : "#ff5a4a"}>
          {free ? `FREI ${free}` : "BESETZT"}
        </text>
      </Bright>
    </g>
  );
}

/** 0 closed … 1 open: up quickly, open while the car drives through, then down again */
function barrierLift(dt: number) {
  if (dt < 0 || dt > BARRIER_MS) return 0;
  return Math.min(1, dt / 350, (BARRIER_MS - dt) / 350);
}

const BUSHES: Pt[] = [[-9, 33], [-10.5, 27], [-13.5, 16], [12, 24], [14, 14], [-14.5, -6]];

/** painted on the ground: one local metre right along the row, one down towards the viewer */
const C = Math.cos(Math.PI / 6);
const groundMatrix = (x: number, y: number, s = 1) => {
  const [e, f] = P(x, y);
  return `matrix(${C * K * s},${-0.5 * K * s},${C * K * s},${0.5 * K * s},${e},${f})`;
};

const SYMBOLS: Record<CarKind, ReactNode> = {
  klein: (
    <g>
      <path d="M-1.4,0.3 v-0.55 l0.45,-0.1 l0.4,-0.55 h1.05 l0.5,0.55 l0.4,0.1 v0.55 z" />
      <circle cx={-0.75} cy={0.35} r={0.28} />
      <circle cx={0.8} cy={0.35} r={0.28} />
    </g>
  ),
  camper: (
    <g>
      <path d="M-2.2,0.35 v-1.5 h3.1 l0.9,0.8 v0.7 z" />
      <circle cx={-1.3} cy={0.4} r={0.32} />
      <circle cx={1.1} cy={0.4} r={0.32} />
    </g>
  ),
  strom: <path d="M0.25,-1.2 L-0.65,0.15 H-0.05 L-0.3,1.2 L0.65,-0.2 H0.05 Z" />,
};

function Ground({ winter, lot, blink }: { winter: boolean; lot: GameState["lot"]; blink?: CarKind }) {
  const grass = winter ? "#eef5fb" : "#8ccf55";
  const asphalt = winter ? "#6a6f77" : "#5c6168";
  const line = winter ? "#c9d2dc" : "#ffffff";
  const walkway = winter ? "#ffffff" : "#d9dfe6";
  const poly = (list: Pt[]) => pts(list.map(([x, y]) => P(x, y)));
  const seg = (a: Pt, b: Pt) => `M${P(...a).join(",")}L${P(...b).join(",")}`;
  let marks = "";
  for (const side of [-1, 1] as const) {
    const row = PLACES.filter((p) => p.side === side);
    const far = side * (LANE + ROW);
    for (const p of row) marks += seg([side * LANE, p.y + p.w / 2], [far, p.y + p.w / 2]);
    const last = row[row.length - 1];
    marks += seg([side * LANE, last.y - last.w / 2], [far, last.y - last.w / 2]);
    marks += seg([far, row[0].y + row[0].w / 2], [far, last.y - last.w / 2]);
  }
  return (
    <g>
      <polygon points={poly([[-90, -90], [90, -90], [90, 120], [-90, 120]])} fill={grass} />
      <polygon points={poly([[-90, -90], [90, -90], [90, 120], [-90, 120]])} fill={`url(#${winter ? "snowdots" : "grassdots"})`} />
      <polygon points={poly([[-LANE, 13], [LANE, 13], [LANE, 120], [-LANE, 120]])} fill={asphalt} />
      <polygon points={poly([[-LANE - ROW - 0.8, -14.6], [LANE + ROW + 0.8, -14.6], [LANE + ROW + 0.8, 13.5], [-LANE - ROW - 0.8, 13.5]])} fill={asphalt} stroke={OUT} strokeWidth={1.5} strokeOpacity={0.3} />
      {[-1, 1].map((side) => (
        <polygon key={side} points={poly([[side * (LANE + ROW + 0.8), -14.6], [side * (LANE + ROW + 2.6), -14.6], [side * (LANE + ROW + 2.6), 13.5], [side * (LANE + ROW + 0.8), 13.5]])} fill={walkway} stroke={OUT} strokeWidth={1.5} strokeOpacity={0.3} />
      ))}
      <polygon points={poly([[-20, -16], [20, -16], [20, -14.6], [-20, -14.6]])} fill={walkway} />
      <path d={seg([0, 13.5], [0, 120])} stroke={line} strokeWidth={3} strokeDasharray="22 18" />
      <path d={marks} stroke={line} strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d={seg([-LANE, GATE_Y - 0.4], [LANE, GATE_Y - 0.4])} stroke={line} strokeWidth={4} />
      {PLACES.map((p, i) => (
        <Bright key={i}>
          <g transform={groundMatrix(p.x + p.side * 0.6, p.y, 1.35)} fill={p.kind === "strom" ? "#4cbb6c" : line} opacity={0.9}>
            {SYMBOLS[p.kind]}
          </g>
        </Bright>
      ))}
      {lot.map((spot, i) => {
        if (!spot.snow) return null;
        const p = PLACES[i];
        const corners = poly([[p.x - ROW / 2 + 0.2, p.y - p.w / 2 + 0.2], [p.x + ROW / 2 - 0.2, p.y - p.w / 2 + 0.2], [p.x + ROW / 2 - 0.2, p.y + p.w / 2 - 0.2], [p.x - ROW / 2 + 0.2, p.y + p.w / 2 - 0.2]]);
        return (
          <g key={`snow${i}`} className={blink === p.kind ? "blink" : undefined}>
            <polygon points={corners} fill="#ffffff" stroke="#c4dcef" strokeWidth={3} strokeLinejoin="round" />
            <polygon points={corners} fill="url(#snowdots)" />
          </g>
        );
      })}
    </g>
  );
}

function Barrier({ post, dir, lift }: { post: Pt; dir: 1 | -1; lift: number }) {
  const a = (lift * Math.PI) / 2;
  const len = LANE - 0.6;
  const base = P(post[0], post[1], 1.2);
  const tip = P(post[0] + dir * len * Math.cos(a), post[1], 1.2 + len * Math.sin(a));
  return (
    <g>
      <Box x={post[0]} y={post[1]} l={0.7} w={0.7} h={1.5} color="#e9edf2" />
      <line x1={base[0]} y1={base[1]} x2={tip[0]} y2={tip[1]} stroke={OUT} strokeWidth={9} strokeLinecap="round" />
      <line x1={base[0]} y1={base[1]} x2={tip[0]} y2={tip[1]} stroke="#ffffff" strokeWidth={5.5} strokeLinecap="round" />
      <line x1={base[0]} y1={base[1]} x2={tip[0]} y2={tip[1]} stroke="#e8574a" strokeWidth={5.5} strokeDasharray="8 8" />
      <Glow at={P(post[0], post[1], 1.8)} r={1.6} color={lift > 0.5 ? LIGHT.green : LIGHT.red} />
    </g>
  );
}

function Ticket({ x, y }: { x: number; y: number }) {
  return (
    <Box x={x} y={y} l={0.8} w={0.9} h={1.7} color="#f6c02c" top="#5c6168">
      {(f) => (Math.abs(Math.cos(f.heading)) < 0.5 ? <polygon points={pts([f.at(0.25, 1), f.at(0.75, 1), f.at(0.75, 1.4), f.at(0.25, 1.4)])} fill="#26303f" /> : null)}
    </Box>
  );
}

function Charger({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Box x={x} y={y} l={0.6} w={0.8} h={1.6} color="#4cbb6c" top="#e9edf2" />
      <Glow at={P(x, y, 1.3)} r={1.2} color={LIGHT.green} />
    </g>
  );
}

function Lantern({ x, y }: { x: number; y: number }) {
  const pool = P(x, y);
  return (
    <g>
      <Cylinder x={x} y={y} z0={0} z1={6.5} r={0.18} color="#9aa3ad" />
      <Box x={x} y={y} l={0.9} w={0.9} h={0.4} z={6.5} color="#5c6168" />
      <Lamp>
        <ellipse cx={pool[0]} cy={pool[1]} rx={9 * K * 0.87} ry={9 * K * 0.5} fill={LIGHT.warm} opacity={0.14} />
      </Lamp>
      <Glow at={P(x, y, 6.3)} r={2.2} color={LIGHT.warm} />
    </g>
  );
}

function Bush({ x, y, winter }: { x: number; y: number; winter: boolean }) {
  const [cx, cy] = P(x, y, 0.8);
  return (
    <g stroke={OUT} strokeWidth={2}>
      <ellipse cx={cx} cy={cy + 6} rx={16} ry={6} fill="rgba(30,40,60,0.12)" stroke="none" />
      <circle cx={cx - 7} cy={cy} r={9} fill={winter ? "#7fae6a" : "#4f9a3a"} />
      <circle cx={cx + 7} cy={cy - 1} r={10} fill={winter ? "#8fbb78" : "#5fae44"} />
      <circle cx={cx} cy={cy - 8} r={10} fill={winter ? "#ffffff" : "#6fbf4f"} />
    </g>
  );
}

function Terminal({ winter }: { winter: boolean }) {
  return (
    <g>
      <Box x={0} y={-22} l={36} w={12} h={8} color="#d9dfe6" top={winter ? "#ffffff" : "#b8c2cc"}>
        {(f) =>
          Math.abs(Math.cos(f.heading)) > 0.5 ? (
            <g>
              {[[0.03, 0.43], [0.57, 0.97]].map(([s0, s1]) => (
                <g key={s0}>
                  <polygon points={pts([f.at(s0, 1), f.at(s1, 1), f.at(s1, 6.6), f.at(s0, 6.6)])} fill="url(#glass)" stroke={OUT} strokeWidth={2} />
                  <Lamp>
                    <polygon points={pts([f.at(s0, 1), f.at(s1, 1), f.at(s1, 6.6), f.at(s0, 6.6)])} fill="#ffeeb0" opacity={0.65} />
                  </Lamp>
                </g>
              ))}
              <polygon points={pts([f.at(0.45, 0), f.at(0.55, 0), f.at(0.55, 3.4), f.at(0.45, 3.4)])} fill="#3b5f80" stroke={OUT} strokeWidth={2} />
              <polyline points={pts([f.at(0.5, 0), f.at(0.5, 3.4)])} stroke="#9fd3f5" strokeWidth={2} fill="none" />
              <Lamp>
                <polygon points={pts([f.at(0.45, 0), f.at(0.55, 0), f.at(0.55, 3.4), f.at(0.45, 3.4)])} fill="#fff1b8" opacity={0.85} />
              </Lamp>
            </g>
          ) : null
        }
      </Box>
      <Bright>
        <polygon points={pts([P(4, -16, 3.8), P(-4, -16, 3.8), P(-4, -16, 5.4), P(4, -16, 5.4)])} fill="#f6c02c" stroke={OUT} strokeWidth={2.4} strokeLinejoin="round" />
        <FaceText at={P(0, -16, 4.15)} heading={0} size={15}>
          Abflug
        </FaceText>
        <FaceText at={P(0, -16, 8.4)} heading={0} size={20} fill="#f6c02c" stroke={OUT}>
          {`FLUGHAFEN ${HOME.name.toUpperCase()}`}
        </FaceText>
      </Bright>
    </g>
  );
}

function Bubble({ at, plane }: { at: Pt; plane?: GameState["planes"][number] }) {
  if (!plane) return null;
  const F = FLAGS[destination(plane.dest).flag];
  const w = 118;
  return (
    <g transform={`translate(${at[0]},${at[1] - 30})`} pointerEvents="none">
      <rect x={-w / 2} y={-18} width={w} height={32} rx={10} fill="#ffffff" stroke={OUT} strokeWidth={2.5} />
      <path d="M-7,13 L0,23 L7,13" fill="#ffffff" stroke={OUT} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M-8,11.5 h16" stroke="#ffffff" strokeWidth={3.5} />
      <F x={-w / 2 + 8} y={-11} width={27} height={18} />
      <rect x={-w / 2 + 8} y={-11} width={27} height={18} fill="none" stroke={OUT} strokeWidth={1.2} />
      <text x={16} y={4} textAnchor="middle" fontSize={16} fontWeight={700} fill={OUT}>
        {plane.flightNo}
      </text>
    </g>
  );
}
