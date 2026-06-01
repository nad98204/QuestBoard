import AsyncStorage from '@react-native-async-storage/async-storage';
import { BAD_HABITS, GOOD_HABITS, STORAGE_KEY } from './constants';
import {
  AI_COACH_HISTORY_KEY,
  AI_FITNESS_CACHE_KEY,
  AI_HABITS_CACHE_KEY,
  AI_OVERCOME_CACHE_KEY,
  USER_OPENAI_API_KEY_KEY,
} from './aiCoach';
import { DEFAULT_FITNESS_CONFIG, normalizeFitnessConfig } from './rpg';

/** Tất cả key AsyncStorage QuestBoard — dùng khi reset */
export const QUESTBOARD_ASYNC_STORAGE_KEYS = [
  STORAGE_KEY,
  '@questboard/firestore_pending',
  AI_COACH_HISTORY_KEY,
  AI_HABITS_CACHE_KEY,
  AI_FITNESS_CACHE_KEY,
  AI_OVERCOME_CACHE_KEY,
  USER_OPENAI_API_KEY_KEY,
  '@questboard/notification_settings_v1',
  '@questboard/notifications_first_prompt_v1',
  '@questboard/user_firestore_doc_id',
  '@questboard/fitness_config_v1',
  '@questboard/habit_labels_v1',
  '@questboard/bad_habit_labels_v1',
];

export const FITNESS_CONFIG_KEY = '@questboard/fitness_config_v1';
export const HABIT_LABELS_KEY = '@questboard/habit_labels_v1';
export const BAD_HABIT_LABELS_KEY = '@questboard/bad_habit_labels_v1';

export function defaultGoodLabels() {
  return GOOD_HABITS.map((h) => h.label);
}

export function defaultBadLabels() {
  return BAD_HABITS.map((h) => h.label);
}

/** Gắn label tùy chỉnh (mảng theo thứ tự constants); customIcons tuỳ chọn — emoji AI/người dùng */
export function habitsWithCustomLabels(
  definitions,
  customLabels,
  customIcons
) {
  return definitions.map((h, i) => {
    const raw = customLabels?.[i];
    const t = raw != null ? String(raw).trim() : '';
    let icon = h.icon;
    if (
      Array.isArray(customIcons) &&
      customIcons[i] != null &&
      String(customIcons[i]).trim()
    ) {
      icon = String(customIcons[i]).trim();
    }
    return { ...h, label: t || h.label, icon };
  });
}

export async function loadFitnessConfig() {
  try {
    const raw = await AsyncStorage.getItem(FITNESS_CONFIG_KEY);
    if (!raw) return normalizeFitnessConfig(null);
    const p = JSON.parse(raw);
    return normalizeFitnessConfig(p);
  } catch {
    return normalizeFitnessConfig(null);
  }
}

export async function saveFitnessConfig(cfg) {
  const n = normalizeFitnessConfig(cfg);
  await AsyncStorage.setItem(FITNESS_CONFIG_KEY, JSON.stringify(n));
  return n;
}

export async function loadGoodHabitLabels() {
  try {
    const raw = await AsyncStorage.getItem(HABIT_LABELS_KEY);
    if (!raw) return defaultGoodLabels();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return defaultGoodLabels();
    return GOOD_HABITS.map(
      (h, i) =>
        String(arr[i] != null ? arr[i] : h.label).trim() || h.label
    );
  } catch {
    return defaultGoodLabels();
  }
}

export async function saveGoodHabitLabels(labels) {
  const normalized = GOOD_HABITS.map((h, i) => {
    const t = String(labels?.[i] ?? h.label).trim();
    return t || h.label;
  });
  await AsyncStorage.setItem(HABIT_LABELS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function loadBadHabitLabels() {
  try {
    const raw = await AsyncStorage.getItem(BAD_HABIT_LABELS_KEY);
    if (!raw) return defaultBadLabels();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return defaultBadLabels();
    return BAD_HABITS.map(
      (h, i) =>
        String(arr[i] != null ? arr[i] : h.label).trim() || h.label
    );
  } catch {
    return defaultBadLabels();
  }
}

export async function saveBadHabitLabels(labels) {
  const normalized = BAD_HABITS.map((h, i) => {
    const t = String(labels?.[i] ?? h.label).trim();
    return t || h.label;
  });
  await AsyncStorage.setItem(BAD_HABIT_LABELS_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function loadPreferencesBundle() {
  const [fitness, goodLabels, badLabels] = await Promise.all([
    loadFitnessConfig(),
    loadGoodHabitLabels(),
    loadBadHabitLabels(),
  ]);
  return {
    fitness,
    goodLabels,
    badLabels,
  };
}

export function attachPreferencesToState(state, prefs) {
  return {
    ...state,
    fitnessConfig: prefs.fitness,
    goodHabitLabels: prefs.goodLabels,
    badHabitLabels: prefs.badLabels,
  };
}
