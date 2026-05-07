import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { STORAGE_KEY, GOOD_HABITS, BAD_HABITS } from './constants';
import {
  attachPreferencesToState,
  loadPreferencesBundle,
  QUESTBOARD_ASYNC_STORAGE_KEYS,
} from './preferences';
import { db } from './firebase';
import { getUserDocumentId } from './deviceId';
import {
  fetchOvercomeQuestsFromGemini,
  getVietnameseWeekdayName,
} from './gemini';
import {
  addDaysToKey,
  bumpDifficulty,
  createDefaultStats,
  DEFAULT_FITNESS_CONFIG,
  normalizeFitnessConfig,
  normalizeStats,
  getTodayKey,
  pickOvercomeQuests,
  rollDailyExercise,
} from './rpg';
import { checkAndUnlockAchievements } from './achievements';
import {
  fetchDailyHabitsFromAI,
  getDefaultDailyHabitsPayload,
  getOpenAiApiKey,
  readCachedDailyHabitsPayload,
} from './aiCoach';

const USERS_COLLECTION = 'users';
const BACKUPS_COLLECTION = 'backups';
const BACKUP_SNAPSHOTS_COLLECTION = 'snapshots';
const MAX_BACKUPS = 5;
const AI_COACH_MAX = 50;
const PENDING_FIRESTORE_KEY = '@questboard/firestore_pending';
const AI_OVERCOME_CACHE_KEY = '@questboard/ai_overcome_by_date_v1';

function getGeminiApiKey() {
  return (
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.EXPO_PUBLIC_GEMINI_API_KEY) ||
    ''
  );
}

function isAiOvercomePersistedForDay(overcome, today) {
  if (!Array.isArray(overcome) || overcome.length !== 3) return false;
  const prefix = `ai-${today}-`;
  return overcome.every(
    (q, i) => typeof q?.id === 'string' && q.id === `${prefix}${i}`
  );
}

function clampOvercomeXp(xp) {
  const v = Math.round(Number(xp));
  if (!Number.isFinite(v)) return 60;
  return Math.min(150, Math.max(60, v));
}

function buildOvercomeFromAiList(rows, today) {
  return rows.map((row, i) => ({
    id: `ai-${today}-${i}`,
    title: row.title,
    xp: clampOvercomeXp(row.xp),
    done: false,
  }));
}

async function readAiOvercomeCache() {
  try {
    const raw = await AsyncStorage.getItem(AI_OVERCOME_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAiOvercomeCache(today, minimalQuests) {
  const cache = await readAiOvercomeCache();
  cache[today] = minimalQuests.map((q) => ({ title: q.title, xp: q.xp }));
  await AsyncStorage.setItem(AI_OVERCOME_CACHE_KEY, JSON.stringify(cache));
}

/** Giữ cache theo ngày; ghép cờ done từ state đã lưu nếu cùng id. */
async function hydrateAiOvercomeQuests(state) {
  const envKeyDefined =
    typeof process !== 'undefined' &&
    process.env &&
    Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
  console.log(
    '[hydrateAiOvercomeQuests] EXPO_PUBLIC_GEMINI_API_KEY có tồn tại:',
    envKeyDefined
  );

  const today = state.daily?.date;
  if (!today) {
    console.log('[hydrateAiOvercomeQuests] bỏ qua — không có daily.date');
    return state;
  }

  const overcome = state.daily.overcome;
  const alreadyAiPersisted = isAiOvercomePersistedForDay(overcome, today);
  console.log('[hydrateAiOvercomeQuests] check', {
    today,
    alreadyAiPersisted,
  });

  if (alreadyAiPersisted) {
    console.log(
      '[hydrateAiOvercomeQuests] giữ state — đã persist 3 quest AI cho ngày này'
    );
    return state;
  }

  const cache = await readAiOvercomeCache();
  const cached = cache[today];
  const cacheHit = Array.isArray(cached) && cached.length === 3;
  console.log('[hydrateAiOvercomeQuests] cache cho ngày', {
    today,
    cacheHit,
    cachedLength: Array.isArray(cached) ? cached.length : 0,
  });

  if (cacheHit) {
    const built = buildOvercomeFromAiList(
      cached.map((c) => ({
        title: String(c.title ?? c.name ?? '').trim(),
        xp: clampOvercomeXp(c.xp),
      })),
      today
    );
    const prevById = Object.fromEntries(
      (overcome || []).filter((q) => q?.id).map((q) => [q.id, q.done])
    );
    const merged = built.map((q) => ({
      ...q,
      done: Boolean(prevById[q.id]),
    }));
    return { ...state, daily: { ...state.daily, overcome: merged } };
  }

  const apiKey = getGeminiApiKey();
  const hasApiKey = Boolean(apiKey);
  console.log('[hydrateAiOvercomeQuests] trước khi gọi Gemini', {
    today,
    alreadyAiPersisted: false,
    cacheHit: false,
    envKeyDefined,
    hasApiKey,
    sẽGọiGemini: hasApiKey,
    streak: state.profile.streak,
    level: state.profile.level,
    weekdayLabel: getVietnameseWeekdayName(),
  });

  if (!apiKey) {
    console.log(
      '[hydrateAiOvercomeQuests] không gọi Gemini — thiếu apiKey (kiểm tra .env / EXPO_PUBLIC_)'
    );
    return state;
  }

  try {
    const rows = await fetchOvercomeQuestsFromGemini({
      apiKey,
      weekdayLabel: getVietnameseWeekdayName(),
      dateKey: today,
      streak: state.profile.streak,
      level: state.profile.level,
    });
    await writeAiOvercomeCache(today, rows);
    const built = buildOvercomeFromAiList(rows, today);
    const prevById = Object.fromEntries(
      (overcome || []).filter((q) => q?.id).map((q) => [q.id, q.done])
    );
    const merged = built.map((q) => ({
      ...q,
      done: Boolean(prevById[q.id]),
    }));
    return { ...state, daily: { ...state.daily, overcome: merged } };
  } catch (err) {
    console.error('[hydrateAiOvercomeQuests] lỗi sau khi gọi Gemini', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      cause: err?.cause,
    });
    console.error('[hydrateAiOvercomeQuests] lỗi (raw):', err);
    return state;
  }
}

function applyAiDailyHabitsPayload(state, payload) {
  return {
    ...state,
    goodHabitLabels: payload.goodHabits.map((h) => h.label),
    badHabitLabels: payload.badHabits.map((h) => h.label),
    goodHabitIcons: payload.goodHabits.map((h) => h.icon),
    badHabitIcons: payload.badHabits.map((h) => h.icon),
  };
}

/** Cache → API OpenAI 1 lần/ngày; lỗi thì dùng GOOD_HABITS/BAD_HABITS mặc định */
async function hydrateAiDailyHabits(state) {
  const today = state.daily?.date;
  if (!today) {
    console.log('[hydrateAiDailyHabits] bỏ qua — không có daily.date');
    return state;
  }

  const cached = await readCachedDailyHabitsPayload(today);
  if (cached) {
    console.log('[hydrateAiDailyHabits] dùng cache', today);
    return applyAiDailyHabitsPayload(state, cached);
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    console.log(
      '[hydrateAiDailyHabits] thiếu EXPO_PUBLIC_OPENAI_API_KEY — dùng habits mặc định'
    );
    return applyAiDailyHabitsPayload(state, getDefaultDailyHabitsPayload());
  }

  try {
    const payload = await fetchDailyHabitsFromAI({
      apiKey,
      weekdayLabel: getVietnameseWeekdayName(),
      dateKey: today,
      streak: state.profile?.streak ?? 0,
      level: state.profile?.level ?? 1,
    });
    return applyAiDailyHabitsPayload(state, payload);
  } catch (err) {
    console.error('[hydrateAiDailyHabits] lỗi', {
      message: err?.message,
      name: err?.name,
    });
    return applyAiDailyHabitsPayload(state, getDefaultDailyHabitsPayload());
  }
}

const DEFAULT_PROFILE = () => ({
  level: 1,
  xpInLevel: 0,
  totalXpEarned: 0,
  hp: 100,
  maxHp: 100,
  streak: 0,
  lastQuestDate: null,
  difficultyMult: 1,
  lastDailyDate: null,
  todayXpBaseline: 0,
  recordStreak: 0,
  lifetimeQuestsCompleted: 0,
  lifetimeExercisePerfectDays: 0,
  lifetimeReadHabitDays: 0,
  lifetimeOvercomeCompleted: 0,
  stats: createDefaultStats(),
});

const MAX_HISTORY_DAYS = 30;

/** Ảnh chụp tiến độ quest trong ngày (cho history & tỉ lệ). */
export function snapshotDailyForHistory(daily) {
  const workTotal = daily.workTasks?.length ?? 0;
  const workDone = (daily.workTasks ?? []).filter((w) => w.done).length;
  const ex = daily.exercise ?? {};
  const exerciseDone =
    (ex.runDone ? 1 : 0) + (ex.pushDone ? 1 : 0) + (ex.sitDone ? 1 : 0);
  const exerciseTotal = 3;
  const habitKeys = ['sleep', 'water', 'meditate', 'read'];
  const habitGoodDone = habitKeys.filter((k) => daily.goodHabits?.[k]).length;
  const habitGoodTotal = habitKeys.length;
  const badKeys = ['no_social', 'no_junk', 'no_delay'];
  const habitBadOk = badKeys.filter((k) => daily.badHabits?.[k] === 'ok').length;
  const habitBadTotal = badKeys.length;
  const overcome = daily.overcome ?? [];
  const overcomeDone = overcome.filter((q) => q.done).length;
  const overcomeTotal = overcome.length > 0 ? overcome.length : 3;

  const questsDone =
    workDone +
    exerciseDone +
    habitGoodDone +
    habitBadOk +
    overcomeDone;

  return {
    workDone,
    workTotal,
    exerciseDone,
    exerciseTotal,
    habitGoodDone,
    habitGoodTotal,
    habitBadOk,
    habitBadTotal,
    overcomeDone,
    overcomeTotal,
    questsDone,
    readDone: !!daily.goodHabits?.read,
  };
}

/**
 * Gộp snapshot hôm nay vào history[], cập nhật kỷ lục streak & tổng quest lifetime.
 * Mỗi phần tử: { date, xpEarned, questsDone, level, ...tiến độ theo loại }.
 */
export function mergeHistoryIntoState(state) {
  if (!state?.daily?.date) return state;

  const history = [...(state.history ?? [])];
  const date = state.daily.date;
  const prevRow = history.find((h) => h.date === date);

  const baseline = state.profile.todayXpBaseline ?? 0;
  const xpEarned = Math.max(
    0,
    (state.profile.totalXpEarned ?? 0) - baseline
  );

  const snap = snapshotDailyForHistory(state.daily);

  const mergedRow = {
    date,
    xpEarned,
    questsDone: Math.max(prevRow?.questsDone ?? 0, snap.questsDone),
    level: state.profile.level,
    workDone: Math.max(prevRow?.workDone ?? 0, snap.workDone),
    workTotal: Math.max(prevRow?.workTotal ?? 0, snap.workTotal),
    exerciseDone: Math.max(prevRow?.exerciseDone ?? 0, snap.exerciseDone),
    exerciseTotal: Math.max(prevRow?.exerciseTotal ?? 0, snap.exerciseTotal),
    habitGoodDone: Math.max(prevRow?.habitGoodDone ?? 0, snap.habitGoodDone),
    habitGoodTotal: Math.max(prevRow?.habitGoodTotal ?? 0, snap.habitGoodTotal),
    habitBadOk: Math.max(prevRow?.habitBadOk ?? 0, snap.habitBadOk),
    habitBadTotal: Math.max(prevRow?.habitBadTotal ?? 0, snap.habitBadTotal),
    overcomeDone: Math.max(prevRow?.overcomeDone ?? 0, snap.overcomeDone),
    overcomeTotal: Math.max(prevRow?.overcomeTotal ?? 0, snap.overcomeTotal),
    readDone: !!(prevRow?.readDone || snap.readDone),
  };

  const prevEx = prevRow?.exerciseDone ?? 0;
  const newEx = mergedRow.exerciseDone;
  const prevRead = !!prevRow?.readDone;
  const prevOc = prevRow?.overcomeDone ?? 0;
  const newOc = mergedRow.overcomeDone;
  const dOc = Math.max(0, newOc - prevOc);

  let profileExtras = {};
  if (newEx >= 3 && prevEx < 3) {
    profileExtras.lifetimeExercisePerfectDays =
      (state.profile.lifetimeExercisePerfectDays ?? 0) + 1;
  }
  if (snap.readDone && !prevRead) {
    profileExtras.lifetimeReadHabitDays =
      (state.profile.lifetimeReadHabitDays ?? 0) + 1;
  }
  if (dOc > 0) {
    profileExtras.lifetimeOvercomeCompleted =
      (state.profile.lifetimeOvercomeCompleted ?? 0) + dOc;
  }

  let nextHist = [...history.filter((h) => h.date !== date), mergedRow];
  nextHist.sort((a, b) => a.date.localeCompare(b.date));
  if (nextHist.length > MAX_HISTORY_DAYS) {
    nextHist = nextHist.slice(nextHist.length - MAX_HISTORY_DAYS);
  }

  const deltaQuests = mergedRow.questsDone - (prevRow?.questsDone ?? 0);
  const lifetimeQuestsCompleted =
    (state.profile.lifetimeQuestsCompleted ?? 0) +
    Math.max(0, deltaQuests);

  const recordStreak = Math.max(
    state.profile.recordStreak ?? state.profile.streak ?? 0,
    state.profile.streak ?? 0
  );

  return {
    ...state,
    history: nextHist,
    profile: {
      ...state.profile,
      ...profileExtras,
      lifetimeQuestsCompleted,
      recordStreak,
    },
  };
}

function freshDailyPayload(today, difficultyMult, fitnessConfig) {
  const fc =
    fitnessConfig != null
      ? normalizeFitnessConfig(fitnessConfig)
      : normalizeFitnessConfig(null);
  const exercise = rollDailyExercise(today, difficultyMult, fc);
  return {
    date: today,
    workTasks: [],
    exercise: {
      ...exercise,
      runDone: false,
      pushDone: false,
      sitDone: false,
    },
    goodHabits: Object.fromEntries(
      ['sleep', 'water', 'meditate', 'read'].map((k) => [k, false])
    ),
    badHabits: Object.fromEntries(
      ['no_social', 'no_junk', 'no_delay'].map((k) => [k, null])
    ),
    overcome: pickOvercomeQuests(today, 3),
  };
}

export function createInitialState() {
  const today = getTodayKey();
  const profile = DEFAULT_PROFILE();
  profile.lastDailyDate = today;
  profile.difficultyMult = 1;
  profile.todayXpBaseline = 0;
  const fitnessConfig = { ...normalizeFitnessConfig(null) };
  return {
    profile,
    daily: freshDailyPayload(today, profile.difficultyMult, fitnessConfig),
    history: [],
    fitnessConfig,
    goodHabitLabels: GOOD_HABITS.map((h) => h.label),
    badHabitLabels: BAD_HABITS.map((h) => h.label),
    achievements: [],
    aiCoachHistory: [],
    updatedAt: Date.now(),
  };
}

function sanitizeAiCoachHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.text === 'string'
    )
    .map((m) => ({
      id: String(m.id ?? `${Date.now()}-${Math.random()}`),
      role: m.role,
      text: m.text,
      ...(typeof m.modelRaw === 'string' ? { modelRaw: m.modelRaw } : {}),
    }));
  return out.length > AI_COACH_MAX ? out.slice(out.length - AI_COACH_MAX) : out;
}

function migrateGoodHabitLabelsFromData(data, initLabels) {
  if (!Array.isArray(data.goodHabitLabels) || data.goodHabitLabels.length < 4) {
    return [...initLabels];
  }
  return GOOD_HABITS.map((h, i) => {
    const t = String(data.goodHabitLabels[i] ?? '').trim();
    return t || h.label;
  });
}

function migrateBadHabitLabelsFromData(data, initLabels) {
  if (!Array.isArray(data.badHabitLabels) || data.badHabitLabels.length < 3) {
    return [...initLabels];
  }
  return BAD_HABITS.map((h, i) => {
    const t = String(data.badHabitLabels[i] ?? '').trim();
    return t || h.label;
  });
}

function migrateHabitIconsFromData(iconArr, defs) {
  if (!Array.isArray(iconArr) || iconArr.length < defs.length) return undefined;
  return defs.map((h, i) => {
    const t = String(iconArr[i] ?? '').trim();
    return t || h.icon;
  });
}

function migrateParsed(data) {
  const init = createInitialState();
  if (!data || typeof data !== 'object') return init;
  const mergedProfile = {
    ...init.profile,
    ...data.profile,
    todayXpBaseline:
      typeof data.profile?.todayXpBaseline === 'number'
        ? data.profile.todayXpBaseline
        : (data.profile?.totalXpEarned ?? init.profile.todayXpEarned ?? 0),
    recordStreak: Math.max(
      data.profile?.recordStreak ?? 0,
      data.profile?.streak ?? 0
    ),
    lifetimeQuestsCompleted: data.profile?.lifetimeQuestsCompleted ?? 0,
    lifetimeExercisePerfectDays:
      data.profile?.lifetimeExercisePerfectDays ?? 0,
    lifetimeReadHabitDays: data.profile?.lifetimeReadHabitDays ?? 0,
    lifetimeOvercomeCompleted:
      data.profile?.lifetimeOvercomeCompleted ?? 0,
    stats: normalizeStats(data.profile?.stats),
  };
  const rawHist = Array.isArray(data.history) ? data.history : [];
  const history = rawHist
    .filter((row) => row && typeof row.date === 'string')
    .slice(-MAX_HISTORY_DAYS);

  return {
    profile: mergedProfile,
    daily: { ...init.daily, ...data.daily },
    history,
    fitnessConfig:
      data.fitnessConfig != null
        ? normalizeFitnessConfig(data.fitnessConfig)
        : init.fitnessConfig,
    goodHabitLabels: migrateGoodHabitLabelsFromData(data, init.goodHabitLabels),
    badHabitLabels: migrateBadHabitLabelsFromData(data, init.badHabitLabels),
    goodHabitIcons: migrateHabitIconsFromData(data.goodHabitIcons, GOOD_HABITS),
    badHabitIcons: migrateHabitIconsFromData(data.badHabitIcons, BAD_HABITS),
    achievements: Array.isArray(data.achievements)
      ? data.achievements
          .filter(
            (a) =>
              a &&
              typeof a.id === 'string' &&
              typeof a.unlockedAt === 'number'
          )
          .slice()
      : [],
    updatedAt:
      typeof data.updatedAt === 'number' ? data.updatedAt : 0,
    aiCoachHistory: sanitizeAiCoachHistory(data.aiCoachHistory),
  };
}

function toPersistedPayload(state) {
  const base = {
    profile: state.profile,
    daily: state.daily,
    history: Array.isArray(state.history) ? state.history : [],
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
    aiCoachHistory: sanitizeAiCoachHistory(state.aiCoachHistory),
    fitnessConfig:
      state.fitnessConfig != null
        ? normalizeFitnessConfig(state.fitnessConfig)
        : normalizeFitnessConfig(null),
    goodHabitLabels: Array.isArray(state.goodHabitLabels)
      ? state.goodHabitLabels
      : GOOD_HABITS.map((h) => h.label),
    badHabitLabels: Array.isArray(state.badHabitLabels)
      ? state.badHabitLabels
      : BAD_HABITS.map((h) => h.label),
    updatedAt:
      typeof state.updatedAt === 'number' ? state.updatedAt : Date.now(),
  };
  if (Array.isArray(state.goodHabitIcons)) {
    base.goodHabitIcons = state.goodHabitIcons;
  }
  if (Array.isArray(state.badHabitIcons)) {
    base.badHabitIcons = state.badHabitIcons;
  }
  return base;
}

/** Ngày mới — dùng fitnessConfig trong state */
export function rollNewDayIfNeeded(state) {
  const today = getTodayKey();
  let { profile, daily, updatedAt } = state;
  const fc = state.fitnessConfig ?? DEFAULT_FITNESS_CONFIG;

  if (profile.lastDailyDate === today) {
    if (daily && daily.date === today) return state;
    return {
      ...state,
      profile,
      daily: freshDailyPayload(today, profile.difficultyMult, fc),
      updatedAt,
    };
  }

  let mult = profile.difficultyMult;
  let cursor = profile.lastDailyDate;

  if (!cursor) {
    profile = {
      ...profile,
      lastDailyDate: today,
      todayXpBaseline: profile.totalXpEarned,
    };
    return {
      ...state,
      profile,
      daily: freshDailyPayload(today, mult, fc),
      updatedAt,
    };
  }

  while (cursor !== today) {
    mult = bumpDifficulty(mult);
    const next = addDaysToKey(cursor, 1);
    cursor = next;
  }

  profile = {
    ...profile,
    lastDailyDate: today,
    difficultyMult: mult,
    todayXpBaseline: profile.totalXpEarned,
  };

  daily = freshDailyPayload(today, mult, fc);
  return { ...state, profile, daily, updatedAt };
}

export function resetTodayQuests(state) {
  if (!state) return state;
  const today = getTodayKey();
  const profile = state.profile ?? DEFAULT_PROFILE();
  const fc = state.fitnessConfig ?? DEFAULT_FITNESS_CONFIG;

  return {
    ...state,
    profile,
    daily: freshDailyPayload(today, profile.difficultyMult ?? 1, fc),
    history: Array.isArray(state.history) ? state.history : [],
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
  };
}

async function flushPendingFirestoreWrite() {
  try {
    const pendingRaw = await AsyncStorage.getItem(PENDING_FIRESTORE_KEY);
    if (!pendingRaw) return;

    const payload = JSON.parse(pendingRaw);
    const userId = await getUserDocumentId();
    await setDoc(doc(db, USERS_COLLECTION, userId), payload, {
      merge: true,
    });
    await AsyncStorage.removeItem(PENDING_FIRESTORE_KEY);
  } catch {
    /* vẫn offline hoặc lỗi mạng */
  }
}

async function pushToFirestore(payload) {
  const userId = await getUserDocumentId();
  await setDoc(doc(db, USERS_COLLECTION, userId), payload, { merge: true });
}

function backupSnapshotsCollection(userId) {
  return collection(
    db,
    BACKUPS_COLLECTION,
    userId,
    BACKUP_SNAPSHOTS_COLLECTION
  );
}

function getBackupSummaryFromPayload(id, data) {
  const state = data?.state ?? data ?? {};
  const profile = state.profile ?? {};
  return {
    id,
    timestamp: Number(data?.timestamp ?? id) || 0,
    level: data?.level ?? profile.level ?? 1,
    xp: data?.xp ?? profile.totalXpEarned ?? 0,
    streak: data?.streak ?? profile.streak ?? 0,
    questsDone:
      data?.questsDone ?? profile.lifetimeQuestsCompleted ?? 0,
  };
}

export async function createBackup(state) {
  const userId = await getUserDocumentId();
  const timestamp = Date.now();
  const payload = {
    ...toPersistedPayload(state),
    updatedAt: state?.updatedAt ?? timestamp,
  };
  const profile = payload.profile ?? {};
  const backupsRef = backupSnapshotsCollection(userId);

  await setDoc(doc(backupsRef, String(timestamp)), {
    timestamp,
    state: payload,
    level: profile.level ?? 1,
    xp: profile.totalXpEarned ?? 0,
    streak: profile.streak ?? 0,
    questsDone: profile.lifetimeQuestsCompleted ?? 0,
    createdAt: timestamp,
  });

  const snap = await getDocs(query(backupsRef, orderBy('timestamp', 'desc')));
  const staleDocs = snap.docs.slice(MAX_BACKUPS);
  await Promise.all(staleDocs.map((d) => deleteDoc(d.ref)));

  return timestamp;
}

export async function listBackups() {
  const userId = await getUserDocumentId();
  const backupsRef = backupSnapshotsCollection(userId);
  const snap = await getDocs(
    query(backupsRef, orderBy('timestamp', 'desc'), limit(MAX_BACKUPS))
  );

  return snap.docs.map((d) => getBackupSummaryFromPayload(d.id, d.data()));
}

export async function restoreBackup(backupId) {
  const userId = await getUserDocumentId();
  const backupRef = doc(
    db,
    BACKUPS_COLLECTION,
    userId,
    BACKUP_SNAPSHOTS_COLLECTION,
    String(backupId)
  );
  const snap = await getDoc(backupRef);
  if (!snap.exists()) {
    throw new Error('Không tìm thấy backup.');
  }

  const raw = snap.data();
  const restored = migrateParsed(raw?.state ?? raw);
  const payload = {
    ...toPersistedPayload(restored),
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  await flushPendingFirestoreWrite();
  await setDoc(doc(db, USERS_COLLECTION, userId), payload);
  await AsyncStorage.removeItem(PENDING_FIRESTORE_KEY);

  return migrateParsed(payload);
}

export async function loadState() {
  let localParsed = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) localParsed = JSON.parse(raw);
  } catch {
    localParsed = null;
  }

  await flushPendingFirestoreWrite();

  let merged = localParsed ? migrateParsed(localParsed) : null;

  try {
    const userId = await getUserDocumentId();
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (snap.exists()) {
      const remote = snap.data();
      const remoteMerged = migrateParsed(remote);
      const localTs = merged?.updatedAt ?? 0;
      const remoteTs = remoteMerged.updatedAt ?? 0;
      if (!merged || remoteTs > localTs) {
        merged = remoteMerged;
      }
    }
  } catch {
    /* chỉ dùng cache local */
  }

  if (!merged) {
    merged = createInitialState();
  }

  const prefs = await loadPreferencesBundle();
  merged = attachPreferencesToState(merged, prefs);

  const rolled = rollNewDayIfNeeded(merged);
  const withAi = await hydrateAiOvercomeQuests(rolled);
  const withHabitsAi = await hydrateAiDailyHabits(withAi);

  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(toPersistedPayload(withHabitsAi))
    );
  } catch {
    /* ignore */
  }

  return withHabitsAi;
}

export async function saveState(state, options = {}) {
  const withHistory = options.skipHistoryMerge
    ? state
    : mergeHistoryIntoState(state);
  const { nextState, newlyUnlocked } =
    checkAndUnlockAchievements(withHistory);
  const payload = {
    ...toPersistedPayload(nextState),
    updatedAt: Date.now(),
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    console.log('[QuestBoard saveState] AsyncStorage đã lưu');
  } catch (e) {
    console.warn('[QuestBoard saveState] AsyncStorage lỗi', e?.message ?? e);
  }

  let userId;
  try {
    userId = await getUserDocumentId();
    console.log('[QuestBoard saveState] Gọi Firestore', {
      path: `${USERS_COLLECTION}/${userId}`,
      updatedAt: payload.updatedAt,
    });
    await flushPendingFirestoreWrite();
    await pushToFirestore(payload);
    await AsyncStorage.removeItem(PENDING_FIRESTORE_KEY);
    console.log('[QuestBoard saveState] Firestore setDoc hoàn tất');
  } catch (e) {
    console.warn('[QuestBoard saveState] Firestore setDoc thất bại', {
      message: e?.message,
      code: e?.code,
      err: e,
    });
    try {
      await AsyncStorage.setItem(
        PENDING_FIRESTORE_KEY,
        JSON.stringify(payload)
      );
      console.log('[QuestBoard saveState] Đã ghi hàng đợi đồng bộ offline');
    } catch (pe) {
      console.warn(
        '[QuestBoard saveState] Không ghi được pending sync',
        pe?.message ?? pe
      );
    }
  }

  return { newlyUnlocked, nextState };
}

/** Xóa mọi key QuestBoard trong AsyncStorage, khởi tạo lại và đẩy lên Firestore. */
export async function hardResetQuestboardData() {
  await AsyncStorage.multiRemove(QUESTBOARD_ASYNC_STORAGE_KEYS);
  let fresh = createInitialState();
  const prefs = await loadPreferencesBundle();
  fresh = attachPreferencesToState(fresh, prefs);
  fresh = mergeHistoryIntoState(fresh);
  const { nextState: afterAch } = checkAndUnlockAchievements(fresh);
  const payload = {
    ...toPersistedPayload(afterAch),
    updatedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  try {
    await flushPendingFirestoreWrite();
    await pushToFirestore(payload);
    await AsyncStorage.removeItem(PENDING_FIRESTORE_KEY);
  } catch {
    try {
      await AsyncStorage.setItem(PENDING_FIRESTORE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }
}
