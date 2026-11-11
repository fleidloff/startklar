import { test } from "node:test";
import assert from "node:assert/strict";
import { LOT_FULL_MS, NIGHT_MS, arrivals, clockMinutes, createPlane, guestFlight, initialState, isLongHaul, isPost, mayArrive, nextCar, openTasks, parseSave, pauseOver, readyForPushback, reducer, roomFor, roundOver, visitFree, type GameState } from "./state.ts";
import { PUSHBACK_END, TAXIWAY_X, WIND_HOLD_MS, WIND_TURN_MS, pushbackPose, windAt } from "./motion.ts";
import { AIRCRAFT, SPACES, destination, flightTime } from "./data.ts";

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

test("our airport is Hamburg: Cairo is long haul, Berlin is not", () => {
  assert.equal(isLongHaul(destination("CAI")), true);
  assert.equal(isLongHaul(destination("BER")), false);
});

test("the wind holds for a while, then turns smoothly to a new direction", () => {
  const start = 40 * WIND_HOLD_MS;
  const held = windAt(start + WIND_TURN_MS);
  assert.deepEqual(windAt(start + WIND_HOLD_MS - 1), held, "no change while the wind holds");
  assert.equal(held.turning, false);
  const gap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  assert.ok(gap(windAt(start + WIND_HOLD_MS).angle, held.angle) < 1e-9, "a turn starts where the old wind was");
  let last = held.angle;
  for (let t = 0; t <= WIND_TURN_MS; t += 100) {
    const w = windAt(start + WIND_HOLD_MS + t);
    assert.ok(gap(w.angle, last) < 0.1, "no jump during the turn");
    assert.ok(w.strength >= 0.35 && w.strength <= 1);
    last = w.angle;
  }
  const directions = [...Array(10).keys()].map((i) => windAt(start + i * WIND_HOLD_MS + WIND_TURN_MS).angle);
  assert.ok(directions.some((a) => gap(a, directions[0]) > 0.5), "the direction changes now and then");
});

const park = (s: GameState, spot: number, plane: string, color: string) =>
  reducer(s, { type: "park", spot, kind: SPACES[spot], color, plane, at: spot + 1 });

test("a parked guest car gives its flight its one guest", () => {
  let s = initialState();
  const free = SPACES.map((_, i) => i).filter((i) => !s.lot[i].car && SPACES[i] === "klein");
  s = park(s, free[0], "p1", "#e8574a");
  assert.deepEqual(s.planes.find((p) => p.id === "p1")!.guests, ["#e8574a"]);
  assert.equal(s.lot[free[0]].car!.plane, "p1");
  assert.equal(park(s, free[1], "p1", "#4cbb6c"), s, "one guest per flight");
  assert.equal(reducer(s, { type: "park", spot: 9, kind: "klein", color: "#4cbb6c", plane: "p1", at: 9 }), s, "a small car does not fit a big place");
  assert.equal(park(s, free[0], "p1", "#4cbb6c"), s, "the place is taken");
});

test("cars come only for passenger flights with room and not ready for take-off", () => {
  let s = initialState();
  assert.equal(guestFlight(s)!.id, "p1", "the plane that came first");
  s = { ...s, planes: s.planes.map((p) => (p.id === "p1" ? { ...p, guests: ["#e8574a"] } : p)) };
  assert.equal(guestFlight(s)!.id, "p2", "then the next flight without a guest");
  s = { ...s, planes: s.planes.map((p) => ({ ...p, guests: ["#e8574a"] })) };
  assert.equal(guestFlight(s), undefined);
  assert.equal(nextCar(s, Math.random)!.plane, null, "then a visitor comes");
  assert.equal(nextCar({ ...s, planes: [] }, Math.random), null, "no plane, no car");
  s = { ...initialState(), planes: initialState().planes.map((p) => ({ ...p, type: "B737F" })) };
  assert.equal(guestFlight(s), undefined, "the post plane has no passengers");
  s = { ...initialState(), planes: initialState().planes.map((p) => ({ ...p, stage: "abflug" as const })) };
  assert.equal(guestFlight(s), undefined, "too late once the plane is pushed back");
});

test("a full lot makes room: a car without a flight leaves first, a waiting flight's car never", () => {
  let s = initialState();
  s = { ...s, planes: [...s.planes, { ...s.planes[0], id: "p3", gate: 1 }] };
  const smalls = SPACES.map((_, i) => i).filter((i) => SPACES[i] === "klein");
  const empty = smalls.filter((i) => !s.lot[i].car);
  s = park(s, empty[0], "p1", "#e8574a");
  s = park(s, empty[1], "p2", "#4cbb6c");
  s = park(s, empty[2], "p3", "#3aa3e8");
  const room = roomFor(s, "klein")!;
  assert.equal(room.leave, true);
  assert.equal(s.lot[room.spot].car!.plane, null);
  assert.equal(reducer(s, { type: "leave", spot: empty[0] }), s, "the guest of a waiting flight stays");
  s = reducer(s, { type: "leave", spot: room.spot });
  assert.equal(s.lot[room.spot].car, null);

  s = park(initialState(), 9, "p1", "#e8574a");
  s = reducer(s, { type: "leave", spot: 8 });
  s = park(s, 8, "p2", "#e8574a");
  assert.equal(roomFor(s, "camper"), null, "both big places belong to waiting flights");
  for (let i = 0; i < 20; i++) assert.notEqual(nextCar(s, Math.random)?.kind, "camper", "then no camper comes");
});

test("a visit starts with 1 to 3 free places and 3 cars fill the lot", () => {
  for (const r of [0, 0.5, 0.99]) {
    const rnd = () => r;
    let s = park(initialState(), 1, "p1", "#e8574a");
    s = reducer(s, { type: "visit", free: visitFree(s, rnd) });
    const free = s.lot.filter((x) => !x.car).length;
    assert.ok(free >= 1 && free <= 3);
    assert.equal(s.lot[1].car!.plane, "p1", "the guest of a waiting flight stays");
    for (let n = 0; n < 3; n++) {
      const car = nextCar(s, rnd, 100)!;
      const room = roomFor(s, car.kind, 100)!;
      if (room.leave) s = reducer(s, { type: "leave", spot: room.spot });
      s = reducer(s, { type: "park", spot: room.spot, kind: car.kind, color: car.color, plane: car.plane, at: 100 + n });
    }
    assert.equal(s.lot.filter((x) => !x.car).length, 0, `full after 3 cars, ${free} free at the start`);
  }
  let s = park(initialState(), 9, "p1", "#e8574a");
  s = reducer(s, { type: "visit", free: [8] });
  s = reducer(s, { type: "park", spot: 8, kind: "camper", color: "#5c6168", plane: null, at: 100 });
  assert.equal(roomFor(s, "camper", 100), null, "the camper parked on this visit stays");
  for (let i = 0; i < 20; i++) assert.notEqual(nextCar(s, Math.random, 100)!.kind, "camper");
});

test("from minute 17 the lot stays full and no car comes", () => {
  let s = initialState();
  s = { ...s, round: { ...s.round, played: LOT_FULL_MS } };
  assert.deepEqual(visitFree(s, Math.random), []);
  s = reducer(s, { type: "visit", free: [] });
  assert.equal(s.lot.filter((x) => !x.car).length, 0);
  assert.equal(nextCar(s, Math.random), null);
});

test("snow blocks a place until it is cleared", () => {
  let s = reducer(initialState(), { type: "season", season: "winter" });
  const spot = s.lot.findIndex((x, i) => !x.car && SPACES[i] === "klein");
  assert.equal(s.lot[spot].snow, true);
  assert.equal(park(s, spot, "p1", "#e8574a"), s);
  s = reducer(s, { type: "clear", spot });
  s = park(s, spot, "p1", "#e8574a");
  assert.equal(s.lot[spot].car!.plane, "p1");
  assert.equal(reducer(s, { type: "season", season: "sommer" }).lot.some((x) => x.snow), false);
});

test("an old save without a parking lot loads", () => {
  const old = JSON.parse(JSON.stringify(initialState()));
  delete old.lot;
  for (const p of old.planes) delete p.guests;
  const s = parseSave(JSON.stringify(old))!;
  assert.deepEqual(s.lot, initialState().lot);
  assert.deepEqual(s.planes.map((p) => p.guests), [[], []]);
});
