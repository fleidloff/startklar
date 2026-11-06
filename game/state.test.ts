import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlane, initialState, openTasks, parseSave, reducer, type GameState } from "./state.ts";
import { PUSHBACK_END, pushbackPose } from "./motion.ts";

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
  assert.deepEqual(openTasks(plane(), s.season), ["bus", "gepaeck", "tanken", "enteisung"]);
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

test("pushback ends on the taxi lane", () => {
  const end = pushbackPose(2, "A320", PUSHBACK_END);
  assert.ok(Math.abs(Math.sin(end.heading) + 1) < 0.05, "nose points along the lane");
});
