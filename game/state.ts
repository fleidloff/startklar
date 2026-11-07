import { AIRCRAFT, AIRLINES, COUNTRIES, DESTINATIONS, HOME, LIVERIES, POST_LIVERY, aircraft, distanceKm, tool, type TaskId } from "./data.ts";

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
  round: Round;
  night: Night | null;
}

/** until: wall clock in milliseconds when the morning comes; post: the post plane of this night has not come yet */
export interface Night {
  until: number;
  post: boolean;
}

/** played: play time of this round; lastPlay: wall clock of the last counted moment; both in milliseconds */
export interface Round {
  played: number;
  lastPlay: number;
  departed: number;
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
  | { type: "tick"; now: number }
  | { type: "night"; on: boolean; now: number }
  | { type: "round"; now: number; planes: Plane[] }
  | { type: "reset" };

export const GATES = 3;
const SAVE_KEY = "flughafen-startklar";

const MINUTE = 60_000;
export const ARRIVALS_MS = 15 * MINUTE;
export const ROUND_MS = 20 * MINUTE;
export const PAUSE_MS = 20 * MINUTE;
export const NIGHT_MS = 5 * MINUTE;
/** a longer gap between two ticks is an interruption, not play time */
const MAX_TICK_MS = 15_000;

export const isPost = (p: Pick<Plane, "type">) => !!aircraft(p.type).freighter;

/** each job lists the tools that can do it: passengers board by bus or by finger, the post plane has no passengers */
export function requiredTasks(season: Season, plane?: Pick<Plane, "type">): TaskId[][] {
  const base: TaskId[][] = plane && isPost(plane) ? [["gepaeck"], ["tanken"]] : [["bus", "finger"], ["gepaeck"], ["tanken"]];
  return season === "winter" ? [...base, ["enteisung"]] : base;
}

export function openJobs(plane: Plane, season: Season): TaskId[][] {
  if (plane.stage !== "abfertigung") return [];
  return requiredTasks(season, plane).filter((job) => !job.some((t) => plane.done.includes(t)));
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
      if (job[0] === "gepaeck" && isPost(plane)) return "Pakete einladen!";
      return job.length > 1 ? `${job.map((t) => tool(t).label).join(" oder ")}? Du hast die Wahl!` : tool(job[0]).todo;
    }
  }
}

export function initialState(now = Date.now()): GameState {
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
    round: { played: 0, lastPlay: now, departed: 0 },
    night: null,
  };
}

export const roundOver = (state: GameState) => state.planes.length === 0 && state.round.played >= ROUND_MS;

export function mayArrive(state: GameState) {
  if (state.round.played < ARRIVALS_MS) return freeGates(state).length > 0;
  return state.planes.length === 0 && state.round.played < ROUND_MS;
}

export const pauseOver = (round: Round, now: number) => round.played > 0 && now - round.lastPlay >= PAUSE_MS;

/** minutes after midnight on the tower clock: every round starts at 11:40 */
export const clockMinutes = (played: number) => 11 * 60 + 40 + Math.floor(played / MINUTE);

function tickRound(state: GameState, now: number): Round {
  const r = state.round;
  if (now < r.lastPlay) return { ...r, lastPlay: now };
  if (roundOver(state)) return r;
  return { ...r, played: r.played + Math.min(now - r.lastPlay, MAX_TICK_MS), lastPlay: now };
}

/** one new plane for every free gate */
export function arrivals(state: GameState, rnd: () => number): Plane[] {
  const planes: Plane[] = [];
  for (let plane = createPlane(state, rnd); plane; plane = createPlane(state, rnd)) {
    planes.push(plane);
    state = reducer(state, { type: "spawn", plane });
  }
  return planes;
}

export function freeGates(state: GameState) {
  return [...Array(GATES).keys()].filter((g) => !state.planes.some((p) => p.gate === g));
}

export const isLongHaul = (d: { lat: number; lon: number }) => distanceKm(HOME.lat, HOME.lon, d.lat, d.lon) > 3000;

export function createPlane(state: GameState, rnd: () => number): Plane | null {
  const gates = freeGates(state);
  if (gates.length === 0) return null;
  const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length) % list.length];
  const post = !!state.night?.post;
  const busy = new Set(state.planes.map((p) => p.dest));
  const dest = pick(DESTINATIONS.filter((d) => !busy.has(d.id) && (!post || COUNTRIES[d.flag].continent === "Europa")));
  const type = post ? aircraft("B737F") : pick(AIRCRAFT.filter((a) => a.longHaul === isLongHaul(dest) && !a.freighter));
  const used = new Set(state.planes.map((p) => p.flightNo));
  let flightNo = "";
  do flightNo = `${post ? "Post" : pick(AIRLINES)} ${100 + Math.floor(rnd() * 900)}`;
  while (used.has(flightNo));
  return {
    id: `p${state.seq}`,
    flightNo,
    dest: dest.id,
    type: type.id,
    livery: post ? POST_LIVERY : pick(LIVERIES),
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
      const night = state.night && isPost(action.plane) ? { ...state.night, post: false } : state.night;
      const next = { ...state, planes: [...state.planes, action.plane], seq: state.seq + 1, night };
      return next.selected ? next : { ...next, selected: action.plane.id };
    }
    case "landed":
      return update(state, action.id, (p) => (p.stage === "anflug" ? { stage: "einwinken" } : {}));
    case "parked":
      return update(state, action.id, (p) => (p.stage === "einwinken" ? { stage: "abfertigung" } : {}));
    case "task":
      return update(state, action.id, (p) => {
        const job = requiredTasks("winter", p).find((j) => j.includes(action.task)) ?? [];
        return p.stage === "abfertigung" && job.length > 0 && !job.some((t) => p.done.includes(t)) ? { done: [...p.done, action.task] } : {};
      });
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
        round: { ...state.round, departed: state.round.departed + 1 },
      };
    }
    case "select":
      return state.planes.some((p) => p.id === action.id) ? { ...state, selected: action.id } : state;
    case "season":
      return { ...state, season: action.season };
    case "sound":
      return { ...state, sound: action.on };
    case "tick": {
      const round = tickRound(state, action.now);
      const night = state.night && action.now >= state.night.until ? null : state.night;
      return round === state.round && night === state.night ? state : { ...state, round, night };
    }
    case "night":
      if (action.on === !!state.night) return state;
      return { ...state, night: action.on ? { until: action.now + NIGHT_MS, post: true } : null };
    case "round":
      return action.planes.reduce((s, plane) => reducer(s, { type: "spawn", plane }), { ...state, round: { played: 0, lastPlay: action.now, departed: 0 } });
    case "reset": {
      const fresh = { ...initialState(), sound: state.sound, round: state.round };
      return state.round.played < ARRIVALS_MS ? fresh : { ...fresh, planes: [], selected: null };
    }
  }
}

function isPlane(p: unknown): p is Plane {
  const o = p as Plane;
  return !!o && typeof o.id === "string" && typeof o.flightNo === "string" && typeof o.gate === "number" &&
    ["anflug", "einwinken", "abfertigung", "abflug"].includes(o.stage) && Array.isArray(o.done);
}

const isRound = (r: unknown): r is Round =>
  !!r && [(r as Round).played, (r as Round).lastPlay, (r as Round).departed].every((n) => Number.isFinite(n) && n >= 0);

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
      round: isRound(data.round) ? data.round : initialState().round,
      night: null,
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
