import { test } from "node:test";
import assert from "node:assert/strict";
import { NIGHT_MS, arrivals, clockMinutes, createPlane, initialState, isPost, mayArrive, openTasks, parseSave, pauseOver, readyForPushback, reducer, roundOver, type GameState } from "./state.ts";
import { PUSHBACK_END, TAXIWAY_X, pushbackPose } from "./motion.ts";
import { AIRCRAFT, flightTime } from "./data.ts";

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test("a plane goes from radar to departure and lands in the log", () => {
  let s: GameState = initialState();
  const id = "p2";
  s = reducer(s, { type: "parked", id });
  assert.equal(s.planes.find((p) => p.id === id)!.stage, "anflug", "cannot park before landing");
  s = reducer(s, { type: "landed", id });
  s = reducer(s, { type: "parked", id });
  s = reducer(s, { type: "season", season: "winter" });
  const plane = () => s.planes.find((p) => p.id === id)!;
  assert.deepEqual(openTasks(plane(), s.season), ["bus", "finger", "gepaeck", "tanken", "enteisung"]);
  s = reducer(s, { type: "pushed", id });
  assert.equal(plane().stage, "abfertigung", "no pushback with open tasks");
  for (const task of openTasks(plane(), s.season)) s = reducer(s, { type: "task", id, task });
  s = reducer(s, { type: "pushed", id });
  assert.equal(plane().stage, "abflug");
  s = reducer(s, { type: "departed", id, at: 1 });
  assert.equal(s.planes.some((p) => p.id === id), false);
  assert.deepEqual(s.collected, ["B787"]);
  assert.equal(s.log[0].dest, "HND");
});

test("passengers board by bus or by finger, and one way closes the other", () => {
  for (const [first, second] of [["bus", "finger"], ["finger", "bus"]] as const) {
    let s = initialState();
    const plane = () => s.planes.find((p) => p.id === "p1")!;
    assert.deepEqual(openTasks(plane(), s.season).slice(0, 2), ["bus", "finger"]);
    s = reducer(s, { type: "task", id: "p1", task: first });
    assert.deepEqual(openTasks(plane(), s.season), ["gepaeck", "tanken"]);
    const before = s;
    s = reducer(s, { type: "task", id: "p1", task: second });
    assert.deepEqual(s.planes, before.planes, "the other way is closed");
    assert.deepEqual(parseSave(JSON.stringify(s))!.planes.find((p) => p.id === "p1")!.done, [first]);
  }
});

test("spawning fills free gates only and never duplicates flight numbers", () => {
  let s = initialState();
  const rnd = seeded(7);
  for (let i = 0; i < 5; i++) {
    const p = createPlane(s, rnd);
    if (p) s = reducer(s, { type: "spawn", plane: p });
  }
  assert.equal(s.planes.length, 3);
  assert.equal(new Set(s.planes.map((p) => p.gate)).size, 3);
  assert.equal(new Set(s.planes.map((p) => p.flightNo)).size, 3);
  assert.equal(createPlane(s, rnd), null);
});

test("saves are validated and a plane waiting for take-off stays on the taxiway", () => {
  assert.equal(parseSave("not json"), null);
  assert.equal(parseSave(JSON.stringify({ v: 2 })), null);
  const s = initialState();
  s.planes[0].stage = "abflug";
  const loaded = parseSave(JSON.stringify(s))!;
  assert.equal(loaded.planes.length, 2);
  assert.equal(loaded.planes[0].stage, "abflug");
  assert.equal(loaded.log.length, 0);
  const old = initialState();
  (old.planes[0].done as string[]).push("catering", "bus");
  assert.deepEqual(parseSave(JSON.stringify(old))!.planes[0].done, ["bus"], "removed tasks are dropped from old saves");
});

test("pushback ends on the taxiway, clear of the parked neighbours", () => {
  const longest = Math.max(...AIRCRAFT.map((t) => t.gameLength));
  for (const type of AIRCRAFT) {
    const end = pushbackPose(1, type.id, PUSHBACK_END);
    assert.ok(Math.abs(Math.sin(end.heading) + 1) < 0.05, "nose points along the taxiway");
    assert.ok(Math.abs(end.x - TAXIWAY_X) < 0.5, "fuselage on the taxiway centre line");
    assert.ok(end.x - type.gameSpan / 2 > 8 + longest, "wing tips clear of the tail of a parked neighbour");
  }
});

test("flight time is written in whole words", () => {
  const kmFor = (minutes: number) => ((minutes - 30) * 800) / 60;
  assert.equal(flightTime(kmFor(45)), "45 Minuten");
  assert.equal(flightTime(kmFor(61)), "1 Stunde 1 Minute");
  assert.equal(flightTime(kmFor(120)), "2 Stunden");
  assert.equal(flightTime(kmFor(135)), "2 Stunden 15 Minuten");
});

const MIN = 60_000;
const at = (minutes: number, planes: number): GameState => {
  const s = initialState(0);
  return { ...s, planes: arrivals({ ...s, planes: [] }, seeded(3)).slice(0, planes), round: { played: minutes * MIN, lastPlay: 0, departed: 0 } };
};

test("planes arrive for 15 minutes, then one at a time while the airport is empty before 20 minutes", () => {
  assert.equal(mayArrive(at(14, 2)), true);
  assert.equal(mayArrive(at(16, 1)), false);
  assert.equal(mayArrive(at(16, 0)), true);
  assert.equal(mayArrive(at(21, 0)), false);
  assert.equal(roundOver(at(21, 0)), true);
  assert.equal(roundOver(at(21, 1)), false);
});

test("play time counts only while playing, and a break of 20 minutes starts a new round", () => {
  let s = at(10, 1);
  s = reducer(s, { type: "tick", now: 1000 });
  assert.equal(s.round.played, 10 * MIN + 1000);
  s = reducer(s, { type: "tick", now: 1000 + 5 * MIN });
  assert.equal(s.round.played, 10 * MIN + 16_000, "a 5 minute break adds no play time");
  assert.equal(pauseOver(s.round, s.round.lastPlay + 19 * MIN), false);
  assert.equal(pauseOver(s.round, s.round.lastPlay + 20 * MIN), true);
  const fresh = reducer(s, { type: "round", now: 99, planes: arrivals(s, seeded(5)) });
  assert.deepEqual(fresh.round, { played: 0, lastPlay: 99, departed: 0 });
  assert.equal(fresh.planes.length, 3, "the old plane stays and two new ones fill the free gates");
});

test("the pause holds the clock and survives a reset, a backwards clock restarts it", () => {
  let s = at(21, 0);
  const pause = reducer(s, { type: "tick", now: 10 * MIN });
  assert.equal(pause, s, "nothing counts during the pause");
  s = reducer(s, { type: "reset" });
  assert.equal(roundOver(s), true);
  s = { ...s, round: { ...s.round, lastPlay: 30 * MIN } };
  s = reducer(s, { type: "tick", now: 25 * MIN });
  assert.equal(s.round.lastPlay, 25 * MIN);
  assert.equal(pauseOver(s.round, 44 * MIN), false);
});

test("a departure counts for the round and the save keeps the round", () => {
  let s = initialState(0);
  s = reducer(s, { type: "departed", id: "p1", at: 1 });
  assert.equal(s.round.departed, 1);
  assert.deepEqual(parseSave(JSON.stringify(s))!.round, s.round);
  const old = JSON.parse(JSON.stringify(s));
  delete old.round;
  assert.equal(parseSave(JSON.stringify(old))!.round.played, 0, "old saves start a fresh round");
  assert.equal(parseSave(JSON.stringify({ ...s, round: { played: "x" } }))!.round.played, 0);
});

test("the tower clock starts at 11:40 and passes noon after 20 minutes", () => {
  assert.equal(clockMinutes(0), 11 * 60 + 40);
  assert.equal(clockMinutes(20 * MIN), 12 * 60);
  assert.equal(clockMinutes(24 * MIN + 59_000), 12 * 60 + 4);
});

test("the night ends after 5 minutes or when the light goes off", () => {
  let s = reducer(at(5, 0), { type: "night", on: true, now: 1000 });
  assert.equal(s.night?.until, 1000 + NIGHT_MS);
  assert.ok(reducer(s, { type: "tick", now: 1000 + NIGHT_MS - 1 }).night);
  assert.equal(reducer(s, { type: "tick", now: 1000 + NIGHT_MS }).night, null);
  assert.equal(reducer(s, { type: "night", on: false, now: 2000 }).night, null);
  s = { ...s, round: { ...s.round, played: 30 * MIN } };
  assert.equal(reducer(s, { type: "tick", now: 1000 + NIGHT_MS }).night, null, "the morning comes during the pause too");
  assert.equal(parseSave(JSON.stringify(s))!.night, null, "the night is not saved");
});

test("each night brings exactly one post plane, with parcels and without passengers", () => {
  let s = reducer({ ...at(5, 0), planes: [] }, { type: "night", on: true, now: 0 });
  const rnd = seeded(11);
  const post = createPlane(s, rnd)!;
  assert.equal(isPost(post), true);
  assert.match(post.flightNo, /^Post \d{3}$/);
  s = reducer(s, { type: "spawn", plane: post });
  const next = createPlane(s, rnd)!;
  assert.equal(isPost(next), false, "the next plane carries passengers");
  s = reducer(s, { type: "landed", id: post.id });
  s = reducer(s, { type: "parked", id: post.id });
  const plane = () => s.planes.find((p) => p.id === post.id)!;
  assert.deepEqual(openTasks(plane(), s.season), ["gepaeck", "tanken"]);
  s = reducer(s, { type: "task", id: post.id, task: "bus" });
  assert.deepEqual(plane().done, [], "nobody boards the post plane");
  for (const task of ["gepaeck", "tanken"] as const) s = reducer(s, { type: "task", id: post.id, task });
  assert.equal(readyForPushback(plane(), s.season), true);
  assert.equal(isPost(parseSave(JSON.stringify(s))!.planes.find((p) => p.id === post.id)!), true, "a saved post plane stays a post plane");
  for (let i = 0; i < 20; i++) assert.equal(isPost(createPlane(initialState(), seeded(i + 1))!), false, "no post plane by day");
});
