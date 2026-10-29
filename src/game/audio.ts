type Graph = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
};

let graph: Graph | null = null;
let ambience: { stop: () => void } | null = null;
let volume = 0.8;
let muted = false;

function audioContextCtor(): typeof AudioContext {
  const legacy = globalThis as unknown as { webkitAudioContext?: typeof AudioContext };
  return globalThis.AudioContext ?? legacy.webkitAudioContext ?? AudioContext;
}

function applyMaster(g: Graph) {
  const target = muted ? 0.0001 : Math.max(0.0001, volume * volume);
  g.master.gain.setTargetAtTime(target, g.ctx.currentTime, 0.03);
}

function ensure(): Graph {
  if (!graph) {
    const ctx = new (audioContextCtor())({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    sfx.gain.value = 1;
    music.gain.value = 0.55;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
    graph = { ctx, master, sfx, music };
    applyMaster(graph);
  }
  if (graph.ctx.state === "suspended") void graph.ctx.resume();
  return graph;
}

export function unlockAudio() {
  ensure();
}

export function setMuted(next: boolean) {
  muted = next;
  if (graph) applyMaster(graph);
}

export function isMuted() {
  return muted;
}

export function setMasterVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  if (graph) applyMaster(graph);
}

export function scream(pan = 0) {
  const { ctx, sfx } = ensure();
  const t = ctx.currentTime;
  const dur = 0.48 + Math.random() * 0.22;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const env = Math.sin((Math.PI * i) / frames);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 7;
  const startNoise = 1400 + Math.random() * 700;
  bp.frequency.setValueAtTime(startNoise, t);
  bp.frequency.exponentialRampToValueAtTime(320, t + dur);

  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.62, t + 0.02);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));

  noise.connect(bp);
  bp.connect(ng);
  ng.connect(panner);
  panner.connect(sfx);

  const startF = 680 + Math.random() * 260;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(startF, t);
  osc.frequency.exponentialRampToValueAtTime(180 + Math.random() * 40, t + dur);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 240;
  osc.connect(hp);
  hp.connect(og);
  og.connect(panner);

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(startF * (1.45 + Math.random() * 0.08), t);
  osc2.frequency.exponentialRampToValueAtTime(240, t + dur);
  const og2 = ctx.createGain();
  og2.gain.setValueAtTime(0.0001, t);
  og2.gain.exponentialRampToValueAtTime(0.07, t + 0.04);
  og2.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc2.connect(og2);
  og2.connect(panner);

  noise.start(t);
  noise.stop(t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc2.start(t);
  osc2.stop(t + dur + 0.02);

  noise.onended = () => {
    noise.disconnect();
    bp.disconnect();
    ng.disconnect();
    osc.disconnect();
    hp.disconnect();
    og.disconnect();
    osc2.disconnect();
    og2.disconnect();
    panner.disconnect();
  };
}

export function startAmbience() {
  if (ambience) return;
  const { ctx, music } = ensure();
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.setTargetAtTime(0.16, ctx.currentTime, 0.45);
  src.connect(lp);
  lp.connect(g);
  g.connect(music);

  const drone = ctx.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 58;
  const dg = ctx.createGain();
  dg.gain.setValueAtTime(0.0001, ctx.currentTime);
  dg.gain.setTargetAtTime(0.05, ctx.currentTime, 0.6);
  drone.connect(dg);
  dg.connect(music);

  src.start();
  drone.start();

  ambience = {
    stop() {
      const now = ctx.currentTime;
      g.gain.setTargetAtTime(0.0001, now, 0.12);
      dg.gain.setTargetAtTime(0.0001, now, 0.12);
      window.setTimeout(() => {
        try {
          src.stop();
          drone.stop();
        } catch {
          /* already stopped */
        }
        src.disconnect();
        lp.disconnect();
        g.disconnect();
        drone.disconnect();
        dg.disconnect();
      }, 360);
      ambience = null;
    },
  };
}

export function stopAmbience() {
  ambience?.stop();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && graph?.ctx.state === "suspended") {
      void graph.ctx.resume();
    }
  });
}
