let ctx: AudioContext | null = null;
let enabled = true;
const loops = new Map<string, { gain: GainNode; stop: () => void }>();

export function setSound(on: boolean) {
  enabled = on;
  if (!on) for (const key of [...loops.keys()]) stopLoop(key);
}

function audio() {
  if (!enabled || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(a: AudioContext, seconds: number) {
  const buf = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

export const sfx = {
  click: () => tone(720, 0.07, "triangle", 0.12),
  pop: () => {
    tone(520, 0.08, "sine", 0.15);
    tone(880, 0.08, "sine", 0.1, 0.05);
  },
  oops: () => {
    tone(330, 0.15, "triangle", 0.12);
    tone(260, 0.2, "triangle", 0.1, 0.12);
  },
  honk: () => {
    for (const delay of [0, 0.22]) {
      tone(392, 0.16, "triangle", 0.13, delay);
      tone(494, 0.16, "triangle", 0.09, delay);
    }
  },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.14, i * 0.1)),
  pneumatic: () => {
    const a = audio();
    if (!a) return;
    const src = noise(a, 0.4);
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2400;
    const g = a.createGain();
    g.gain.setValueAtTime(0.35, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  },
};

/** continuous sounds: engine hum, spray, pump */
export function startLoop(key: "engine" | "spray" | "pump", level = 1) {
  const a = audio();
  if (!a) return;
  const existing = loops.get(key);
  if (existing) {
    existing.gain.gain.setTargetAtTime(levelFor(key) * level, a.currentTime, fade(key));
    return;
  }
  const g = a.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(levelFor(key) * level, a.currentTime, fade(key));
  const f = a.createBiquadFilter();
  let stop: () => void;
  if (key === "engine") {
    const o1 = a.createOscillator();
    const o2 = a.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 95;
    o2.frequency.value = 190;
    f.type = "lowpass";
    f.frequency.value = 320;
    o1.connect(f);
    o2.connect(f);
    o1.start();
    o2.start();
    stop = () => {
      o1.stop();
      o2.stop();
    };
  } else {
    const src = noise(a, 2);
    src.loop = true;
    f.type = key === "spray" ? "highpass" : "lowpass";
    f.frequency.value = key === "spray" ? 1800 : 500;
    src.connect(f);
    src.start();
    stop = () => src.stop();
  }
  f.connect(g).connect(a.destination);
  loops.set(key, { gain: g, stop });
}

const levelFor = (key: string) => (key === "engine" ? 0.035 : key === "spray" ? 0.08 : 0.18);
const fade = (key: string) => (key === "engine" ? 0.3 : 0.05);

export function stopLoop(key: string) {
  const l = loops.get(key);
  if (!l || !ctx) return;
  loops.delete(key);
  l.gain.gain.setTargetAtTime(0, ctx.currentTime, fade(key));
  setTimeout(() => l.stop(), fade(key) * 6000);
}
