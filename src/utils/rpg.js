import {
  DEATH_DEBUFF_HOURS,
  DEATH_DEBUFF_XP_MULT,
  DEATH_XP_PENALTY,
  DIFFICULTY_DAILY_MULT,
  OVERCOME_POOL,
  OVERCOME_XP,
  REVIVAL_HP,
  STATS,
  PENALTY_THRESHOLD,
  PENALTY_QUESTS,
} from './constants';

export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function streakMultiplier(streak) {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
}

export function advanceStreak(profile) {
  const today = getTodayKey();
  const { lastQuestDate, streak } = profile;
  if (lastQuestDate === today) return profile;
  const y = addDaysToKey(today, -1);
  const nextStreak = lastQuestDate === y ? streak + 1 : 1;
  return { ...profile, streak: nextStreak, lastQuestDate: today };
}

export function xpToNextLevel(level) {
  return 80 + (level - 1) * 45;
}

export function isDead(profile) {
  return Number(profile?.hp) <= 0;
}

export function applyDeath(profile) {
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

export function hasDeathDebuff(profile) {
  return Date.now() < (profile?.deathDebuffUntil ?? 0);
}

export function revive(profile) {
  return {
    ...profile,
    hp: REVIVAL_HP,
  };
}

export function getCharacterTitle(level) {
  if (level >= 50) return 'Bất tử';
  if (level >= 30) return 'Huyền thoại';
  if (level >= 20) return 'Anh hùng';
  if (level >= 15) return 'Hiệp sĩ';
  if (level >= 10) return 'Dũng sĩ';
  if (level >= 5) return 'Chiến binh';
  return 'Người mới';
}

export function getPassiveBonus(level) {
  return {
    maxHp: 100 + (level >= 30 ? 20 : 0) + (level >= 5 ? 10 : 0),
    healPerAction: level >= 10 ? 4 : 3,
    xpBonus: level >= 20 ? 1.05 : 1.0,
    statBonusCap: level >= 50 ? 2.0 : 1.5,
  };
}

export const STAT_MAX_LEVEL = 100;

export function expToNextStatLevel(level) {
  return 50 + level * 20;
}

export function createDefaultStats() {
  return Object.fromEntries(
    Object.keys(STATS).map((key) => [
      key,
      {
        level: 1,
        xpInLevel: 0,
        totalXpEarned: 0,
      },
    ])
  );
}

function clampStatLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return 1;
  return Math.min(STAT_MAX_LEVEL, Math.max(1, n));
}

export function normalizeStats(rawStats) {
  const fallback = createDefaultStats();
  const src =
    rawStats && typeof rawStats === 'object' && !Array.isArray(rawStats)
      ? rawStats
      : {};

  return Object.fromEntries(
    Object.keys(STATS).map((key) => {
      const raw = src[key] ?? {};
      const level = clampStatLevel(raw.level);
      const xpInLevelRaw = Math.max(0, Math.round(Number(raw.xpInLevel) || 0));
      return [
        key,
        {
          ...fallback[key],
          ...raw,
          level,
          xpInLevel: level >= STAT_MAX_LEVEL ? 0 : xpInLevelRaw,
          totalXpEarned: Math.max(
            0,
            Math.round(Number(raw.totalXpEarned) || 0)
          ),
        },
      ];
    })
  );
}

export function getStatBonus(profile) {
  const stats = normalizeStats(profile?.stats);
  const totalLevel = Object.values(stats).reduce(
    (sum, stat) => sum + stat.level,
    0
  );
  const baseLevel = Object.keys(STATS).length;
  const bonusSteps = Math.floor(Math.max(0, totalLevel - baseLevel) / 10);
  const cap = getPassiveBonus(profile?.level ?? 1).statBonusCap;
  return Math.min(cap, 1 + bonusSteps * 0.02);
}

export function getStatMilestoneBonus(stats) {
  const normalized = normalizeStats(stats);
  return {
    badHabitDamage: normalized.spirit.level >= 5 ? 14 : 18,
    badHabitOkXp: normalized.discipline.level >= 5 ? 16 : 12,
    overcomeXpMult: normalized.wisdom.level >= 5 ? 1.1 : 1.0,
    strengthFitnessX2: normalized.strength.level >= 10,
    enduranceFitnessX2: normalized.endurance.level >= 10,
  };
}

export function applyStatGain(profile, statName, amount) {
  if (!STATS[statName]) return profile;

  const stats = normalizeStats(profile?.stats);
  const current = stats[statName];
  if (current.level >= STAT_MAX_LEVEL) {
    return {
      ...profile,
      stats: {
        ...stats,
        [statName]: {
          ...current,
          xpInLevel: 0,
        },
      },
    };
  }

  const gain = Math.max(0, Math.round(Number(amount) || 0));
  let level = current.level;
  let xpInLevel = current.xpInLevel + gain;
  const totalXpEarned = current.totalXpEarned + gain;

  let cap = expToNextStatLevel(level);
  while (level < STAT_MAX_LEVEL && xpInLevel >= cap) {
    xpInLevel -= cap;
    level += 1;
    cap = expToNextStatLevel(level);
  }

  if (level >= STAT_MAX_LEVEL) {
    xpInLevel = 0;
  }

  return {
    ...profile,
    stats: {
      ...stats,
      [statName]: {
        ...current,
        level,
        xpInLevel,
        totalXpEarned,
      },
    },
  };
}

export function applyXpGain(profile, rawXp) {
  let { level, xpInLevel, totalXpEarned } = profile;
  const mult =
    streakMultiplier(profile.streak) *
    getStatBonus(profile) *
    getPassiveBonus(profile.level).xpBonus *
    (hasDeathDebuff(profile) ? DEATH_DEBUFF_XP_MULT : 1);
  let gain = Math.floor(rawXp * mult);
  if (gain < 1 && rawXp > 0) gain = 1;

  xpInLevel += gain;
  totalXpEarned += gain;

  let cap = xpToNextLevel(level);
  while (xpInLevel >= cap) {
    xpInLevel -= cap;
    level += 1;
    cap = xpToNextLevel(level);
  }

  return {
    ...profile,
    level,
    xpInLevel,
    totalXpEarned,
  };
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000000) / 1000000;
  };
}

/** Mặc định trùng công thức cũ: chạy ~1.2–3 km, hít đất 12–30, gập bụng 15–40 */
export const DEFAULT_FITNESS_CONFIG = {
  runMinKm: 1.2,
  runMaxKm: 3,
  pushMin: 12,
  pushMax: 30,
  sitMin: 15,
  sitMax: 40,
};

function finiteOr(v, fallback) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function normalizeFitnessConfig(custom) {
  const d = DEFAULT_FITNESS_CONFIG;
  const c = custom && typeof custom === 'object' ? custom : {};

  let runMinKm = finiteOr(c.runMinKm, d.runMinKm);
  let runMaxKm = finiteOr(c.runMaxKm, d.runMaxKm);
  let pushMin = Math.round(finiteOr(c.pushMin, d.pushMin));
  let pushMax = Math.round(finiteOr(c.pushMax, d.pushMax));
  let sitMin = Math.round(finiteOr(c.sitMin, d.sitMin));
  let sitMax = Math.round(finiteOr(c.sitMax, d.sitMax));

  if (runMaxKm < runMinKm) [runMinKm, runMaxKm] = [runMaxKm, runMinKm];
  if (pushMax < pushMin) [pushMin, pushMax] = [pushMax, pushMin];
  if (sitMax < sitMin) [sitMin, sitMax] = [sitMax, sitMin];

  runMinKm = Math.max(0.1, runMinKm);
  runMaxKm = Math.max(runMinKm, runMaxKm);
  pushMin = Math.max(1, pushMin);
  pushMax = Math.max(pushMin, pushMax);
  sitMin = Math.max(1, sitMin);
  sitMax = Math.max(sitMin, sitMax);

  return {
    runMinKm,
    runMaxKm,
    pushMin,
    pushMax,
    sitMin,
    sitMax,
  };
}

export function applyStatLevelFitnessBonus(
  fitnessConfig,
  statName,
  levelsGained,
  isX2 = false
) {
  const count =
    Math.max(0, Math.round(Number(levelsGained) || 0)) * (isX2 ? 2 : 1);
  const cfg = normalizeFitnessConfig(fitnessConfig);
  if (count <= 0) return cfg;

  if (statName === 'strength') {
    return {
      ...cfg,
      pushMin: cfg.pushMin + count * 2,
      pushMax: cfg.pushMax + count * 2,
    };
  }

  if (statName === 'endurance') {
    return {
      ...cfg,
      runMinKm: Math.round((cfg.runMinKm + count * 0.1) * 10) / 10,
      runMaxKm: Math.round((cfg.runMaxKm + count * 0.1) * 10) / 10,
    };
  }

  return cfg;
}

export function rollDailyExercise(dateKey, difficultyMult, customConfig) {
  const cfg = normalizeFitnessConfig(customConfig);
  const rnd = seededRandom(`exercise-${dateKey}`);
  const spanRun = Math.max(0.0001, cfg.runMaxKm - cfg.runMinKm);
  const baseRun = cfg.runMinKm + rnd() * spanRun;
  const pushSpan = cfg.pushMax - cfg.pushMin + 1;
  const basePush = cfg.pushMin + Math.floor(rnd() * pushSpan);
  const sitSpan = cfg.sitMax - cfg.sitMin + 1;
  const baseSit = cfg.sitMin + Math.floor(rnd() * sitSpan);
  const m = Math.max(0.0001, difficultyMult);

  return {
    runKm: Math.round(baseRun * m * 100) / 100,
    pushups: Math.max(5, Math.round(basePush * m)),
    situps: Math.max(8, Math.round(baseSit * m)),
  };
}

export function pickOvercomeQuests(dateKey, count = 3) {
  const rnd = seededRandom(`overcome-${dateKey}`);
  const pool = [...OVERCOME_POOL];
  const picks = [];
  while (pool.length && picks.length < count) {
    const i = Math.floor(rnd() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks.map((q) => ({
    ...q,
    xp: OVERCOME_XP[q.tier] ?? OVERCOME_XP.normal,
    done: false,
  }));
}

export function bumpDifficulty(prevMult) {
  return prevMult * DIFFICULTY_DAILY_MULT;
}

export function checkPenaltyNeeded(history, todayKey) {
  if (!Array.isArray(history)) return false;
  const yKey = addDaysToKey(todayKey, -1);
  const yRow = history.find((h) => h.date === yKey);
  if (!yRow) return false;
  const total =
    (yRow.workTotal || 0) +
    (yRow.exerciseTotal || 0) +
    (yRow.habitGoodTotal || 0) +
    (yRow.habitBadTotal || 0) +
    (yRow.overcomeTotal || 0);
  if (total <= 0) return false;
  const completionRate = (yRow.questsDone || 0) / total;
  return completionRate < PENALTY_THRESHOLD;
}

export function generatePenaltyQuest(dateKey) {
  const rnd = seededRandom(`penalty-${dateKey}`);
  const idx = Math.floor(rnd() * PENALTY_QUESTS.length);
  return {
    text: PENALTY_QUESTS[idx],
    xp: 80,
    isPenalty: true,
    done: false,
  };
}
