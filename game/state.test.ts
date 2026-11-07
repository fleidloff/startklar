import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlane, initialState, openTasks, parseSave, reducer, type GameState } from "./state.ts";
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
