import { aircraft } from "./data.ts";
import { arc, gateY, makePath, type Path, type Pt } from "./iso.ts";

export interface Pose {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const paths = new Map<string, Path>();
const cached = (key: string, build: () => Pt[]) => {
  let p = paths.get(key);
  if (!p) paths.set(key, (p = makePath(build())));
  return p;
};

/** centre line of the taxiway between apron and runway */
export const TAXIWAY_X = 80;

/** nose path while being pushed back: out of the stand, turning tail-first onto the taxiway, clear of the neighbour stands */
export const pushbackPath = (gate: number) =>
  cached(`push${gate}`, () => {
    const y = gateY(gate);
    return [[8, y], [TAXIWAY_X - 18, y], ...arc(TAXIWAY_X - 18, y + 18, 18, -Math.PI / 2, 0, 14).slice(1), [TAXIWAY_X, y + 140]];
  });

export const PUSHBACK_END = TAXIWAY_X - 18 - 8 + (Math.PI / 2) * 18;

export function pushbackPose(gate: number, type: string, s: number): Pose {
  const path = pushbackPath(gate);
  const L = aircraft(type).gameLength;
  const nose = path.at(s);
  const back = path.at(s + L * 0.7);
  const heading = Math.atan2(nose.y - back.y, nose.x - back.x);
  return { x: nose.x - (Math.cos(heading) * L) / 2, y: nose.y - (Math.sin(heading) * L) / 2, z: 0, heading };
}

export interface Wind {
  /** direction the wind blows to, in world radians like a heading */
  angle: number;
  /** 0 calm to 1 strong */
  strength: number;
  turning: boolean;
}

export const WIND_HOLD_MS = 150_000;
export const WIND_TURN_MS = 8_000;

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
};
const settled = (slot: number) => ({ angle: hash(slot) * Math.PI * 2, strength: 0.35 + 0.65 * hash(slot + 7919) });

/** the wind holds for a few minutes, then turns within a few seconds; it depends only on the wall clock */
export function windAt(now: number): Wind {
  const slot = Math.floor(now / WIND_HOLD_MS);
  const to = settled(slot);
  const into = now - slot * WIND_HOLD_MS;
  if (into >= WIND_TURN_MS) return { ...to, turning: false };
  const from = settled(slot - 1);
  const k = into / WIND_TURN_MS;
  const e = k * k * (3 - 2 * k);
  const turn = ((((to.angle - from.angle + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return { angle: from.angle + turn * e, strength: from.strength + (to.strength - from.strength) * e, turning: true };
}
