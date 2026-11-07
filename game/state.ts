import { AIRCRAFT, AIRLINES, DESTINATIONS, HOME, LIVERIES, distanceKm, tool, type TaskId } from "./data.ts";

export type Stage = "anflug" | "einwinken" | "abfertigung" | "abflug";
export type Season = "sommer" | "winter";

export interface Plane {
  id: string;
  flightNo: string;
  dest: string;
  type: string;
  livery: string;
  gate: number;
  stage: Stage;
  done: TaskId[];
  radarAngle: number;
}

export interface FlightLog {
  id: string;
  flightNo: string;
  dest: string;
  type: string;
  livery: string;
  at: number;
}

export interface GameState {
  v: 1;
  season: Season;
  sound: boolean;
  planes: Plane[];
  log: FlightLog[];
  collected: string[];
  selected: string | null;
  seq: number;
}

export type Action =
  | { type: "spawn"; plane: Plane }
  | { type: "landed"; id: string }
  | { type: "parked"; id: string }
  | { type: "task"; id: string; task: TaskId }
  | { type: "pushed"; id: string }
  | { type: "departed"; id: string; at: number }
  | { type: "select"; id: string }
  | { type: "season"; season: Season }
  | { type: "sound"; on: boolean }
  | { type: "reset" };

export const GATES = 3;
const SAVE_KEY = "flughafen-startklar";

/** each job lists the tools that can do it: passengers board by bus or by finger */
export function requiredTasks(season: Season): TaskId[][] {
  const base: TaskId[][] = [["bus", "finger"], ["gepaeck"], ["tanken"]];
  return season === "winter" ? [...base, ["enteisung"]] : base;
}

export function openJobs(plane: Plane, season: Season): TaskId[][] {
  if (plane.stage !== "abfertigung") return [];
  return requiredTasks(season).filter((job) => !job.some((t) => plane.done.includes(t)));
}

export const openTasks = (plane: Plane, season: Season): TaskId[] => openJobs(plane, season).flat();

export function readyForPushback(plane: Plane, season: Season) {
  return plane.stage === "abfertigung" && openTasks(plane, season).length === 0;
}

export function todoText(plane: Plane | undefined, season: Season): string {
  if (!plane) return "Gleich kommt ein Flugzeug!";
  switch (plane.stage) {
    case "anflug":
      return "Im Anflug! Ab in den Tower!";
    case "einwinken":
      return "Gelandet! Jetzt einwinken!";
    case "abflug":
      return "Bereit zum Start! Ab zur Startbahn!";
    case "abfertigung": {
      const job = openJobs(plane, season)[0];
      if (!job) return "Startklar! Zurückschieben!";
      return job.length > 1 ? `${job.map((t) => tool(t).label).join(" oder ")}? Du hast die Wahl!` : tool(job[0]).todo;
    }
  }
}

export function initialState(): GameState {
  return {
    v: 1,
    season: "sommer",
    sound: true,
    planes: [
      { id: "p1", flightNo: "LH 204", dest: "BER", type: "A320", livery: LIVERIES[0], gate: 2, stage: "abfertigung", done: [], radarAngle: 0 },
      { id: "p2", flightNo: "JP 450", dest: "HND", type: "B787", livery: LIVERIES[1], gate: 0, stage: "anflug", done: [], radarAngle: 2.2 },
    ],
    log: [],
    collected: [],
    selected: "p1",
    seq: 3,
  };
}

export function freeGates(state: GameState) {
  return [...Array(GATES).keys()].filter((g) => !state.planes.some((p) => p.gate === g));
}

export function createPlane(state: GameState, rnd: () => number): Plane | null {
  const gates = freeGates(state);
  if (gates.length === 0) return null;
  const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length) % list.length];
  const busy = new Set(state.planes.map((p) => p.dest));
  const dest = pick(DESTINATIONS.filter((d) => !busy.has(d.id)));
  const longHaul = distanceKm(HOME.lat, HOME.lon, dest.lat, dest.lon) > 3000;
  const type = pick(AIRCRAFT.filter((a) => a.longHaul === longHaul));
  const used = new Set(state.planes.map((p) => p.flightNo));
  let flightNo = "";
  do flightNo = `${pick(AIRLINES)} ${100 + Math.floor(rnd() * 900)}`;
  while (used.has(flightNo));
  return {
    id: `p${state.seq}`,
    flightNo,
    dest: dest.id,
    type: type.id,
    livery: pick(LIVERIES),
    gate: gates[0],
    stage: "anflug",
    done: [],
    radarAngle: rnd() * Math.PI * 2,
  };
}

const update = (state: GameState, id: string, change: (p: Plane) => Partial<Plane>): GameState => ({
  ...state,
  planes: state.planes.map((p) => (p.id === id ? { ...p, ...change(p) } : p)),
});

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "spawn": {
      if (!freeGates(state).includes(action.plane.gate)) return state;
      const next = { ...state, planes: [...state.planes, action.plane], seq: state.seq + 1 };
      return next.selected ? next : { ...next, selected: action.plane.id };
    }
    case "landed":
      return update(state, action.id, (p) => (p.stage === "anflug" ? { stage: "einwinken" } : {}));
    case "parked":
      return update(state, action.id, (p) => (p.stage === "einwinken" ? { stage: "abfertigung" } : {}));
    case "task": {
      const job = requiredTasks("winter").find((j) => j.includes(action.task)) ?? [];
      return update(state, action.id, (p) =>
        p.stage === "abfertigung" && job.length > 0 && !job.some((t) => p.done.includes(t)) ? { done: [...p.done, action.task] } : {},
      );
    }
    case "pushed":
      return update(state, action.id, (p) => (readyForPushback(p, state.season) ? { stage: "abflug" } : {}));
    case "departed": {
      const plane = state.planes.find((p) => p.id === action.id);
      if (!plane) return state;
      const planes = state.planes.filter((p) => p.id !== action.id);
      return {
        ...state,
        planes,
        log: [...state.log, { id: plane.id, flightNo: plane.flightNo, dest: plane.dest, type: plane.type, livery: plane.livery, at: action.at }],
        collected: state.collected.includes(plane.type) ? state.collected : [...state.collected, plane.type],
        selected: state.selected === plane.id ? (planes[0]?.id ?? null) : state.selected,
      };
    }
    case "select":
      return state.planes.some((p) => p.id === action.id) ? { ...state, selected: action.id } : state;
    case "season":
      return { ...state, season: action.season };
    case "sound":
      return { ...state, sound: action.on };
    case "reset":
      return { ...initialState(), sound: state.sound };
  }
}

function isPlane(p: unknown): p is Plane {
  const o = p as Plane;
  return !!o && typeof o.id === "string" && typeof o.flightNo === "string" && typeof o.gate === "number" &&
    ["anflug", "einwinken", "abfertigung", "abflug"].includes(o.stage) && Array.isArray(o.done);
}

export function parseSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as GameState;
    if (data?.v !== 1 || !Array.isArray(data.planes) || !data.planes.every(isPlane) || !Array.isArray(data.log)) return null;
    const tasks = requiredTasks("winter").flat();
    return {
      ...initialState(),
      ...data,
      planes: data.planes.map((p) => ({ ...p, done: p.done.filter((t) => tasks.includes(t)) })),
      collected: Array.isArray(data.collected) ? data.collected : [],
    };
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  try {
    return parseSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function saveGame(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: the game keeps running without saving
  }
}
