const KEY = "ghost-catcher-v1";

export type SaveData = {
  version: 1;
  highScore: number;
  lifetimeKrasue: number;
  lifetimeKrahang: number;
};

const EMPTY: SaveData = {
  version: 1,
  highScore: 0,
  lifetimeKrasue: 0,
  lifetimeKrahang: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      highScore: Math.max(0, Number(parsed.highScore) || 0),
      lifetimeKrasue: Math.max(0, Number(parsed.lifetimeKrasue) || 0),
      lifetimeKrahang: Math.max(0, Number(parsed.lifetimeKrahang) || 0),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
