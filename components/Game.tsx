"use client";
import { Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Apron, type Screen } from "./scenes/Apron";
import { Tower } from "./scenes/Tower";
import { Marshaller } from "./scenes/Marshaller";
import { BusGame } from "./scenes/BusGame";
import { FingerGame } from "./scenes/Finger";
import { Pushback } from "./scenes/Pushback";
import { Fuel } from "./scenes/Fuel";
import { Baggage } from "./scenes/Baggage";
import { Deice } from "./scenes/Deice";
import { Takeoff } from "./scenes/Takeoff";
import { WorldMap } from "./scenes/WorldMap";
import { IsoWorld, parkedPose, planeDrawable } from "./World";
import { Banner, BigButton, Flag, Modal, RoundButton, Stars } from "./ui";
import { Icon } from "./icons";
import { Night } from "./art";
import { GATE_COLORS, PRAISE, TOOLS, aircraft, destination, tool, type TaskId, type ToolId } from "@/game/data";
import { H, W } from "@/game/iso";
import { setSound, sfx } from "@/game/sound";
import {
  PAUSE_MS,
  arrivals,
  createPlane,
  initialState,
  isPost,
  loadGame,
  mayArrive,
  openJobs,
  openTasks,
  pauseOver,
  readyForPushback,
  reducer,
  requiredTasks,
  roundOver,
  saveGame,
  todoText,
  type GameState,
  type Plane,
} from "@/game/state";

export interface SceneProps {
  state: GameState;
  plane: Plane;
  setHint: (text: string | null) => void;
  onDone: () => void;
}

interface Celebration {
  title: string;
  text: string;
  planeId?: string;
  next: Screen[];
  stay?: { label: string; screen: Screen };
}

const TASK_DONE_TEXT: Record<TaskId, string> = {
  bus: "Alle Passagiere sind an Bord.",
  finger: "Alle Passagiere sind durch den Finger ins Flugzeug gelaufen.",
  gepaeck: "Das Gepäck ist im Frachtraum.",
  tanken: "Der Tank ist voll genug für die Reise.",
  enteisung: "Die Flügel sind frei von Schnee und Eis.",
};

function nextSteps(p: Plane | undefined, season: GameState["season"]): Screen[] {
  if (!p) return [];
  if (p.stage === "anflug") return ["tower"];
  if (p.stage === "einwinken") return ["einwinker"];
  if (p.stage === "abfertigung") return openJobs(p, season)[0] ?? ["pushback"];
  return ["start"];
}

const screenLabel = (s: Screen) =>
  s === "tower" ? "Zum Tower" : s === "vorfeld" ? "Zum Vorfeld" : s === "weltkarte" ? "Zur Weltkarte" : tool(s as ToolId).label;
const nextLabel = (s: Screen) => (s === "pushback" ? "Startklar! Zurückschieben" : s === "einwinker" ? "Jetzt einwinken!" : s === "start" ? "Ab zur Startbahn!" : screenLabel(s));
const TICK_MS = 5000;
const MORNING = "Guten Morgen! Die Sonne geht auf.";
const minutes = (n: number) => `${n} ${n === 1 ? "Minute" : "Minuten"}`;
const planesWord = (n: number) => `${n} ${n === 1 ? "Flugzeug" : "Flugzeuge"}`;

const screenIcon = (s: Screen) => (s === "tower" ? "radar" : s === "vorfeld" ? "airport" : s === "weltkarte" ? "globe" : s);

export default function Game() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadGame() ?? initialState());
  const [screen, setScreen] = useState<Screen>("title");
  const [scenePlane, setScenePlane] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<"checkliste" | "help" | "reset" | "eltern" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [scale, setScale] = useState(1);
  const [portrait, setPortrait] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => !!fullscreenElement());
  const [ignorePortrait, setIgnorePortrait] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => saveGame(state), [state]);
  useEffect(() => setSound(state.sound), [state.sound]);

  useEffect(() => {
    const fit = () => {
      setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
      setPortrait(window.innerHeight > window.innerWidth * 1.1);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(!!fullscreenElement());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let active = true;
    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) lock = next;
        else void next.release();
      } catch {
        // battery saver or a hidden page: the screen may dim as usual
      }
    };
    // the browser drops the lock when the tab is hidden, so take it again on return
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [fullscreen]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    sfx.pop();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const startRound = useCallback(
    (t: number) => {
      const planes = arrivals(stateRef.current, Math.random);
      dispatch({ type: "round", now: t, planes });
      setPanel(null);
      showToast(planes.length ? `Der Flughafen ist wieder offen! ${planesWord(planes.length)} ${planes.length === 1 ? "ist" : "sind"} im Anflug.` : "Der Flughafen ist wieder offen!");
    },
    [showToast],
  );

  const playing = screen !== "title";
  useEffect(() => {
    if (!playing) return;
    const step = () => {
      if (document.visibilityState !== "visible") return;
      const t = Date.now();
      setNow(t);
      const s = stateRef.current;
      if (pauseOver(s.round, t)) return startRound(t);
      const next = reducer(s, { type: "tick", now: t });
      if (next === s) return;
      stateRef.current = next;
      dispatch({ type: "tick", now: t });
      if (s.night && !next.night) showToast(MORNING);
      if (!roundOver(s) && roundOver(next)) {
        // the last take-off before 20 minutes already shows "Guten Flug!": keep its text
        setCelebration((c) => roundEnd(next, c?.text));
      }
    };
    step();
    const id = setInterval(step, TICK_MS);
    document.addEventListener("visibilitychange", step);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", step);
    };
  }, [playing, startRound, showToast]);

  const arrive = mayArrive(state);
  useEffect(() => {
    if (!playing || !arrive) return;
    const t = setTimeout(() => {
      if (!mayArrive(stateRef.current)) return;
      const plane = createPlane(stateRef.current, Math.random);
      if (!plane) return;
      dispatch({ type: "spawn", plane });
      const d = destination(plane.dest);
      showToast(isPost(plane) ? `Das Postflugzeug kommt! Flug ${plane.flightNo} aus ${d.city} bringt Pakete.` : `Neues Flugzeug im Anflug: Flug ${plane.flightNo} aus ${d.city}! Ab in den Tower!`);
    }, 7000);
    return () => clearTimeout(t);
  }, [playing, arrive, state.planes.length, showToast]);

  const paused = roundOver(state);
  const pauseLeft = Math.max(1, Math.ceil((PAUSE_MS - (now - state.round.lastPlay)) / 60_000));

  const selected = state.planes.find((p) => p.id === state.selected);
  const active = state.planes.find((p) => p.id === scenePlane) ?? selected;

  const go = useCallback((s: Screen, planeId?: string) => {
    sfx.click();
    setHint(null);
    setCelebration(null);
    setPanel(null);
    if (planeId) {
      dispatch({ type: "select", id: planeId });
      setScenePlane(planeId);
    }
    setScreen(s);
  }, []);

  const openTool = (id: ToolId, preferred?: string) => {
    const planes = state.planes;
    const pick = (ok: (p: Plane) => boolean) =>
      planes.find((p) => p.id === preferred && ok(p)) ?? planes.find((p) => p.id === state.selected && ok(p)) ?? planes.find(ok);
    if (id === "checkliste") {
      sfx.click();
      if (!selected) return showToast(paused ? "Mittagspause! Gerade ist kein Flugzeug da." : "Gerade ist kein Flugzeug da. Gleich kommt eins!");
      return setPanel("checkliste");
    }
    if (id === "enteisung" && state.season === "sommer") {
      return showToast("Enteisen muss man nur im Winter. Tippe oben rechts auf die Schneeflocke!");
    }
    let plane: Plane | undefined;
    if (id === "einwinker") {
      plane = pick((p) => p.stage === "einwinken");
      if (!plane) return showToast(planes.some((p) => p.stage === "anflug") ? "Erst muss ein Flugzeug landen. Ab in den Tower!" : "Gerade wartet kein Flugzeug aufs Einwinken.");
    } else if (id === "pushback") {
      plane = pick((p) => readyForPushback(p, state.season));
      if (!plane) return showToast("Noch kein Flugzeug ist startklar. Erst alle Aufgaben auf der Checkliste erledigen!");
    } else if (id === "start") {
      plane = pick((p) => p.stage === "abflug");
      if (!plane) return showToast("Noch wartet kein Flugzeug auf der Rollbahn. Erst mit dem Schlepper zurückschieben!");
    } else {
      plane = pick((p) => openTasks(p, state.season).includes(id));
      if (!plane && (id === "bus" || id === "finger") && planes.some((p) => p.stage === "abfertigung" && isPost(p))) {
        return showToast("Das Postflugzeug hat keine Passagiere. Hier steigt niemand ein!");
      }
      if (!plane) {
        return showToast(
          planes.some((p) => p.stage === "abfertigung")
            ? `${tool(id).label}: Das ist bei allen Flugzeugen schon erledigt!`
            : "Gerade steht kein Flugzeug am Gate. Winke erst eins ein!",
        );
      }
    }
    go(id, plane.id);
  };

  const finish = (plane: Plane, title: string, text: string, after: Plane) => {
    sfx.success();
    setHint(null);
    setCelebration({ title, text, planeId: plane.id, next: nextSteps(after, state.season) });
  };

  const onTaskDone = (task: TaskId) => () => {
    if (!active || !openTasks(active, state.season).includes(task)) return;
    dispatch({ type: "task", id: active.id, task });
    const text = task === "gepaeck" && isPost(active) ? "Alle Pakete sind an Bord." : TASK_DONE_TEXT[task];
    finish(active, PRAISE[Math.floor(Math.random() * PRAISE.length)], text, { ...active, done: [...active.done, task] });
  };

  const onParked = () => {
    if (!active || active.stage !== "einwinken") return;
    dispatch({ type: "parked", id: active.id });
    finish(active, "Perfekt geparkt!", `Flug ${active.flightNo} steht am Gate ${active.gate + 1}. Jetzt geht die Abfertigung los!`, { ...active, stage: "abfertigung" });
  };

  const onPushed = () => {
    if (!active || active.stage !== "abfertigung") return;
    dispatch({ type: "pushed", id: active.id });
    finish(active, "Startklar!", `Flug ${active.flightNo} steht auf der Rollbahn. Jetzt geht es zum Start!`, { ...active, stage: "abflug" });
  };

  const onTakeoff = () => {
    if (!active || active.stage !== "abflug") return;
    const d = destination(active.dest);
    const sticker = state.collected.includes(active.type) ? "" : ` Neuer Sticker: ${aircraft(active.type).name}!`;
    const action = { type: "departed", id: active.id, at: Date.now() } as const;
    const after = reducer(state, action);
    dispatch(action);
    sfx.success();
    setHint(null);
    setScenePlane(null);
    setScreen("vorfeld");
    const text = `Flug ${active.flightNo} ist unterwegs nach ${d.city} (${d.iata}).${sticker}`;
    setCelebration(roundOver(after) ? roundEnd(after, text) : { title: "Guten Flug!", text, next: ["weltkarte"] });
  };

  const onLanded = (id: string) => {
    const plane = state.planes.find((p) => p.id === id);
    if (!plane || plane.stage !== "anflug") return;
    dispatch({ type: "landed", id });
    dispatch({ type: "select", id });
    setScenePlane(id);
    sfx.success();
    const more = state.planes.some((p) => p.id !== id && p.stage === "anflug");
    setCelebration({
      title: "Sicher gelandet!",
      text: `Flug ${plane.flightNo} aus ${destination(plane.dest).city} ist gelandet und rollt zum Gate ${plane.gate + 1}.`,
      planeId: id,
      next: ["einwinker"],
      stay: more ? { label: "Im Tower bleiben", screen: "tower" } : undefined,
    });
  };

  const toggleNight = () => {
    sfx.click();
    const on = !state.night;
    dispatch({ type: "night", on, now: Date.now() });
    showToast(on ? "Licht an! Es wird Nacht am Flughafen." : MORNING);
  };

  const isTask = (s: Screen): s is TaskId => ["bus", "finger", "gepaeck", "tanken", "enteisung"].includes(s);
  const latest = useRef<{ done: () => void; landed: (id: string) => void }>({ done: () => {}, landed: () => {} });
  useEffect(() => {
    latest.current = {
      done: isTask(screen) ? onTaskDone(screen) : screen === "einwinker" ? onParked : screen === "pushback" ? onPushed : screen === "start" ? onTakeoff : () => {},
      landed: onLanded,
    };
  });
  const onDone = useCallback(() => latest.current.done(), []);
  const onLandedStable = useCallback((id: string) => latest.current.landed(id), []);
  const sceneProps = () => (active ? { state, plane: active, setHint, onDone } : null);

  const renderScene = () => {
    switch (screen) {
      case "title":
        return <TitleBackdrop state={state} />;
      case "vorfeld":
        return <Apron state={state} onSelect={(id) => { sfx.click(); dispatch({ type: "select", id }); }} onOpen={(s, id) => (s === "tower" || s === "weltkarte" ? go(s, id) : openTool(s as ToolId, id))} />;
      case "tower":
        return <Tower state={state} setHint={setHint} onLanded={onLandedStable} now={now} paused={paused} onParent={() => setPanel("eltern")} onLight={toggleNight} />;
      case "weltkarte":
        return <WorldMap state={state} />;
    }
    if (!active) return <Apron state={state} onSelect={() => {}} onOpen={() => {}} />;
    switch (screen) {
      case "einwinker":
        return <Marshaller key={active.id} state={state} plane={active} setHint={setHint} onDone={onDone} />;
      case "pushback":
        return <Pushback key={active.id} state={state} plane={active} setHint={setHint} onDone={onDone} />;
      case "bus":
        return <BusGame key={active.id} {...sceneProps()!} />;
      case "finger":
        return <FingerGame key={active.id} {...sceneProps()!} />;
      case "tanken":
        return <Fuel key={active.id} {...sceneProps()!} />;
      case "gepaeck":
        return <Baggage key={active.id} {...sceneProps()!} />;
      case "enteisung":
        return <Deice key={active.id} {...sceneProps()!} />;
      case "start":
        return active.stage === "abflug" ? <Takeoff key={active.id} {...sceneProps()!} /> : <Apron state={state} onSelect={() => {}} onOpen={() => {}} />;
    }
  };

  const headPlane = screen === "vorfeld" || screen === "tower" ? selected : active;
  const dest = headPlane ? destination(headPlane.dest) : null;
  const inbound = headPlane && (headPlane.stage === "anflug" || headPlane.stage === "einwinken");

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <Night.Provider value={!!state.night}>{renderScene()}</Night.Provider>

        {screen !== "title" && (
          <>
            <nav className="toolbar" aria-label="Werkzeuge">
              {TOOLS.map((t) => {
                const needed = t.id === "checkliste" ? 0 : state.planes.filter((p) =>
                  t.id === "einwinker" ? p.stage === "einwinken" : t.id === "pushback" ? readyForPushback(p, state.season) : t.id === "start" ? p.stage === "abflug" : openTasks(p, state.season).includes(t.id as TaskId),
                ).length;
                return (
                  <RoundButton
                    key={t.id}
                    icon={t.id}
                    size={84}
                    label={t.label}
                    color={t.color}
                    active={screen === t.id}
                    dim={t.id === "enteisung" && state.season === "sommer"}
                    badge={needed || undefined}
                    onClick={() => openTool(t.id)}
                  />
                );
              })}
            </nav>

            <div className="topbar">
              {state.planes.map((p) => (
                <RoundButton
                  key={p.id}
                  icon="checkliste"
                  label={`Checkliste Flug ${p.flightNo}`}
                  color={GATE_COLORS[p.gate]}
                  size={84}
                  active={p.id === state.selected}
                  badge={p.stage === "abfertigung" ? openJobs(p, state.season).length || "✓" : "!"}
                  onClick={() => {
                    sfx.click();
                    dispatch({ type: "select", id: p.id });
                    setPanel("checkliste");
                  }}
                />
              ))}
              {screen === "weltkarte" ? (
                <Banner left={<b className="banner-title">Weltkarte</b>} right={<span>{state.log.length === 1 ? "1 Flug" : `${state.log.length} Flüge`} in die Welt geschickt!</span>} />
              ) : (
                <Banner
                  left={
                    headPlane && dest ? (
                      <div className="flight">
                        <div>
                          <b>Flug {headPlane.flightNo}</b>
                          <span>{inbound ? "aus" : "nach"} {dest.city} ({dest.iata})</span>
                        </div>
                        <Flag code={dest.flag} height={30} />
                      </div>
                    ) : (
                      <b className="banner-title">Flughafen</b>
                    )
                  }
                  right={<span>{hint ?? (paused ? `Mittagspause! Die Flugzeuge kommen in ${minutes(pauseLeft)} wieder.` : todoText(headPlane, state.season))}</span>}
                />
              )}
            </div>

            <div className="sidebar-right">
              <button type="button" className="radar-btn" onClick={() => go("tower")} aria-label="Tower und Radar" title="Tower & Radar">
                <MiniRadar count={state.planes.filter((p) => p.stage === "anflug").length} />
              </button>
              {screen !== "vorfeld" && <RoundButton icon="airport" label="Zurück zum Vorfeld" color="#3aa3e8" size={78} onClick={() => go("vorfeld")} />}
              <RoundButton icon="globe" label="Weltkarte" color="#2fb7a8" size={78} active={screen === "weltkarte"} onClick={() => go("weltkarte")} />
              <RoundButton
                icon={state.season === "sommer" ? "snow" : "sun"}
                label={state.season === "sommer" ? "Winter einschalten" : "Sommer einschalten"}
                color={state.season === "sommer" ? "#6fb7e8" : "#ffb347"}
                size={78}
                onClick={() => {
                  sfx.click();
                  const season = state.season === "sommer" ? "winter" : "sommer";
                  dispatch({ type: "season", season });
                  showToast(season === "winter" ? "Es schneit! Flugzeuge müssen jetzt enteist werden." : "Sommer! Die Sonne scheint.");
                }}
              />
              <RoundButton icon={state.sound ? "sound" : "mute"} label={state.sound ? "Ton aus" : "Ton an"} color="#9aa3ad" size={78} onClick={() => dispatch({ type: "sound", on: !state.sound })} />
              <RoundButton icon="help" label="Hilfe" color="#f6c02c" size={78} onClick={() => { sfx.click(); setPanel("help"); }} />
              {canFullscreen() && (
                <RoundButton
                  icon={fullscreen ? "fullscreen-exit" : "fullscreen"}
                  label={fullscreen ? "Vollbild beenden" : "Vollbild"}
                  color="#5b6779"
                  size={78}
                  onClick={() => {
                    sfx.click();
                    toggleFullscreen();
                  }}
                />
              )}
            </div>
            {state.season === "winter" && screen !== "weltkarte" && <Snowfall />}
          </>
        )}

        {screen === "title" && (
          <TitleCard
            hasProgress={state.log.length > 0 || state.planes.some((p) => p.done.length > 0)}
            sound={state.sound}
            onSound={() => dispatch({ type: "sound", on: !state.sound })}
            onPlay={() => go("vorfeld")}
            onReset={() => setPanel("reset")}
          />
        )}

        {toast && (
          <div className="toast" role="status">
            <div className="toast-face" aria-hidden="true">
              <Icon name="einwinker" size={52} />
            </div>
            <p>{toast}</p>
          </div>
        )}

        {celebration && (
          <Modal label={celebration.title}>
            <Stars />
            <h2>{celebration.title}</h2>
            <p className="modal-text">{celebration.text}</p>
            <div className="modal-actions">
              {celebration.next.map((next, i) => (
                <BigButton key={next} autoFocus={i === 0} icon={screenIcon(next)} color={celebration.next.length > 1 ? tool(next as ToolId).color : undefined} onClick={() => (next === "tower" ? go("tower", celebration.planeId) : next === "vorfeld" || next === "weltkarte" ? go(next) : openTool(next as ToolId, celebration.planeId))}>
                  {nextLabel(next)}
                </BigButton>
              ))}
              {celebration.stay && (
                <BigButton color="#2c7a52" icon="radar" onClick={() => go(celebration.stay!.screen)}>
                  {celebration.stay.label}
                </BigButton>
              )}
              <BigButton color="#3aa3e8" icon="airport" onClick={() => go("vorfeld")}>
                Zum Vorfeld
              </BigButton>
            </div>
          </Modal>
        )}

        {panel === "checkliste" && selected && <Checklist plane={selected} state={state} onClose={() => setPanel(null)} onGo={(s) => (s === "tower" ? go("tower", selected.id) : openTool(s as ToolId, selected.id))} />}
        {panel === "help" && <Help onClose={() => setPanel(null)} />}
        {panel === "eltern" && paused && <ParentGate onClose={() => setPanel(null)} onSolved={() => startRound(Date.now())} />}
        {panel === "reset" && (
          <Modal label="Neues Spiel" onClose={() => setPanel(null)}>
            <h2>Neues Spiel starten?</h2>
            <p className="modal-text">Alle Flüge, Sticker und die Weltkarte fangen dann wieder von vorne an.</p>
            <div className="modal-actions">
              <BigButton color="#e8574a" onClick={() => { dispatch({ type: "reset" }); setPanel(null); go("vorfeld"); }}>
                Ja, neu anfangen
              </BigButton>
              <BigButton color="#4cbb6c" autoFocus onClick={() => setPanel(null)}>
                Nein, weiterspielen
              </BigButton>
            </div>
          </Modal>
        )}
      </div>
      {portrait && !ignorePortrait && (
        <div className="rotate-hint" role="alertdialog" aria-label="Gerät drehen">
          <div className="rotate-icon" aria-hidden="true">📱</div>
          <p>Bitte dreh dein Tablet quer!</p>
          <button type="button" className="big-btn" style={{ background: "#3aa3e8" }} onClick={() => setIgnorePortrait(true)}>
            <span>Trotzdem spielen</span>
          </button>
        </div>
      )}
    </div>
  );
}

function roundEnd(state: GameState, before?: string): Celebration {
  const done = `Heute Vormittag hast du ${planesWord(state.round.departed)} abgefertigt.`;
  return { title: "Mittagspause am Flughafen!", text: before ? `${before} ${done}` : done, next: ["weltkarte"] };
}

function ParentGate({ onClose, onSolved }: { onClose: () => void; onSolved: () => void }) {
  const [[a, b]] = useState(() => [12 + Math.floor(Math.random() * 8), 3 + Math.floor(Math.random() * 7)]);
  const [input, setInput] = useState("");
  const type = useCallback((key: string) => {
    sfx.click();
    setInput((v) => (key === "del" ? v.slice(0, -1) : v.length < 3 ? v + key : v));
  }, []);
  const submit = () => {
    if (Number(input) === a * b) return onSolved();
    sfx.oops();
    onClose();
  };
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === "Backspace") type("del");
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) submitRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);
  return (
    <Modal label="Für Eltern" onClose={onClose}>
      <h2>Für Eltern</h2>
      <p className="modal-text">
        Wie viel ist {a} mal {b}?
      </p>
      <output className="gate-input" aria-label="Deine Antwort">{input || "?"}</output>
      <div className="numpad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"].map((k) => (
          <button key={k} type="button" onClick={() => type(k)} aria-label={k === "del" ? "Löschen" : undefined}>
            {k === "del" ? "⌫" : k}
          </button>
        ))}
        <button type="button" className="numpad-ok" onClick={submit} disabled={!input}>
          Fertig
        </button>
      </div>
      <div className="modal-actions">
        <BigButton color="#9aa3ad" onClick={onClose}>
          Abbrechen
        </BigButton>
      </div>
    </Modal>
  );
}

type WebkitDocument = Document & { webkitFullscreenElement?: Element; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => void };
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const fullscreenElement = () => document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement;
const canFullscreen = () => document.fullscreenEnabled || !!(document as WebkitDocument).webkitFullscreenEnabled;

async function toggleFullscreen() {
  const doc = document as WebkitDocument;
  try {
    if (fullscreenElement()) {
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    const root = document.documentElement as WebkitElement;
    await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    // Android Chrome only allows an orientation lock while in fullscreen
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
  } catch {
    // the browser refused (e.g. iPhone Safari or a lock without fullscreen): the game keeps running windowed
  }
}

function MiniRadar({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <rect x="3" y="3" width="114" height="114" rx="14" fill="#1d4f36" stroke="#26303f" strokeWidth="5" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="#3f9a63" strokeWidth="2" />
      <circle cx="60" cy="60" r="24" fill="none" stroke="#3f9a63" strokeWidth="2" />
      <g className="radar-sweep" style={{ transformOrigin: "60px 60px" }}>
        <path d="M60,60 L60,16 A44,44 0 0 1 98,38 Z" fill="rgba(125,224,143,0.3)" />
      </g>
      <path d="M22,98 L98,22" stroke="#f6c02c" strokeWidth="3" strokeDasharray="6 6" />
      {[...Array(Math.min(count, 3)).keys()].map((i) => (
        <g key={i} transform={`translate(${[30, 88, 76][i]},${[34, 84, 30][i]}) rotate(${[135, -45, 200][i]})`}>
          <path d="M-9,0 L9,0 M-2,-7 L2,0 L-2,7 M-8,-3 L-6,0 L-8,3" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      {count > 0 && <circle cx="100" cy="20" r="13" fill="#e8574a" stroke="#fff" strokeWidth="3" />}
      {count > 0 && <text x="100" y="26" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff">{count}</text>}
    </svg>
  );
}

function Snowfall() {
  const flakes = useMemo(() => [...Array(40).keys()].map((i) => ({ left: (i * 37) % 100, delay: (i * 0.71) % 8, size: 6 + ((i * 7) % 8), dur: 7 + ((i * 3) % 6) })), []);
  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map((f, i) => (
        <span key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
      ))}
    </div>
  );
}

function Checklist({ plane, state, onClose, onGo }: { plane: Plane; state: GameState; onClose: () => void; onGo: (s: Screen) => void }) {
  const d = destination(plane.dest);
  const landed = plane.stage !== "anflug";
  const parked = plane.stage === "abfertigung" || plane.stage === "abflug";
  const rows: { label: string; done: boolean; screen: Screen; icon: string; enabled: boolean }[][] = [
    [{ label: "Landen (Tower)", done: landed, screen: "tower", icon: "radar", enabled: !landed }],
    [{ label: "Einwinken", done: parked, screen: "einwinker", icon: "einwinker", enabled: plane.stage === "einwinken" }],
    ...requiredTasks(state.season, plane).map((job) => {
      const used = job.find((t) => plane.done.includes(t));
      const done = !!used || plane.stage === "abflug";
      return (done ? [used ?? job[0]] : job).map((t) => ({ label: t === "gepaeck" && isPost(plane) ? "Pakete einladen" : tool(t).label, done, screen: t as Screen, icon: t, enabled: parked && !done }));
    }),
    [{ label: "Zurückschieben", done: plane.stage === "abflug", screen: "pushback", icon: "pushback", enabled: readyForPushback(plane, state.season) }],
    [{ label: "Start", done: false, screen: "start", icon: "start", enabled: plane.stage === "abflug" }],
  ];
  const t = aircraft(plane.type);
  return (
    <Modal label={`Checkliste Flug ${plane.flightNo}`} onClose={onClose}>
      <h2 className="with-flag">
        Checkliste Flug {plane.flightNo} <Flag code={d.flag} height={28} />
      </h2>
      <p className="modal-sub">
        {t.name} · Gate {plane.gate + 1} · {landed ? "nach" : "aus"} {d.city}
      </p>
      <ul className="checklist">
        {rows.map((row) => (
          <li key={row[0].label} className={row.length > 1 ? "choice" : undefined}>
            {row.map((r, i) => (
              <Fragment key={r.label}>
                {i > 0 && <span className="or">oder</span>}
                <button type="button" disabled={!r.enabled} onClick={() => onGo(r.screen)} className={r.done ? "done" : r.enabled ? "open" : "later"}>
                  {row.length === 1 && <span className="check" aria-hidden="true">{r.done ? "✓" : ""}</span>}
                  <Icon name={r.icon} size={38} />
                  <span>{r.label}</span>
                  <span className="state">{r.done ? "erledigt" : r.enabled ? "Los!" : "später"}</span>
                </button>
              </Fragment>
            ))}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const steps: [string, string][] = [
    ["radar", "Im Tower ziehst du mit dem Finger eine Linie vom Flugzeug zur Landebahn."],
    ["einwinker", "Winke das Flugzeug mit beiden Leuchtstäben bis zur STOP-Linie."],
    ["checkliste", "Erledige alle Aufgaben: Passagiere mit dem Bus oder mit dem Finger einsteigen lassen, Gepäck und Tanken. Im Winter auch Enteisen."],
    ["pushback", "Schiebe das Flugzeug mit dem Schlepper auf die gelbe Linie. Guten Flug!"],
    ["lamp", "Im Tower schaltest du das Licht an. Dann wird es Nacht, und ein gelbes Postflugzeug bringt Pakete."],
    ["globe", "Auf der Weltkarte siehst du, wohin deine Flugzeuge fliegen, und sammelst Flugzeug-Sticker."],
  ];
  return (
    <Modal label="So geht's" onClose={onClose} wide>
      <h2>So geht&apos;s!</h2>
      <ol className="help-list">
        {steps.map(([icon, text]) => (
          <li key={icon}>
            <span className="help-icon"><Icon name={icon} size={46} /></span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <p className="modal-sub">Hier gibt es keine Eile und keine Fehler. Die Flugzeuge warten geduldig auf dich!</p>
    </Modal>
  );
}

function TitleBackdrop({ state }: { state: GameState }) {
  const drawables = state.planes.filter((p) => p.stage === "abfertigung").map((p) => planeDrawable(p, parkedPose(p)));
  return <IsoWorld className="fill title-bg" season={state.season} camera={{ x: 120, y: 520, zoom: 0.7 }} planes={state.planes} drawables={drawables} label="Flughafen" />;
}

function TitleCard({ hasProgress, sound, onSound, onPlay, onReset }: { hasProgress: boolean; sound: boolean; onSound: () => void; onPlay: () => void; onReset: () => void }) {
  return (
    <div className="title-card">
      <svg className="title-plane" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8,36 L20,36 L30,20 L36,20 L32,36 L46,36 L52,28 L56,28 L54,40 L32,44 L36,56 L30,56 L20,44 L10,42 Z" fill="#fff" stroke="#26303f" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <h1>
        Flughafen-Manager:
        <span>Startklar!</span>
      </h1>
      <p>Lande Flugzeuge, lade Koffer ein, tanke auf und schick sie in die ganze Welt!</p>
      <div className="modal-actions">
        <BigButton autoFocus icon="plane" onClick={onPlay}>
          {hasProgress ? "Weiterspielen" : "Los geht's!"}
        </BigButton>
        {hasProgress && (
          <BigButton color="#f39a35" onClick={onReset}>
            Neues Spiel
          </BigButton>
        )}
      </div>
      <button type="button" className="text-btn" onClick={onSound}>
        Ton: {sound ? "an" : "aus"}
      </button>
    </div>
  );
}
