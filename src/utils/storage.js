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
import {
  DEATH_DEBUFF_HOURS,
  DEATH_XP_PENALTY,
  STORAGE_KEY,
  GOOD_HABITS,
  BAD_HABITS,
} from './constants';
import {
  attachPreferencesToState,
  loadPreferencesBundle,
  QUESTBOARD_ASYNC_STORAGE_KEYS,
} from './preferences';
import { db } from './firebase';
import { getUserDocumentId } from './deviceId';
import {
  addDaysToKey,
  bumpDifficulty,
  createDefaultStats,
  DEFAULT_FITNESS_CONFIG,
  getStatMilestoneBonus,
  normalizeFitnessConfig,
  normalizeStats,
  getTodayKey,
  isWeekendDateKey,
  pickOvercomeQuests,
  rollDailyExercise,
} from './rpg';
import { checkAndUnlockAchievements } from './achievements';
import {
  fetchDailyFitnessFromAI,
  fetchDailyHabitsFromAI,
  fetchDailyOvercomeFromAI,
  getFitnessBounds,
  getDefaultDailyHabitsPayload,
  getOpenAiApiKeyAsync,
  readCachedDailyFitnessPayload,
  readCachedDailyHabitsPayload,
  readCachedDailyOvercomePayload,
} from './aiCoach';
import { consumeInventoryEffect } from './boss';

const USERS_COLLECTION = 'users';
const BACKUPS_COLLECTION = 'backups';
const BACKUP_SNAPSHOTS_COLLECTION = 'snapshots';
const MAX_BACKUPS = 5;
const AI_COACH_MAX = 50;
const PENDING_FIRESTORE_KEY = '@questboard/firestore_pending';

function getVietnameseWeekdayName(date = new Date()) {
  return [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ][date.getDay()];
}

function removeAiOvercomeQuests(state) {
  const today = state.daily?.date;
  const overcome = state.daily?.overcome;
  if (!today || !Array.isArray(overcome)) return state;
  const hasAiOvercome = overcome.some((q) =>
    String(q?.id ?? '').startsWith('ai-')
  );
  if (!hasAiOvercome) return state;

  const local = pickOvercomeQuests(today, 3).map((q, i) => ({
    ...q,
    done: Boolean(overcome[i]?.done),
  }));
  return {
    ...state,
    daily: {
      ...state.daily,
      overcome: local,
    },
  };
}

function applyAiDailyOvercomePayload(state, payload) {
  const prev = Array.isArray(state.daily?.overcome) ? state.daily.overcome : [];
  const quests = payload.quests.map((q, i) => ({
    ...q,
    done: Boolean(prev[i]?.done),
  }));
  return {
    ...state,
    daily: {
      ...state.daily,
      overcome: quests,
    },
  };
}

async function hydrateAiDailyOvercome(state) {
  const today = state.daily?.date;
  if (!today) {
    console.log('[hydrateAiDailyOvercome] bo qua - khong co daily.date');
    return state;
  }

  const overcome = state.daily?.overcome;
  const alreadyOpenAi = Array.isArray(overcome) && overcome.every((q) =>
    String(q?.id ?? '').startsWith(`openai-overcome-${today}-`)
  );
  if (alreadyOpenAi) return state;

  const cached = await readCachedDailyOvercomePayload(today);
  if (cached) {
    console.log('[hydrateAiDailyOvercome] dung cache', today);
    return applyAiDailyOvercomePayload(state, cached);
  }

  const apiKey = await getOpenAiApiKeyAsync();
  if (!apiKey) {
    console.log(
      '[hydrateAiDailyOvercome] thieu EXPO_PUBLIC_OPENAI_API_KEY - giu pool noi bo'
    );
    return state;
  }

  try {
    const payload = await fetchDailyOvercomeFromAI({
      apiKey,
      weekdayLabel: getVietnameseWeekdayName(),
      dateKey: today,
      history: state.history,
      daily: state.daily,
      profile: state.profile,
    });
    return applyAiDailyOvercomePayload(state, payload);
  } catch (err) {
    console.error('[hydrateAiDailyOvercome] loi', {
      message: err?.message,
      name: err?.name,
    });
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

function hasStartedExercise(exercise) {
  return Boolean(exercise?.runDone || exercise?.pushDone || exercise?.sitDone);
}

function applyAiDailyFitnessPayload(state, payload) {
  return {
    ...state,
    daily: {
      ...state.daily,
      exercise: {
        ...state.daily.exercise,
        ...payload,
        runDone: Boolean(state.daily.exercise?.runDone),
        pushDone: Boolean(state.daily.exercise?.pushDone),
        sitDone: Boolean(state.daily.exercise?.sitDone),
      },
    },
  };
}

async function hydrateAiDailyFitness(state) {
  const today = state.daily?.date;
  if (!today) {
    console.log('[hydrateAiDailyFitness] bo qua - khong co daily.date');
    return state;
  }

  const exercise = state.daily?.exercise ?? {};
  if (exercise.aiFitnessDate === today || hasStartedExercise(exercise)) {
    return state;
  }

  const bounds = getFitnessBounds(
    state.fitnessConfig ?? DEFAULT_FITNESS_CONFIG,
    state.profile?.difficultyMult ?? 1
  );
  const cached = await readCachedDailyFitnessPayload(today, exercise, bounds);
  if (cached) {
    console.log('[hydrateAiDailyFitness] dung cache', today);
    return applyAiDailyFitnessPayload(state, cached);
  }

  const apiKey = await getOpenAiApiKeyAsync();
  if (!apiKey) {
    console.log(
      '[hydrateAiDailyFitness] thieu EXPO_PUBLIC_OPENAI_API_KEY - giu random hien tai'
    );
    return state;
  }

  try {
    const payload = await fetchDailyFitnessFromAI({
      apiKey,
      weekdayLabel: getVietnameseWeekdayName(),
      dateKey: today,
      history: state.history,
      profile: state.profile,
      fitnessConfig: state.fitnessConfig ?? DEFAULT_FITNESS_CONFIG,
      fallbackExercise: exercise,
    });
    return applyAiDailyFitnessPayload(state, payload);
  } catch (err) {
    console.error('[hydrateAiDailyFitness] loi', {
      message: err?.message,
      name: err?.name,
    });
    return state;
  }
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

  const apiKey = await getOpenAiApiKeyAsync();
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
  mana: 50,
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

const MAX_HISTORY_DAYS = 365 * 5;
const MAX_EXPENSE_TRANSACTIONS = 5000;
const MAX_EXPENSE_CATEGORIES = 100;
const BAD_HABIT_KEYS = ['no_social', 'no_junk', 'no_delay'];

function defaultBossState() {
  return {
    currentEvent: null,
    currentBoss: null,
    tasks: [],
    rules: null,
    lootTable: null,
    taskGenerator: null,
    results: [],
    lastSeenBossTemplateIds: [],
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    lastAchievementUnlockedAt: 0,
    notifiedHunterRank: '',
    lastHunterRankUnlockedAt: 0,
  };
}

function defaultInventoryState() {
  return {
    items: {},
    activeEffects: [],
  };
}

function normalizeBossState(raw) {
  const fallback = defaultBossState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;

  return {
    currentEvent:
      raw.currentEvent && typeof raw.currentEvent === 'object'
        ? raw.currentEvent
        : null,
    currentBoss:
      raw.currentBoss && typeof raw.currentBoss === 'object'
        ? raw.currentBoss
        : null,
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.filter((task) => task && typeof task === 'object')
      : [],
    rules: raw.rules && typeof raw.rules === 'object' ? raw.rules : null,
    lootTable:
      raw.lootTable && typeof raw.lootTable === 'object'
        ? raw.lootTable
        : null,
    taskGenerator:
      raw.taskGenerator && typeof raw.taskGenerator === 'object'
        ? raw.taskGenerator
        : null,
    results: Array.isArray(raw.results)
      ? raw.results.filter((result) => result && typeof result === 'object')
      : [],
    lastSeenBossTemplateIds: Array.isArray(raw.lastSeenBossTemplateIds)
      ? raw.lastSeenBossTemplateIds
          .map((id) => String(id ?? '').trim())
          .filter(Boolean)
          .slice(-20)
      : [],
    unlockedAchievementIds: Array.isArray(raw.unlockedAchievementIds)
      ? raw.unlockedAchievementIds
          .map((id) => String(id ?? '').trim())
          .filter(Boolean)
          .slice(-50)
      : [],
    lastUnlockedAchievementIds: Array.isArray(raw.lastUnlockedAchievementIds)
      ? raw.lastUnlockedAchievementIds
          .map((id) => String(id ?? '').trim())
          .filter(Boolean)
          .slice(-10)
      : [],
    lastAchievementUnlockedAt: Number.isFinite(Number(raw.lastAchievementUnlockedAt))
      ? Math.max(0, Math.floor(Number(raw.lastAchievementUnlockedAt)))
      : 0,
    notifiedHunterRank: String(raw.notifiedHunterRank ?? ''),
    lastHunterRankUnlockedAt: Number.isFinite(Number(raw.lastHunterRankUnlockedAt))
      ? Math.max(0, Math.floor(Number(raw.lastHunterRankUnlockedAt)))
      : 0,
  };
}

function normalizeInventoryState(raw) {
  const fallback = defaultInventoryState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback;

  const srcItems =
    raw.items && typeof raw.items === 'object' && !Array.isArray(raw.items)
      ? raw.items
      : {};
  const items = {};
  for (const [key, value] of Object.entries(srcItems)) {
    if (!value || typeof value !== 'object') continue;
    const itemId = String(value.itemId ?? key).trim();
    if (!itemId) continue;
    const quantity = Math.max(0, Math.floor(Number(value.quantity) || 0));
    if (quantity <= 0) continue;
    items[itemId] = {
      ...value,
      itemId,
      quantity,
      lastUsedAt:
        typeof value.lastUsedAt === 'number' ? value.lastUsedAt : null,
    };
  }

  return {
    items,
    activeEffects: Array.isArray(raw.activeEffects)
      ? raw.activeEffects.filter((effect) => effect && typeof effect === 'object')
      : [],
  };
}

function normalizeExpenseTransactions(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((tx, index) => {
      if (!tx || typeof tx !== 'object' || Array.isArray(tx)) return null;

      const amount = Number(tx.amount);
      if (!Number.isFinite(amount) || amount === 0) return null;

      const parsedDate = new Date(tx.dateTime);
      const parsedTime = parsedDate.getTime();
      const fallbackDate = new Date();
      const dateTime = Number.isNaN(parsedTime)
        ? fallbackDate.toISOString()
        : parsedDate.toISOString();

      const description = String(
        tx.description ?? tx.name ?? tx.title ?? ''
      ).trim();
      if (!description) return null;

      const id = String(
        tx.id ?? `${Number.isNaN(parsedTime) ? fallbackDate.getTime() : parsedTime}-${index}`
      ).trim();
      return {
        id,
        description,
        amount,
        category: String(tx.category ?? 'other').trim() || 'other',
        dateTime,
        note: String(tx.note ?? '').trim(),
        createdAt: Number.isFinite(Number(tx.createdAt))
          ? Number(tx.createdAt)
          : Number.isNaN(parsedTime)
            ? fallbackDate.getTime()
            : parsedTime,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, MAX_EXPENSE_TRANSACTIONS);
}

function normalizeExpenseCategories(raw) {
  if (!Array.isArray(raw)) return [];

  const reservedIds = new Set([
    'food',
    'transport',
    'entertainment',
    'work_tools',
    'income',
    'other',
  ]);
  const seen = new Set(reservedIds);

  return raw
    .map((cat, index) => {
      if (!cat || typeof cat !== 'object' || Array.isArray(cat)) return null;

      const label = String(cat.label ?? '').trim();
      if (!label) return null;

      const fallbackId = `custom-${index}`;
      const id = String(cat.id ?? fallbackId)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      if (!id || seen.has(id)) return null;
      seen.add(id);

      return {
        id,
        label,
        icon: String(cat.icon ?? '✦').trim() || '✦',
        color: String(cat.color ?? '#94a3b8').trim() || '#94a3b8',
        type: cat.type === 'income' ? 'income' : 'expense',
        custom: true,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_EXPENSE_CATEGORIES);
}

function applyDeathToProfile(profile) {
  const xpInLevel = Math.max(
    0,
    Math.floor((profile?.xpInLevel ?? 0) * (1 - DEATH_XP_PENALTY))
  );
  return {
    ...profile,
    streak: 0,
    xpInLevel,
    deathDebuffUntil: Date.now() + DEATH_DEBUFF_HOURS * 60 * 60 * 1000,
    hp: 0,
  };
}

function closeUnreportedBadHabits(state) {
  const daily = state?.daily;
  if (!daily?.badHabits) return state;
  const missing = BAD_HABIT_KEYS.filter((key) => daily.badHabits?.[key] == null);
  if (missing.length <= 0) return state;

  if (isWeekendDateKey(daily.date)) {
    const badHabits = { ...daily.badHabits };
    for (const key of missing) {
      badHabits[key] = 'excused';
    }
    return {
      ...state,
      daily: {
        ...daily,
        badHabits,
        badHabitAutoFailBlockedBy: 'Cuoi tuan nghi',
      },
    };
  }

  const milestoneBonus = getStatMilestoneBonus(state.profile?.stats);
  let inventory = normalizeInventoryState(state.inventory);
  const excused = consumeInventoryEffect(inventory, [
    'valid_rest_day',
    'protect_streak',
  ]);
  inventory = excused.inventory;
  const damage = excused.effect
    ? 0
    : missing.length * milestoneBonus.badHabitDamage;
  const beforeHp = Number(state.profile?.hp) || 0;
  let profile = {
    ...state.profile,
    hp: Math.max(0, beforeHp - damage),
    lastAutoFailCount: (state.profile?.lastAutoFailCount ?? 0) + missing.length,
    lastAutoFailDamage: (state.profile?.lastAutoFailDamage ?? 0) + damage,
    lastAutoFailDamageEach: milestoneBonus.badHabitDamage,
    lastAutoFailDate: daily.date,
  };
  if (beforeHp > 0 && profile.hp <= 0) {
    const pardon = consumeInventoryEffect(inventory, 'death_pardon');
    inventory = pardon.inventory;
    profile = pardon.effect
      ? {
          ...profile,
          hp: 1,
          lastAutoFailBlockedBy: pardon.effect.name,
        }
      : applyDeathToProfile(profile);
  }

  const badHabits = { ...daily.badHabits };
  for (const key of missing) {
    badHabits[key] = excused.effect ? 'excused' : 'fail';
  }

  return {
    ...state,
    profile,
    inventory,
    daily: {
      ...daily,
      badHabits,
      badHabitAutoFailCount: (daily.badHabitAutoFailCount ?? 0) + missing.length,
      badHabitAutoFailDamage: (daily.badHabitAutoFailDamage ?? 0) + damage,
      badHabitAutoFailBlockedBy:
        excused.effect?.name ?? daily.badHabitAutoFailBlockedBy,
    },
  };
}

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
  const habitBadOk = BAD_HABIT_KEYS.filter((k) => daily.badHabits?.[k] === 'ok').length;
  const habitBadTotal = BAD_HABIT_KEYS.length;
  const overcome = daily.overcome ?? [];
  const overcomeDone = overcome.filter((q) => q.done).length;
  const overcomeTotal = overcome.length > 0 ? overcome.length : 3;
  const overcomeTitles = overcome
    .map((q) => String(q?.title ?? '').trim())
    .filter(Boolean);

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
    overcomeTitles,
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
    overcomeTitles:
      snap.overcomeTitles.length > 0
        ? snap.overcomeTitles
        : (Array.isArray(prevRow?.overcomeTitles) ? prevRow.overcomeTitles : []),
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
    sleepCheckDate: addDaysToKey(today, -1),
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
    hpHealedToday: 0,
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
    boss: defaultBossState(),
    inventory: defaultInventoryState(),
    expenses: [],
    expenseCategories: [],
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
    mana: Math.max(0, Math.round(Number(data.profile?.mana) || 50)),
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
    boss: normalizeBossState(data.boss),
    inventory: normalizeInventoryState(data.inventory),
    expenses: normalizeExpenseTransactions(data.expenses),
    expenseCategories: normalizeExpenseCategories(data.expenseCategories),
  };
}

function toPersistedPayload(state) {
  const base = {
    profile: state.profile,
    daily: state.daily,
    history: Array.isArray(state.history) ? state.history : [],
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
    aiCoachHistory: sanitizeAiCoachHistory(state.aiCoachHistory),
    boss: normalizeBossState(state.boss),
    inventory: normalizeInventoryState(state.inventory),
    expenses: normalizeExpenseTransactions(state.expenses),
    expenseCategories: normalizeExpenseCategories(state.expenseCategories),
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
  let workingState = state;
  let { profile, daily, updatedAt } = workingState;
  const fc = state.fitnessConfig ?? DEFAULT_FITNESS_CONFIG;

  if (profile.lastDailyDate === today) {
    if (daily && daily.date === today) return workingState;
    return {
      ...workingState,
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
      ...workingState,
      profile,
      daily: freshDailyPayload(today, mult, fc),
      updatedAt,
    };
  }

  workingState = closeUnreportedBadHabits(workingState);
  profile = workingState.profile;
  daily = workingState.daily;

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
  return { ...workingState, profile, daily, updatedAt };
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
    boss: normalizeBossState(state.boss),
    inventory: normalizeInventoryState(state.inventory),
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

  const rolled = removeAiOvercomeQuests(rollNewDayIfNeeded(merged));
  const withFitnessAi = await hydrateAiDailyFitness(rolled);
  const withOvercomeAi = await hydrateAiDailyOvercome(withFitnessAi);
  const withHabitsAi = await hydrateAiDailyHabits(withOvercomeAi);

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
