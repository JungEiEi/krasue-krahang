import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ghost, Play, RotateCcw, Timer, Trophy, Volume2, VolumeX } from "lucide-react";
import { isMuted, scream, setMasterVolume, setMuted, splat, startAmbience, unlockAudio } from "@/game/audio";
import { loadSave, writeSave, type SaveData } from "@/game/storage";

type Kind = "krasue" | "krahang" | "poop";
type Phase = "idle" | "playing" | "ended";
type Duration = 30 | 45 | 60;

type GhostEnt = {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  phase: number;
  state: "alive" | "caught";
  catchAt: number;
};

type Fx = {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: Kind;
  born: number;
};

type Sim = {
  running: boolean;
  acc: number;
  duration: Duration;
  next: number;
  seq: number;
  spawned: number;
  score: number;
  krasue: number;
  krahang: number;
  high: number;
  highAtStart: number;
  lifeK: number;
  lifeH: number;
  last: number;
  shakeUntil: number;
  ghosts: GhostEnt[];
  fx: Fx[];
};

type Frame = {
  ghosts: GhostEnt[];
  fx: Fx[];
  score: number;
  time: number;
  krasue: number;
  krahang: number;
  high: number;
  lifeK: number;
  lifeH: number;
  tick: number;
  shaking: boolean;
  breaking: boolean;
};

const DURATIONS: Duration[] = [30, 45, 60];

const art = (file: string) => `${import.meta.env.BASE_URL}art/${file}`;

function pointsFor(kind: Kind) {
  if (kind === "krasue") return 10;
  if (kind === "krahang") return 20;
  return -10;
}

function spawnKrasue(id: number, center: boolean): GhostEnt {
  return {
    id,
    kind: "krasue",
    x: center ? 46 + Math.random() * 8 : 16 + Math.random() * 68,
    y: center ? 38 + Math.random() * 10 : 18 + Math.random() * 56,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 8,
    age: 0,
    ttl: 2.15 + Math.random() * 0.85,
    phase: Math.random() * Math.PI * 2,
    state: "alive",
    catchAt: 0,
  };
}

function spawnPoop(id: number): GhostEnt {
  return {
    id,
    kind: "poop",
    x: 18 + Math.random() * 64,
    y: 20 + Math.random() * 52,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 6,
    age: 0,
    ttl: 2.4 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    state: "alive",
    catchAt: 0,
  };
}

function spawnKrahang(id: number, haste: number): GhostEnt {
  const fromLeft = Math.random() < 0.5;
  const speed = 46 + haste * 30;
  return {
    id,
    kind: "krahang",
    x: fromLeft ? -8 : 108,
    y: 18 + Math.random() * 54,
    vx: fromLeft ? speed : -speed,
    vy: (Math.random() - 0.5) * 16,
    age: 0,
    ttl: 2.6,
    phase: Math.random() * Math.PI * 2,
    state: "alive",
    catchAt: 0,
  };
}

function persist(sim: Sim) {
  const data: SaveData = {
    version: 1,
    highScore: sim.high,
    lifetimeKrasue: sim.lifeK,
    lifetimeKrahang: sim.lifeH,
  };
  writeSave(data);
}

export function GhostCatcher() {
  const sim = useRef<Sim>({
    running: false,
    acc: 0,
    duration: 45,
    next: 0.2,
    seq: 1,
    spawned: 0,
    score: 0,
    krasue: 0,
    krahang: 0,
    high: 0,
    highAtStart: 0,
    lifeK: 0,
    lifeH: 0,
    last: 0,
    shakeUntil: 0,
    ghosts: [],
    fx: [],
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [duration, setDuration] = useState<Duration>(45);
  const [record, setRecord] = useState(false);
  const [summary, setSummary] = useState({ score: 0, krasue: 0, krahang: 0 });
  const [muted, setMutedUi] = useState(false);
  const [armedReset, setArmedReset] = useState(false);
  const [frame, setFrame] = useState<Frame>({
    ghosts: [],
    fx: [],
    score: 0,
    time: 45,
    krasue: 0,
    krahang: 0,
    high: 0,
    lifeK: 0,
    lifeH: 0,
    tick: 0,
    shaking: false,
    breaking: false,
  });

  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    const saved = loadSave();
    const s = sim.current;
    s.high = saved.highScore;
    s.highAtStart = saved.highScore;
    s.lifeK = saved.lifetimeKrasue;
    s.lifeH = saved.lifetimeKrahang;
    setFrame((f) => ({
      ...f,
      high: saved.highScore,
      lifeK: saved.lifetimeKrasue,
      lifeH: saved.lifetimeKrahang,
    }));
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const s = sim.current;
      const dt = s.last === 0 ? 0 : Math.min(0.05, (now - s.last) / 1000);
      s.last = now;

      if (s.running) {
        s.acc += dt;
        if (s.acc >= s.duration) {
          finish(s);
        } else {
          const progress = s.acc / s.duration;
          const keep: GhostEnt[] = [];
          for (const g of s.ghosts) {
            if (g.state === "caught") {
              if (now - g.catchAt < 430) keep.push(g);
              continue;
            }
            g.age += dt;
            g.x += g.vx * dt;
            g.y += g.vy * dt;
            if (g.kind !== "krahang") {
              if (g.x < 12 || g.x > 88) g.vx *= -1;
              if (g.y < 16 || g.y > 78) g.vy *= -1;
              g.x = Math.min(90, Math.max(10, g.x));
              g.y = Math.min(80, Math.max(14, g.y));
            }
            const off =
              g.kind === "krahang" && (g.x < -20 || g.x > 120 || g.y < -20 || g.y > 120);
            if (!off && g.age < g.ttl) keep.push(g);
          }
          s.ghosts = keep;
          s.fx = s.fx.filter((f) => now - f.born < 720);

          const alive = s.ghosts.filter((g) => g.state === "alive").length;
          const cap = progress < 0.34 ? 2 : progress < 0.72 ? 3 : 4;
          s.next -= dt;
          if (s.next <= 0 && alive < cap && s.duration - s.acc > 0.35) {
            s.next = Math.max(0.38, 1.05 - progress * 0.62) + Math.random() * 0.12;
            const id = ++s.seq;
            const first = s.spawned === 0;
            const roll = Math.random();
            const ent = first
              ? spawnKrasue(id, true)
              : roll < 0.3
                ? spawnPoop(id)
                : roll < 0.58
                  ? spawnKrahang(id, progress)
                  : spawnKrasue(id, false);
            s.ghosts.push(ent);
            s.spawned += 1;
          }
        }

        setFrame({
          ghosts: s.ghosts.map((g) => ({ ...g })),
          fx: s.fx.map((f) => ({ ...f })),
          score: s.score,
          time: Math.max(0, Math.ceil(s.duration - s.acc)),
          krasue: s.krasue,
          krahang: s.krahang,
          high: s.high,
          lifeK: s.lifeK,
          lifeH: s.lifeH,
          tick: now / 1000,
          shaking: now < s.shakeUntil,
          breaking: s.score > s.highAtStart && s.score > 0,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    function finish(s: Sim) {
      if (!s.running) return;
      s.running = false;
      s.acc = s.duration;
      const madeRecord = s.score > s.highAtStart && s.score > 0;
      if (s.score > s.high) s.high = s.score;
      s.lifeK += s.krasue;
      s.lifeH += s.krahang;
      persist(s);
      s.ghosts = [];
      s.fx = [];
      setSummary({ score: s.score, krasue: s.krasue, krahang: s.krahang });
      setRecord(madeRecord);
      setPhase("ended");
    }

    sim.current.last = 0;
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function startGame() {
    unlockAudio();
    startAmbience();
    const s = sim.current;
    const nextDuration = durationRef.current;
    s.running = true;
    s.acc = 0;
    s.duration = nextDuration;
    s.next = 0.12;
    s.spawned = 0;
    s.score = 0;
    s.krasue = 0;
    s.krahang = 0;
    s.highAtStart = s.high;
    s.ghosts = [];
    s.fx = [];
    s.shakeUntil = 0;
    setRecord(false);
    setPhase("playing");
    setFrame((f) => ({
      ...f,
      ghosts: [],
      fx: [],
      score: 0,
      time: nextDuration,
      krasue: 0,
      krahang: 0,
      shaking: false,
      breaking: false,
    }));
  }

  function catchGhost(id: number) {
    const s = sim.current;
    if (!s.running) return;
    const g = s.ghosts.find((item) => item.id === id && item.state === "alive");
    if (!g) return;
    g.state = "caught";
    g.catchAt = performance.now();
    const pts = pointsFor(g.kind);
    s.score = Math.max(0, s.score + pts);
    if (g.kind === "krasue") s.krasue += 1;
    else if (g.kind === "krahang") s.krahang += 1;
    if (pts > 0 && s.score > s.high) {
      s.high = s.score;
      persist(s);
    }
    s.fx.push({
      id: ++s.seq,
      x: g.x,
      y: g.y,
      text: pts > 0 ? `+${pts}` : `${pts}`,
      kind: g.kind,
      born: g.catchAt,
    });
    s.shakeUntil = g.catchAt + (pts < 0 ? 280 : 170);
    try {
      if (pts < 0) splat((g.x / 100) * 2 - 1);
      else scream((g.x / 100) * 2 - 1);
    } catch {
      /* audio is optional juice */
    }
  }

  function resetHigh() {
    if (phase === "playing") return;
    if (!armedReset) {
      setArmedReset(true);
      window.setTimeout(() => setArmedReset(false), 2400);
      return;
    }
    const s = sim.current;
    s.high = 0;
    s.highAtStart = 0;
    persist(s);
    setArmedReset(false);
    setFrame((f) => ({ ...f, high: 0 }));
  }

  function toggleMute() {
    unlockAudio();
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
  }

  const playing = phase === "playing";

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col gap-3 px-3 py-3 sm:px-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-lantern">ตำนานบ้านนอกยามค่ำ</p>
            <h1 className="font-display text-2xl leading-tight text-bone sm:text-4xl">
              เกมจับผีกระสือ & ผีกระหัง
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-ash/30 bg-panel text-bone"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>

        <section className="grid grid-cols-3 gap-2" aria-label="คะแนนและเวลา">
          <Stat
            icon={<Ghost className="size-4 text-ember" />}
            label="คะแนนปัจจุบัน"
            value={frame.score}
            accent="text-ember"
            hint={frame.breaking ? "สถิติใหม่" : "ห้ามแตะก้อน −10"}
          />
          <Stat
            icon={<Trophy className="size-4 text-lantern" />}
            label="คะแนนสูงสุด"
            value={frame.high}
            accent="text-lantern"
            hint="บันทึกในเครื่อง"
          />
          <Stat
            icon={<Timer className="size-4 text-bone" />}
            label="เวลาที่เหลือ"
            value={playing ? frame.time : phase === "ended" ? 0 : duration}
            accent="text-bone"
            hint="วินาที"
          />
        </section>
      </header>

      <section
        className={`arena relative min-h-0 flex-1 overflow-hidden rounded-card border border-ash/25 ${frame.shaking ? "is-shaking" : ""}`}
        aria-label="สนามจับผี"
      >
        <img
          src={art("village-night.webp")}
          alt=""
          className="arena-bg pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="vignette pointer-events-none absolute inset-0" />

        {frame.ghosts.map((g) => {
          const bobAmp = g.kind === "krahang" ? 3 : g.kind === "poop" ? 6 : 8;
          const bob =
            Math.sin(frame.tick * (g.kind === "krahang" ? 7 : 2.3) + g.phase) * bobAmp;
          const tilt =
            Math.sin(frame.tick * 1.6 + g.phase) * (g.kind === "poop" ? 8 : g.kind === "krasue" ? 5 : 2) +
            (g.kind === "krahang" ? Math.max(-10, Math.min(10, g.vx * 0.08)) : 0);
          const fade = g.state === "alive" ? Math.min(1, (g.ttl - g.age) / 0.32) : 1;
          return (
            <button
              key={g.id}
              type="button"
              className={`ghost-btn ${g.state === "caught" ? "ghost-caught" : ""}`}
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                zIndex: 10 + Math.round(g.y),
                opacity: g.state === "alive" ? Math.max(0.15, fade) : undefined,
                transform: `translate(-50%, -50%) translateY(${bob}px) rotate(${tilt}deg)`,
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                catchGhost(g.id);
              }}
              aria-label={
                g.kind === "krasue" ? "จับผีกระสือ" : g.kind === "krahang" ? "จับผีกระหัง" : "อย่าแตะก้อนนี้"
              }
              disabled={!playing || g.state !== "alive"}
            >
              <img
                src={art(
                  g.kind === "krasue" ? "krasue.webp" : g.kind === "krahang" ? "krahang.webp" : "poop.webp",
                )}
                alt=""
                draggable={false}
                className={`ghost-img ghost-${g.kind}`}
              />
            </button>
          );
        })}

        {frame.fx.map((fx) => (
          <div key={fx.id}>
            {fx.kind !== "poop" && (
              <>
                <span className="spell" style={{ left: `${fx.x}%`, top: `${fx.y}%` }} />
                <span className="spell spell-inner" style={{ left: `${fx.x}%`, top: `${fx.y}%` }} />
              </>
            )}
            <span
              className={`floater floater-${fx.kind}`}
              style={{ left: `${fx.x}%`, top: `${fx.y}%` }}
            >
              {fx.text}
            </span>
          </div>
        ))}

        {phase === "idle" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-card border border-ash/30 bg-panel/90 p-4 text-center backdrop-blur-sm">
              <p className="font-display text-2xl leading-none text-bone">ออกไล่ผีกัน</p>
              <p className="mt-2 text-sm leading-relaxed text-ash">
                แตะผีที่โผล่จากความมืด กระสือได้ 10 กระหังได้ 20 อย่าแตะก้อนอุจจาระ โดนแล้วลบ 10
                คะแนน จับไม่ทันมันจะหายไปเอง
              </p>
              <button
                type="button"
                onClick={startGame}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-lantern px-4 font-semibold text-night"
              >
                <Play className="size-4" />
                เริ่มเกม
              </button>
            </div>
          </div>
        )}

        {phase === "ended" && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="round-title"
          >
            <div className="w-full max-w-sm rounded-card border border-lantern/50 bg-panel p-5 text-center shadow-2xl">
              <p className="text-xs font-semibold tracking-wide text-ash">สรุปผลรอบนี้</p>
              <h2 id="round-title" className="font-display text-3xl leading-none text-bone">
                จบการไล่ผี
              </h2>
              {record && (
                <p className="mt-3 rounded-full bg-lantern/15 px-3 py-1 text-sm font-bold text-lantern">
                  ทำสถิติใหม่สำเร็จ!
                </p>
              )}
              <p className="mt-4 text-4xl font-bold text-ember">{summary.score}</p>
              <p className="text-sm text-ash">คะแนนรวมรอบนี้</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-card bg-night px-3 py-2">
                  <dt className="text-xs text-ash">ผีกระสือที่จับได้</dt>
                  <dd className="text-2xl font-bold text-bone">{summary.krasue}</dd>
                </div>
                <div className="rounded-card bg-night px-3 py-2">
                  <dt className="text-xs text-ash">ผีกระหังที่จับได้</dt>
                  <dd className="text-2xl font-bold text-bone">{summary.krahang}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={startGame}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ember px-4 font-semibold text-bone"
              >
                <Play className="size-4" />
                เล่นอีกครั้ง
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-col gap-2 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-ash/30 bg-panel p-1" role="group" aria-label="ความยาวรอบ">
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={playing}
                onClick={() => setDuration(value)}
                className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-semibold ${
                  duration === value ? "bg-lantern text-night" : "text-ash"
                }`}
              >
                {value} วิ
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={startGame}
            disabled={playing}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-lantern px-4 font-semibold text-night disabled:opacity-50"
          >
            <Play className="size-4" />
            {playing ? "กำลังล่าผี" : "เริ่มเกม"}
          </button>
          <button
            type="button"
            onClick={resetHigh}
            disabled={playing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ash/30 bg-panel px-3 text-sm font-semibold text-bone disabled:opacity-50"
          >
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">{armedReset ? "ยืนยันรีเซ็ต" : "รีเซ็ตคะแนนสูงสุด"}</span>
            <span className="sm:hidden">{armedReset ? "ยืนยัน" : "รีเซ็ต"}</span>
          </button>
        </div>
        <p className="text-center text-xs leading-relaxed text-ash">
          เกมจับผีกระสือและผีกระหังออนไลน์ เล่นฟรีบนมือถือ ไม่ต้องสมัคร แตะผีให้ทันและอย่าแตะก้อนกับดัก
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ash">
          <p>
            สะสมทั้งหมด กระสือ {frame.lifeK} · กระหัง {frame.lifeH}
            {playing && (
              <span className="text-bone">
                {" "}
                · รอบนี้ {frame.krasue} / {frame.krahang}
              </span>
            )}
          </p>
          <label className="flex items-center gap-2">
            เสียง
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              defaultValue={0.8}
              aria-label="ระดับเสียง"
              className="accent-lantern"
              onPointerDown={() => unlockAudio()}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
            />
          </label>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent: string;
  hint: string;
}) {
  return (
    <div className="rounded-card border border-ash/25 bg-panel px-3 py-2">
      <div className="flex items-center gap-1 text-xs text-ash">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${accent}`}>{value}</p>
      <p className="hidden truncate text-xs text-ash sm:block">{hint}</p>
    </div>
  );
}
