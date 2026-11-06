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

/** nose path while being pushed back: out of the stand, turning tail-first onto the taxi lane */
export const pushbackPath = (gate: number) =>
  cached(`push${gate}`, () => {
    const y = gateY(gate);
    return [[8, y], [30, y], ...arc(30, y + 18, 18, -Math.PI / 2, 0, 14).slice(1), [48, y + 140]];
  });

export const PUSHBACK_END = 22 + (Math.PI / 2) * 18;

export function pushbackPose(gate: number, type: string, s: number): Pose {
  const path = pushbackPath(gate);
  const L = aircraft(type).gameLength;
  const nose = path.at(s);
  const back = path.at(s + L * 0.7);
  const heading = Math.atan2(nose.y - back.y, nose.x - back.x);
  return { x: nose.x - (Math.cos(heading) * L) / 2, y: nose.y - (Math.sin(heading) * L) / 2, z: 0, heading };
}

const departurePath = (gate: number) =>
  cached(`dep${gate}`, () => {
    const y = gateY(gate);
    return [
      [48, y + 18],
      [48, -25],
      ...arc(62, -25, 14, Math.PI, Math.PI * 1.5, 8).slice(1),
      [106, -39],
      ...arc(106, -53, 14, Math.PI / 2, 0, 8).slice(1),
      [120, -1200],
    ];
  });

const TAXI = 30;
const ACC = 14;
const CLIMB_AFTER = 160;

function runwayStart(gate: number) {
  const y = gateY(gate);
  return y + 18 + 25 + Math.PI * 14 + 44;
}

export function departureDuration(gate: number) {
  const taxiTime = runwayStart(gate) / TAXI;
  const roll = 420;
  return taxiTime + (-TAXI + Math.sqrt(TAXI * TAXI + 2 * ACC * roll)) / ACC;
}

export function departurePose(gate: number, type: string, t: number): Pose {
  const path = departurePath(gate);
  const sr = runwayStart(gate);
  const taxiTime = sr / TAXI;
  const s = t < taxiTime ? t * TAXI : sr + TAXI * (t - taxiTime) + 0.5 * ACC * (t - taxiTime) ** 2;
  const L = aircraft(type).gameLength;
  const nose = path.at(s);
  const ahead = path.at(s + 2);
  const heading = Math.atan2(ahead.y - nose.y, ahead.x - nose.x) || -Math.PI / 2;
  const z = Math.max(0, (s - sr - CLIMB_AFTER) * 0.22);
  return { x: nose.x - (Math.cos(heading) * L) / 2, y: nose.y - (Math.sin(heading) * L) / 2, z, heading };
}
