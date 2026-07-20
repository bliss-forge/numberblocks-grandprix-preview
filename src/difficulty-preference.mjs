import { normalizeDifficulty } from "./game-model.mjs";

export const DIFFICULTY_STORAGE_KEY = "numberblocks-difficulty";

export function loadDifficulty(storage = globalThis.localStorage) {
  try {
    return normalizeDifficulty(storage?.getItem(DIFFICULTY_STORAGE_KEY));
  } catch {
    return "steady";
  }
}

export function saveDifficulty(storage, value) {
  const normalized = normalizeDifficulty(value);
  try {
    storage?.setItem(DIFFICULTY_STORAGE_KEY, normalized);
  } catch {
    // Local files and strict privacy settings can block browser storage.
  }
  return normalized;
}
