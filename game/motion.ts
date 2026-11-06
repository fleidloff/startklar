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
