import { addDaysToKey } from './rpg';

const BAD_KEYS = ['no_social', 'no_junk', 'no_delay'];

function statLevel(s, statName) {
  return s.profile?.stats?.[statName]?.level ?? 1;
}

function allStatsAtLeast(s, minLevel) {
  const stats = s.profile?.stats ?? {};
  return ['strength', 'endurance', 'spirit', 'discipline', 'wisdom'].every(
    (key) => (stats[key]?.level ?? 1) >= minLevel
  );
}

/** Định nghĩa thành tích cố định (unlock lưu { id, unlockedAt } trong state). */
export const ACHIEVEMENT_DEFS = [
  {
    id: 'starter',
    icon: '🔥',
    title: 'Khởi đầu',
    desc: 'Hoàn thành quest đầu tiên',
    check: (s) => (s.profile.lifetimeQuestsCompleted ?? 0) >= 1,
  },
  {
    id: 'streak_3',
    icon: '🔥🔥',
    title: 'Bốc lửa',
    desc: 'Streak 3 ngày',
    check: (s) => (s.profile.streak ?? 0) >= 3,
  },
  {
    id: 'streak_7',
    icon: '🔥🔥🔥',
    title: 'Không thể dập tắt',
    desc: 'Streak 7 ngày',
    check: (s) => (s.profile.streak ?? 0) >= 7,
  },
  {
    id: 'level_2',
    icon: '⚡',
    title: 'Lên cấp!',
    desc: 'Đạt level 2',
    check: (s) => (s.profile.level ?? 1) >= 2,
  },
  {
    id: 'level_5',
    icon: '💎',
    title: 'Chiến binh',
    desc: 'Đạt level 5',
    check: (s) => (s.profile.level ?? 1) >= 5,
  },
  {
    id: 'level_10',
    icon: '👑',
    title: 'Huyền thoại',
    desc: 'Đạt level 10',
    check: (s) => (s.profile.level ?? 1) >= 10,
  },
  {
    id: 'athlete_30',
    icon: '💪',
    title: 'Vận động viên',
    desc: 'Hoàn thành 30 buổi thể dục (đủ 3 phần/một ngày)',
    check: (s) => (s.profile.lifetimeExercisePerfectDays ?? 0) >= 30,
  },
  {
    id: 'bookworm_14',
    icon: '📚',
    title: 'Mọt sách',
    desc: 'Tick thói quen đọc sách 14 ngày',
    check: (s) => (s.profile.lifetimeReadHabitDays ?? 0) >= 14,
  },
  {
    id: 'streak_30',
    icon: '🏆',
    title: 'Bất bại',
    desc: 'Streak 30 ngày',
    check: (s) => (s.profile.streak ?? 0) >= 30,
  },
  {
    id: 'quests_100',
    icon: '💯',
    title: 'Hoàn hảo',
    desc: 'Hoàn thành 100 quest',
    check: (s) => (s.profile.lifetimeQuestsCompleted ?? 0) >= 100,
  },
  {
    id: 'overcome_x10',
    icon: '🌟',
    title: 'Vượt bản thân x10',
    desc: 'Hoàn thành 10 quest vượt bản thân',
    check: (s) => (s.profile.lifetimeOvercomeCompleted ?? 0) >= 10,
  },
  {
    id: 'stat_strength_10',
    icon: '💪',
    title: 'Lực sĩ',
    desc: 'Strength đạt level 10',
    check: (s) => statLevel(s, 'strength') >= 10,
  },
  {
    id: 'stat_endurance_10',
    icon: '🏃',
    title: 'Vận động viên marathon',
    desc: 'Endurance đạt level 10',
    check: (s) => statLevel(s, 'endurance') >= 10,
  },
  {
    id: 'stat_spirit_10',
    icon: '🧘',
    title: 'Thiền sư',
    desc: 'Spirit đạt level 10',
    check: (s) => statLevel(s, 'spirit') >= 10,
  },
  {
    id: 'stat_discipline_10',
    icon: '🛡️',
    title: 'Thép không rỉ',
    desc: 'Discipline đạt level 10',
    check: (s) => statLevel(s, 'discipline') >= 10,
  },
  {
    id: 'stat_wisdom_10',
    icon: '🧠',
    title: 'Học giả',
    desc: 'Wisdom đạt level 10',
    check: (s) => statLevel(s, 'wisdom') >= 10,
  },
  {
    id: 'stats_all_5',
    icon: '🌟',
    title: 'Toàn năng',
    desc: 'Tất cả stat đạt level 5',
    check: (s) => allStatsAtLeast(s, 5),
  },
  {
    id: 'steel_discipline',
    icon: '🚫',
    title: 'Kỷ luật thép',
    desc: 'Tránh đủ 3 thói xấu 7 ngày liên tiếp',
    check: (s) => computeBadAvoidStreak(s.history, s.daily) >= 7,
  },
];

/** Chuỗi ngày liên tiếp (tính đến hôm nay trong daily) có badOk === 3. */
export function computeBadAvoidStreak(history, daily) {
  if (!daily?.date) return 0;
  const map = new Map((history ?? []).map((r) => [r.date, r]));
  let d = daily.date;
  let streak = 0;

  while (isBadTripleAvoidedForDate(map, daily, d)) {
    streak += 1;
    d = addDaysToKey(d, -1);
  }
  return streak;
}

function isBadTripleAvoidedForDate(historyMap, daily, dateKey) {
  if (dateKey === daily.date) {
    return BAD_KEYS.every((k) => daily.badHabits?.[k] === 'ok');
  }
  const row = historyMap.get(dateKey);
  return !!(row && row.habitBadOk >= 3);
}

/** Trả meta cho UI (toast / stats): { icon, title, desc } — không có unlockedAt */
export function getAchievementDisplay(id) {
  const d = ACHIEVEMENT_DEFS.find((x) => x.id === id);
  return d
    ? { id: d.id, icon: d.icon, title: d.title, desc: d.desc }
    : { id, icon: '🏅', title: id, desc: '' };
}

/**
 * Unlock thành tích đủ điều kiện và chưa có.
 * @returns {{ nextState: object, newlyUnlocked: Array<{ id, icon, title, unlockedAt }> }}
 */
export function checkAndUnlockAchievements(state) {
  const unlocked = [...(state.achievements ?? [])];
  const byId = new Set(unlocked.map((a) => a.id));

  const ctx = {
    profile: state.profile ?? {},
    history: state.history ?? [],
    daily: state.daily ?? {},
  };

  const now = Date.now();
  /** @type {Array<{ id, icon, title, unlockedAt: number}>} */
  const newlyUnlocked = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (byId.has(def.id)) continue;
    if (!def.check(ctx)) continue;

    unlocked.push({ id: def.id, unlockedAt: now });
    byId.add(def.id);
    newlyUnlocked.push({
      id: def.id,
      icon: def.icon,
      title: def.title,
      unlockedAt: now,
    });
  }

  return {
    nextState: {
      ...state,
      achievements: unlocked,
    },
    newlyUnlocked,
  };
}
