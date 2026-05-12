import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import BarMeter from '../components/BarMeter';
import SectionCard from '../components/SectionCard';
import CheckRow from '../components/CheckRow';
import SystemMessage from '../components/SystemMessage';
import {
  BAD_HABITS,
  DEATH_DEBUFF_HOURS,
  EXERCISE_FULL_XP,
  GOOD_HABITS,
  GOOD_HABIT_XP,
  STAT_MILESTONES,
  STATS,
  WORK_TASK_XP,
} from '../utils/constants';
import {
  advanceStreak,
  applyDeath,
  applyStatGain,
  applyStatLevelFitnessBonus,
  applyXpGain,
  expToNextStatLevel,
  getCharacterTitle,
  getPassiveBonus,
  getStatBonus,
  getStatMilestoneBonus,
  hasDeathDebuff,
  isDead,
  normalizeFitnessConfig,
  normalizeStats,
  revive,
  streakMultiplier,
  xpToNextLevel,
  getTodayKey,
  checkPenaltyNeeded,
  generatePenaltyQuest,
} from '../utils/rpg';
import { loadState, mergeHistoryIntoState, saveState } from '../utils/storage';
import StatsScreen from './StatsScreen';
import SettingsScreen from './SettingsScreen';
import AiCoachScreen from './AiCoachScreen';

import {
  habitsWithCustomLabels,
  saveBadHabitLabels,
  saveFitnessConfig,
  saveGoodHabitLabels,
} from '../utils/preferences';

// ==========================================================
// REDESIGN STYLING CONSTANTS (DARK FANTASY RPG THEME)
// ==========================================================
const COLORS = {
  bg: '#0a0a1a',
  card: '#080816',
  cardBorder: '#1d1d36',
  gold: '#f5c842',
  purple: '#7b4fd4',
  red: '#e63946',
  orange: '#ff6b35',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0c0',
  overlay: 'rgba(0,0,0,0.55)',
};

const IMG = {
  hero:      { uri: 'https://s3-hn1-api.longvan.vn/video-khoa-hoc/videos/1778589304496-539452240-1--nh-Hero-ch-nh--header-background-.jpg' },
  exercise:  { uri: 'https://s3-hn1-api.longvan.vn/video-khoa-hoc/videos/1778589312357-919274139-2-Card-Th--d-c--lightning-warrior-.jpg' },
  habitGood: { uri: 'https://s3-hn1-api.longvan.vn/video-khoa-hoc/videos/1778589314868-62737179-3-Card-Th-i-quen-t-t--purple-mist-monk-.jpg' },
  habitBad:  { uri: 'https://s3-hn1-api.longvan.vn/video-khoa-hoc/videos/1778589317068-714388556-4-Card-B--th-i-quen-x-u--armored-knight-.jpg' },
  challenge: { uri: 'https://s3-hn1-api.longvan.vn/video-khoa-hoc/videos/1778589319391-293230618-5--nh-V--t-qua-b-n-th-n--standing-in-light-.jpg' },
};

function mapFitnessActionData(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    runMinKm: data.runMinKm ?? data.runMin,
    runMaxKm: data.runMaxKm ?? data.runMax,
    pushMin: data.pushMin,
    pushMax: data.pushMax,
    sitMin: data.sitMin,
    sitMax: data.sitMax,
  };
}

function normalizeGoodLabelsFromAi(data) {
  if (!Array.isArray(data)) return null;
  return GOOD_HABITS.map((h, i) => {
    const t = String(data[i] ?? '').trim();
    return t || h.label;
  });
}

function normalizeBadLabelsFromAi(data) {
  if (!Array.isArray(data)) return null;
  return BAD_HABITS.map((h, i) => {
    const t = String(data[i] ?? '').trim();
    return t || h.label;
  });
}

function clampHp(hp, max) {
  return Math.max(0, Math.min(max, hp));
}

function heal(profile, amount) {
  const hp = clampHp(profile.hp + amount, profile.maxHp);
  return { ...profile, hp };
}

function damage(profile, amount) {
  const hp = clampHp(profile.hp - amount, profile.maxHp);
  return { ...profile, hp };
}

function getDateKeyFromTimestamp(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isPastDeathMidnight(profile) {
  const debuffUntil = Number(profile?.deathDebuffUntil);
  if (!Number.isFinite(debuffUntil)) return false;
  const deathAt = debuffUntil - DEATH_DEBUFF_HOURS * 60 * 60 * 1000;
  const deathDate = getDateKeyFromTimestamp(deathAt);
  return !!deathDate && deathDate !== getTodayKey();
}

function getProfileStatLevel(profile, statName) {
  return profile?.stats?.[statName]?.level ?? 1;
}

function buildStatLevelToast(statName, level) {
  const def = STATS[statName];
  return `⬆️ ${def?.label ?? statName} lên Lv.${level}!`;
}

function getToastText(toast) {
  return typeof toast === 'string' ? toast : toast?.text;
}

const STAT_COLORS = {
  strength: '#f59e0b',
  endurance: '#3b82f6',
  spirit: '#8b5cf6',
  discipline: '#ef4444',
  wisdom: '#10b981',
};

const STAT_KEYS = ['strength', 'endurance', 'spirit', 'discipline', 'wisdom'];

const PASSIVE_LEVEL_BONUSES = {
  5: 'HP tối đa +10',
  10: 'Hồi HP +1 mỗi hành động',
  20: 'XP nhận được +5%',
  30: 'HP tối đa +20',
  50: 'Stat bonus tối đa x2',
};

// RPG Decorative Divider component (with center diamond/crest)
function RPGDivider({ color }) {
  return (
    <View style={styles.dividerContainer}>
      <View style={[styles.dividerLine, { backgroundColor: color }]} />
      <View style={[styles.dividerDiamond, { borderColor: color }]}>
        <View style={[styles.dividerDiamondInner, { backgroundColor: color }]} />
      </View>
      <View style={[styles.dividerLine, { backgroundColor: color }]} />
    </View>
  );
}

export default function QuestBoardScreen() {
  const [state, setState] = useState(null);
  const [draftTask, setDraftTask] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiCoach, setShowAiCoach] = useState(false);
  const [systemMsg, setSystemMsg] = useState({
    visible: false,
    title: '',
    lines: [],
    color: '#facc15',
  });
  const insets = useSafeAreaInsets();

  const showSystemMessage = useCallback((title, lines, color = '#facc15') => {
    console.log('[QuestBoard SystemMessage] showSystemMessage() ENTER');
    console.log('[QuestBoard SystemMessage] showSystemMessage called', {
      title,
      lines,
      color,
    });
    const nextSystemMsg = {
      visible: true,
      title,
      lines: Array.isArray(lines) ? lines : [String(lines ?? '')],
      color,
    };
    console.log('[QuestBoard SystemMessage] setSystemMsg next', nextSystemMsg);
    setSystemMsg(nextSystemMsg);
  }, []);

  useEffect(() => {
    console.log('[QuestBoard SystemMessage] systemMsg state committed', systemMsg);
  }, [systemMsg]);

  const persist = useCallback((next) => {
    queueMicrotask(async () => {
      try {
        const { newlyUnlocked, nextState } = await saveState(next);
        if (newlyUnlocked?.length) {
          const names = newlyUnlocked.map((a) => a.title).join(', ');
          showSystemMessage('THÀNH TÍCH MỚI', [names], '#facc15');
          setState((prev) =>
            prev && nextState
              ? { ...prev, achievements: nextState.achievements ?? [] }
              : prev
          );
        }
      } catch (e) {
        console.warn('[QuestBoard] saveState', e?.message ?? e);
      }
    });
  }, [showSystemMessage]);

  const commit = useCallback(
    (updater) => {
      setState((prev) => {
        const base = prev;
        if (!base) return prev;
        const raw = updater(base);
        const next = mergeHistoryIntoState(raw);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const applyDeathIfNeeded = useCallback(
    (profile, beforeHp) => {
      if (beforeHp > 0 && isDead(profile)) {
        queueMicrotask(() => {
          showSystemMessage(
            'NGƯƠI ĐÃ NGÃ XUỐNG',
            [
              'Streak bị xóa.',
              'XP bị trừ 20%.',
              'Hoàn thành quest để hồi sinh.',
            ],
            '#ef4444'
          );
        });
        return applyDeath(profile);
      }
      return profile;
    },
    [showSystemMessage]
  );

  const handleRevive = useCallback(() => {
    commit((s) => {
      if (!isDead(s.profile)) return s;
      const profile = revive(s.profile);
      queueMicrotask(() => {
        showSystemMessage(
          'HỒI SINH',
          ['30 HP được hồi.', 'Thương tích còn 24h.'],
          '#f59e0b'
        );
      });
      return { ...s, profile };
    });
  }, [commit, showSystemMessage]);

  const gainXp = useCallback((profile, rawXp) => {
    const beforeLevel = profile.level;
    const beforeTitle = getCharacterTitle(profile.level);
    let nextProfile = applyXpGain(profile, rawXp);
    const afterLevel = nextProfile.level;
    console.log('[QuestBoard SystemMessage] gainXp level check', {
      rawXp,
      beforeLevel,
      afterLevel,
      leveledUp: afterLevel > beforeLevel,
    });
    const afterTitle = getCharacterTitle(nextProfile.level);
    const passiveBonus = getPassiveBonus(nextProfile.level);
    const passiveLevel = [50, 30, 20, 10, 5].find(
        (level) => profile.level < level && nextProfile.level >= level
    );
    nextProfile = {
      ...nextProfile,
      maxHp: passiveBonus.maxHp,
      hp: clampHp(nextProfile.hp, passiveBonus.maxHp),
    };
    let scheduledXpMessage = false;
    if (passiveLevel) {
      scheduledXpMessage = true;
      queueMicrotask(() => {
        console.log(
            '[QuestBoard SystemMessage] gainXp queueMicrotask: passive unlock → showSystemMessage'
        );
        showSystemMessage(
            'PASSIVE MỞ KHÓA',
            [PASSIVE_LEVEL_BONUSES[passiveLevel]],
            '#60a5fa'
        );
      });
    } else if (afterTitle !== beforeTitle) {
      scheduledXpMessage = true;
      queueMicrotask(() => {
        console.log(
            '[QuestBoard SystemMessage] gainXp queueMicrotask: title change → showSystemMessage'
        );
        showSystemMessage('DANH HIỆU MỚI', [afterTitle], '#f59e0b');
      });
    } else if (afterLevel > beforeLevel) {
      scheduledXpMessage = true;
      queueMicrotask(() => {
        console.log(
            '[QuestBoard SystemMessage] gainXp queueMicrotask: level up → showSystemMessage'
        );
        showSystemMessage(
            'CẤP ĐỘ TĂNG',
            [
              `Cấp độ: ${beforeLevel} → ${afterLevel}`,
              `XP tiếp theo: ${xpToNextLevel(afterLevel)}`,
            ],
            '#facc15'
        );
      });
    } else {
      console.log(
          '[QuestBoard SystemMessage] gainXp: no level/title/passive message (caller may show quest complete)'
      );
    }
    return { profile: nextProfile, scheduledXpMessage };
  }, [showSystemMessage]);

  const gainStat = useCallback((s, statName, amount) => {
    const beforeLevel = getProfileStatLevel(s.profile, statName);
    const profile = applyStatGain(s.profile, statName, amount);
    const afterLevel = getProfileStatLevel(profile, statName);
    const levelsGained = Math.max(0, afterLevel - beforeLevel);
    const milestoneLevel = Object.keys(STAT_MILESTONES[statName] ?? {})
        .map(Number)
        .find((level) => beforeLevel < level && afterLevel >= level);
    const milestoneBonus = getStatMilestoneBonus(profile.stats);
    const isFitnessX2 =
        (statName === 'strength' && milestoneBonus.strengthFitnessX2) ||
        (statName === 'endurance' && milestoneBonus.enduranceFitnessX2);

    if (levelsGained <= 0) {
      return { state: { ...s, profile }, scheduledStatMessage: false };
    }

    const fitnessConfig = applyStatLevelFitnessBonus(
        s.fitnessConfig ?? normalizeFitnessConfig(null),
        statName,
        levelsGained,
        isFitnessX2
    );

    queueMicrotask(() => {
      console.log(
          '[QuestBoard SystemMessage] gainStat queueMicrotask → showSystemMessage',
          { statName, afterLevel, milestoneLevel: milestoneLevel ?? null }
      );
      if (milestoneLevel) {
        const desc = STAT_MILESTONES[statName][milestoneLevel].desc;
        showSystemMessage('MILESTONE', [desc], '#34d399');
      } else {
        showSystemMessage(
            'CHỈ SỐ TĂNG',
            [`${STATS[statName]?.label ?? statName} Lv.${afterLevel}`],
            STAT_COLORS[statName] ?? '#facc15'
        );
      }
      if (statName === 'strength' || statName === 'endurance') {
        saveFitnessConfig(fitnessConfig).catch((e) => {
          console.warn('[QuestBoard] saveFitnessConfig', e?.message ?? e);
        });
      }
    });

    return {
      state: { ...s, profile, fitnessConfig },
      scheduledStatMessage: true,
    };
  }, [showSystemMessage]);

  const handleAiCoachExchange = useCallback(
      async ({ history, actions }) => {
        let nextFc = null;
        let nextGood = null;
        let nextBad = null;
        for (const a of actions || []) {
          if (a?.type === 'update_fitness_config' && a.data) {
            const mapped = mapFitnessActionData(a.data);
            if (mapped) {
              nextFc = await saveFitnessConfig(mapped);
            }
          }
          if (a?.type === 'update_habit_labels' && Array.isArray(a.data)) {
            const n = normalizeGoodLabelsFromAi(a.data);
            if (n) {
              await saveGoodHabitLabels(n);
              nextGood = n;
            }
          }
          if (a?.type === 'update_bad_habit_labels' && Array.isArray(a.data)) {
            const n = normalizeBadLabelsFromAi(a.data);
            if (n) {
              await saveBadHabitLabels(n);
              nextBad = n;
            }
          }
        }
        commit((s) => {
          let next = { ...s, aiCoachHistory: history };
          if (nextFc) next = { ...next, fitnessConfig: nextFc };
          if (nextGood) {
            next = {
              ...next,
              goodHabitLabels: nextGood,
              goodHabitIcons: GOOD_HABITS.map((h) => h.icon),
            };
          }
          if (nextBad) {
            next = {
              ...next,
              badHabitLabels: nextBad,
              badHabitIcons: BAD_HABITS.map((h) => h.icon),
            };
          }
          return next;
        });
      },
      [commit]
  );

  const hydrate = useCallback(async () => {
    let s = await loadState();
    const today = getTodayKey();
    if (isDead(s.profile) && isPastDeathMidnight(s.profile)) {
      s = { ...s, profile: revive(s.profile) };
      persist(s);
    }
    if (checkPenaltyNeeded(s.history, today) && !s.daily.penaltyQuest && !s.daily.penaltyHandled) {
      const pQuest = generatePenaltyQuest(today);
      s = { ...s, daily: { ...s.daily, penaltyQuest: pQuest } };
      showSystemMessage('⚠️ NHIỆM VỤ PHẠT', ["Hôm qua ngươi đã thất bại.", "Hoàn thành hoặc chịu hậu quả.", pQuest.text], '#ef4444');
      persist(s);
    }
    setState(s);
  }, [showSystemMessage, persist]);

  const handlePenaltyComplete = () => {
    commit((s) => {
      let profile = { ...s.profile };
      const { profile: afterXp } = gainXp(profile, 80);
      profile = afterXp;
      profile = heal(profile, 10);

      queueMicrotask(() => {
        showSystemMessage('NHIỆM VỤ PHẠT HOÀN THÀNH', ["Ngươi đã vượt qua thử thách.", "+80 XP · +10 HP"], '#34d399');
      });

      let nextState = gainStat({ ...s, profile }, 'wisdom', 5).state;
      const daily = { ...nextState.daily, penaltyHandled: true };
      delete daily.penaltyQuest;
      return { ...nextState, daily };
    });
  };

  const handlePenaltySkip = () => {
    commit((s) => {
      const beforeHp = s.profile.hp;
      let profile = damage(s.profile, 20);
      const died = beforeHp > 0 && isDead(profile);
      profile = applyDeathIfNeeded(profile, beforeHp);
      if (!died) {
        queueMicrotask(() => {
        showSystemMessage('HẬU QUẢ', ["Ngươi đã chọn con đường yếu đuối.", "-20 HP"], '#ef4444');
        });
      }
      const daily = { ...s.daily, penaltyHandled: true };
      delete daily.penaltyQuest;
      return { ...s, profile, daily };
    });
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') hydrate();
    });
    return () => sub.remove();
  }, [hydrate]);

  const addWorkTask = () => {
    const t = draftTask.trim();
    if (!t) return;
    commit((s) => ({
      ...s,
      daily: {
        ...s.daily,
        workTasks: [
          ...s.daily.workTasks,
          { id: `${Date.now()}`, text: t, done: false },
        ],
      },
    }));
    setDraftTask('');
  };

  const removeWorkTask = (id) => {
    commit((s) => ({
      ...s,
      daily: {
        ...s.daily,
        workTasks: s.daily.workTasks.filter((w) => w.id !== id),
      },
    }));
  };

  const toggleWorkTask = (id) => {
    commit((s) => {
      const task = s.daily.workTasks.find((w) => w.id === id);
      if (!task || task.done) return s;

      let profile = { ...s.profile };
      profile = advanceStreak(profile);
      const beforeLevel = profile.level;
      const { profile: afterXp, scheduledXpMessage } = gainXp(
          profile,
          WORK_TASK_XP
      );
      profile = afterXp;
      console.log('[QuestBoard SystemMessage] toggleWorkTask after gainXp', {
        taskId: id,
        beforeLevel,
        afterLevel: profile.level,
        leveledUp: profile.level > beforeLevel,
        scheduledXpMessage,
      });
      profile = heal(profile, getPassiveBonus(profile.level).healPerAction);

      const workTasks = s.daily.workTasks.map((w) =>
          w.id === id ? { ...w, done: true } : w
      );

      if (!scheduledXpMessage) {
        queueMicrotask(() => {
          console.log(
              '[QuestBoard SystemMessage] toggleWorkTask queueMicrotask: quest complete (no level toast) → showSystemMessage'
          );
          showSystemMessage(
              'CÔNG VIỆC HOÀN THÀNH',
              [`📜 ${task.text}`, `+${WORK_TASK_XP} XP`],
              '#34d399'
          );
        });
      }

      return { ...s, profile, daily: { ...s.daily, workTasks } };
    });
  };

  const toggleExercise = (key) => {
    commit((s) => {
      const ex = s.daily.exercise;
      if (ex[`${key}Done`]) return s;

      let profile = { ...s.profile };
      profile = advanceStreak(profile);
      const beforeLevel = profile.level;
      const { profile: afterXp, scheduledXpMessage } = gainXp(
          profile,
          EXERCISE_FULL_XP / 3
      );
      profile = afterXp;
      console.log('[QuestBoard SystemMessage] toggleExercise after gainXp', {
        key,
        beforeLevel,
        afterLevel: profile.level,
        leveledUp: profile.level > beforeLevel,
        scheduledXpMessage,
      });
      profile = heal(profile, getPassiveBonus(profile.level).healPerAction);

      const exercise = { ...ex, [`${key}Done`]: true };
      let next = { ...s, profile, daily: { ...s.daily, exercise } };
      let scheduledStatMessage = false;
      if (key === 'run') {
        const r = gainStat(next, 'endurance', 3);
        next = r.state;
        scheduledStatMessage = r.scheduledStatMessage;
      } else if (key === 'push') {
        const r = gainStat(next, 'strength', 3);
        next = r.state;
        scheduledStatMessage = r.scheduledStatMessage;
      } else if (key === 'sit') {
        const r = gainStat(next, 'strength', 2);
        next = r.state;
        scheduledStatMessage = r.scheduledStatMessage;
      }

      if (!scheduledXpMessage && !scheduledStatMessage) {
        queueMicrotask(() => {
          console.log(
              '[QuestBoard SystemMessage] toggleExercise queueMicrotask: exercise complete (no xp/stat toast) → showSystemMessage'
          );
          const labels = { run: 'Chạy bộ', push: 'Hít đất', sit: 'Gập bụng' };
          const xpPart = Math.floor(EXERCISE_FULL_XP / 3);
          showSystemMessage(
              'THỂ DỤC HOÀN THÀNH',
              [labels[key] ?? key, `+${xpPart} XP`],
              '#22c55e'
          );
        });
      }

      return next;
    });
  };

  const toggleGood = (habitId) => {
    commit((s) => {
      if (s.daily.goodHabits[habitId]) return s;

      let profile = { ...s.profile };
      profile = advanceStreak(profile);
      const { profile: afterXp } = gainXp(profile, GOOD_HABIT_XP);
      profile = afterXp;
      profile = heal(profile, getPassiveBonus(profile.level).healPerAction);

      let next = {
        ...s,
        profile,
        daily: {
          ...s.daily,
          goodHabits: { ...s.daily.goodHabits, [habitId]: true },
        },
      };
      if (habitId === 'meditate') next = gainStat(next, 'spirit', 3).state;
      if (habitId === 'read') next = gainStat(next, 'wisdom', 3).state;
      return next;
    });
  };

  const setBadHabit = (habitId, outcome) => {
    commit((s) => {
      const prev = s.daily.badHabits[habitId];
      let profile = { ...s.profile };
      const milestoneBonus = getStatMilestoneBonus(profile.stats);
      const daily = { ...s.daily, badHabits: { ...s.daily.badHabits } };

      if (prev != null) return s;

      if (outcome === 'ok') {
        profile = advanceStreak(profile);
        const { profile: afterXp } = gainXp(profile, milestoneBonus.badHabitOkXp);
        profile = afterXp;
        profile = heal(profile, getPassiveBonus(profile.level).healPerAction);
        daily.badHabits[habitId] = 'ok';
      } else if (outcome === 'fail') {
        const beforeHp = profile.hp;
        profile = damage(profile, milestoneBonus.badHabitDamage);
        profile = applyDeathIfNeeded(profile, beforeHp);
        daily.badHabits[habitId] = 'fail';
      }

      let next = { ...s, profile, daily };
      if (outcome === 'ok') next = gainStat(next, 'discipline', 3).state;
      return next;
    });
  };

  const toggleOvercome = (index) => {
    commit((s) => {
      const item = s.daily.overcome[index];
      if (!item || item.done) return s;

      let profile = { ...s.profile };
      const milestoneBonus = getStatMilestoneBonus(profile.stats);
      profile = advanceStreak(profile);
      const { profile: afterXp } = gainXp(
          profile,
          item.xp * milestoneBonus.overcomeXpMult
      );
      profile = afterXp;
      profile = heal(profile, getPassiveBonus(profile.level).healPerAction);

      const overcome = s.daily.overcome.map((q, i) =>
          i === index ? { ...q, done: true } : q
      );
      const next = { ...s, profile, daily: { ...s.daily, overcome } };
      return gainStat(next, 'wisdom', 5).state;
    });
  };

  if (!state) {
    return (
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Đang tải bảng nhiệm vụ…</Text>
          </View>
        </SafeAreaView>
    );
  }

  const systemMessage = (
      <SystemMessage
          visible={systemMsg.visible}
          title={systemMsg.title}
          lines={systemMsg.lines}
          color={systemMsg.color}
          onDone={() => setSystemMsg((prev) => ({ ...prev, visible: false }))}
      />
  );
  console.log('[QuestBoard SystemMessage] render SystemMessage props', {
    visible: systemMsg.visible,
    title: systemMsg.title,
    lines: systemMsg.lines,
    color: systemMsg.color,
  });

  if (showSettings) {
    return (
        <View style={styles.flex}>
          <SettingsScreen
              onClose={() => setShowSettings(false)}
              state={state}
              fitnessConfig={state.fitnessConfig}
              goodHabitLabels={state.goodHabitLabels}
              badHabitLabels={state.badHabitLabels}
              goodHabitIcons={state.goodHabitIcons}
              badHabitIcons={state.badHabitIcons}
              onApplied={hydrate}
          />
          {systemMessage}
        </View>
    );
  }

  if (showAiCoach) {
    return (
        <View style={styles.flex}>
          <AiCoachScreen
              state={state}
              onClose={() => setShowAiCoach(false)}
              onAfterExchange={handleAiCoachExchange}
          />
          {systemMessage}
        </View>
    );
  }

  if (showStats) {
    return (
        <View style={styles.flex}>
          <StatsScreen state={state} onClose={() => setShowStats(false)} />
          {systemMessage}
        </View>
    );
  }

  const { profile, daily } = state;
  const goodHabitsUi = habitsWithCustomLabels(
      GOOD_HABITS,
      state.goodHabitLabels,
      state.goodHabitIcons
  );
  const badHabitsUi = habitsWithCustomLabels(
      BAD_HABITS,
      state.badHabitLabels,
      state.badHabitIcons
  );
  const xpCap = xpToNextLevel(profile.level);
  const streakM = streakMultiplier(profile.streak);
  const currentPassiveBonus = getPassiveBonus(profile.level);
  const currentMilestoneBonus = getStatMilestoneBonus(profile.stats);
  const statBonus = getStatBonus(profile);
  const streakLabel =
      profile.streak >= 7
          ? '×1.5 XP'
          : profile.streak >= 3
              ? '×1.2 XP'
              : '×1 XP';

  const xpBonusLabel =
      statBonus > 1
          ? `${streakLabel} · stat ×${statBonus.toFixed(2)}`
          : streakLabel;

  const characterStats = normalizeStats(profile.stats);
  const ex = daily.exercise;
  const deathDebuffActive = hasDeathDebuff(profile);
  const hpLabel = deathDebuffActive ? 'Sinh lực (HP) 🩹' : 'Sinh lực (HP)';

  return (
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView
            style={styles.flexInner}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
          >
            {/* [1] HEADER */}
            <ImageBackground source={IMG.hero} style={styles.headerBg} resizeMode="cover">
              <View style={styles.headerOverlay}>
                <View style={styles.headerTop}>
                  <View style={styles.heroActions}>
                    <Pressable
                        onPress={() => {
                          setShowStats(false);
                          setShowAiCoach(false);
                          setShowSettings(true);
                        }}
                        hitSlop={14}
                        style={styles.heroIconBtn}
                    >
                      <Text style={styles.heroIcon}>⚙️</Text>
                      <Text style={styles.heroIconLabel}>CÀI ĐẶT</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                          setShowStats(false);
                          setShowSettings(false);
                          setShowAiCoach(true);
                        }}
                        hitSlop={14}
                        style={styles.heroIconBtn}
                    >
                      <Text style={styles.heroIcon}>🤖</Text>
                      <Text style={styles.heroIconLabel}>BOT</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                          setShowSettings(false);
                          setShowAiCoach(false);
                          setShowStats(true);
                        }}
                        hitSlop={14}
                        style={styles.heroIconBtn}
                    >
                      <Text style={styles.heroIcon}>📊</Text>
                      <Text style={styles.heroIconLabel}>THỐNG KÊ</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.headerBottom}>
                  <Text style={styles.brand}>⚔️ QuestBoard</Text>
                  <Text style={styles.tagline}>
                    Nhiệm vụ hằng ngày · Phong cách RPG
                  </Text>
                </View>
              </View>
            </ImageBackground>

            {/* [2] LEVEL CARD + STREAK BADGE */}
            <View style={styles.levelStreakRow}>
              {/* Level Card (Bên trái) */}
              <View style={styles.levelCard}>
                <Text style={styles.levelLabel}>CẤP ĐỘ</Text>
                <Text style={styles.levelNum}>{profile.level}</Text>
                <Text
                    style={styles.levelTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                  {getCharacterTitle(profile.level).toUpperCase()}
                </Text>

                <View style={styles.levelBars}>
                  <BarMeter
                      label="Kinh nghiệm"
                      value={profile.xpInLevel}
                      max={xpCap}
                      color={COLORS.gold}
                      trackColor="#2a2618"
                      rightLabel={`${profile.xpInLevel}/${xpCap} XP`}
                  />
                  <BarMeter
                      label={hpLabel}
                      value={profile.hp}
                      max={currentPassiveBonus.maxHp}
                      color={COLORS.red}
                      trackColor="#1a2820"
                      rightLabel={`${Math.round(profile.hp)}/${currentPassiveBonus.maxHp} HP`}
                  />
                  {isDead(profile) ? (
                    <Pressable
                        style={styles.reviveBtn}
                        onPress={handleRevive}
                    >
                      <Text style={styles.reviveBtnText}>ĐỨNG DẬY</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.diffHint}>
                  Độ khó thể dục hôm nay: ×{profile.difficultyMult.toFixed(4)} (+0.01%/ngày)
                </Text>
              </View>

              {/* Streak Card (Bên phải) */}
              <View style={styles.streakCard}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakNum}>{profile.streak}</Text>
                <Text style={styles.streakDayText}>NGÀY CHUỖI</Text>
                <Text style={styles.streakMultiplierText}>
                  Hệ số: {xpBonusLabel}
                </Text>
              </View>
            </View>

            {/* Nhiệm vụ phạt */}
            {daily.penaltyQuest ? (
                <View style={styles.penaltySection}>
                  <Text style={styles.penaltyTitle}>⚠️ NHIỆM VỤ PHẠT</Text>
                  <Text style={styles.penaltyText}>{daily.penaltyQuest.text}</Text>
                  <View style={styles.penaltyActions}>
                    <Pressable style={styles.penaltyBtnComplete} onPress={handlePenaltyComplete}>
                      <Text style={styles.penaltyBtnText}>HOÀN THÀNH</Text>
                    </Pressable>
                    <Pressable style={styles.penaltyBtnSkip} onPress={handlePenaltySkip}>
                      <Text style={styles.penaltyBtnText}>BỎ QUA (-20 HP)</Text>
                    </Pressable>
                  </View>
                </View>
            ) : null}

            {/* [3] CHỈ SỐ NHÂN VẬT (FULL-WIDTH CARD) */}
            <View style={styles.statsWorkFullRow}>
              <View style={styles.genericCardFull}>
                <Text style={styles.statsTitleDecoration}>─── CHỈ SỐ NHÂN VẬT ───</Text>
                <View style={styles.statsContainerVertical}>
                  {STAT_KEYS.map((key) => {
                    const def = STATS[key];
                    const stat = characterStats[key];
                    const cap = expToNextStatLevel(stat.level);
                    const pct = Math.min(100, (stat.xpInLevel / cap) * 100);

                    // Full Capitalized Label Mapping (strength / endurance / spirit / discipline / wisdom)
                    let displayLabel = def.label;
                    if (key === 'strength') displayLabel = 'SỨC MẠNH';
                    else if (key === 'endurance') displayLabel = 'THỂ LỰC';
                    else if (key === 'spirit') displayLabel = 'TINH THẦN';
                    else if (key === 'discipline') displayLabel = 'KỶ LUẬT';
                    else if (key === 'wisdom') displayLabel = 'TRÍ TUỆ';

                    return (
                        <View key={key} style={styles.statRow}>
                          <Text style={styles.statRowLabel} numberOfLines={1}>
                            {def.icon} {displayLabel}
                          </Text>
                          <View style={styles.statRowBarTrack}>
                            <View style={[styles.statRowBarFill, { width: `${pct}%`, backgroundColor: STAT_COLORS[key] || COLORS.gold }]} />
                          </View>
                          <View style={styles.statRowRight}>
                            <Text style={styles.statRowLevel}>Lv.{stat.level}</Text>
                            <Text style={styles.statRowXp}>{stat.xpInLevel}/{cap} XP</Text>
                          </View>
                        </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* [3.5] CÔNG VIỆC (FULL-WIDTH CARD) */}
            <View style={styles.statsWorkFullRow}>
              <View style={styles.genericCardFull}>
                <View style={styles.workHeaderFull}>
                  <Text style={styles.workTitleFull}>CÔNG VIỆC 📜</Text>
                  <Text style={styles.workSubtitleFull}>
                    +{WORK_TASK_XP} XP · hệ số {streakM}
                  </Text>
                </View>

                <View style={styles.workInputRowFull}>
                  <TextInput
                      value={draftTask}
                      onChangeText={setDraftTask}
                      placeholder="Nhập nhiệm vụ hôm nay..."
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.workInputFull}
                      onSubmitEditing={addWorkTask}
                  />
                  <Pressable style={styles.workAddBtnFull} onPress={addWorkTask}>
                    <Text style={styles.workAddBtnTextFull}>THÊM NHIỆM VỤ</Text>
                  </Pressable>
                </View>

                {daily.workTasks.length === 0 ? (
                    <Text style={styles.emptyFull}>Chưa có quest nào — thêm ngay!</Text>
                ) : null}

                <ScrollView style={styles.workListScrollFull}>
                  {daily.workTasks.map((w) => (
                      <View key={w.id} style={styles.taskRowFull}>
                        <View style={styles.taskCheckFull}>
                          <CheckRow
                              label={<Text style={styles.taskCheckLabelFull}>{w.text}</Text>}
                              checked={w.done}
                              disabled={w.done}
                              onToggle={() => toggleWorkTask(w.id)}
                          />
                        </View>
                        <Pressable
                            onPress={() => removeWorkTask(w.id)}
                            hitSlop={8}
                            style={styles.trashFull}
                        >
                          <Text style={styles.trashTextFull}>✕</Text>
                        </Pressable>
                      </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* [4] ROW 4 CARD DỌC FULL-WIDTH CHỮA BLENDING NGHỆ THUẬT */}
            <View style={styles.colThreeCards}>
              {/* Thẻ 1: Thể dục */}
              <View style={[styles.cardThreeContainerFull, { borderColor: '#1d1d36' }]}>
                {/* Right Image */}
                <Image source={IMG.exercise} style={styles.cardRightImage} />
                {/* Blend Gradient Overlay */}
                <View style={styles.blendContainer}>
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.95 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.85 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.75 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.65 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.55 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.45 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.35 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.25 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.15 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.05 }} />
                </View>

                {/* Left Content */}
                <View style={styles.cardLeftContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>🏃 THỂ DỤC (RANDOM)</Text>
                    <Text style={styles.cardSubtitle}>Hoàn thành từng hạng mục để nhận XP</Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.checkRowWrapper}>
                      <CheckRow
                          label={<Text style={styles.cardLabel} numberOfLines={1}>{`👟  Chạy bộ · ${ex.runKm} km`}</Text>}
                          checked={ex.runDone}
                          disabled={ex.runDone}
                          onToggle={() => toggleExercise('run')}
                      />
                    </View>
                    <View style={styles.checkRowWrapper}>
                      <CheckRow
                          label={<Text style={styles.cardLabel} numberOfLines={1}>{`🏋️  Hít đất · ${ex.pushups} cái`}</Text>}
                          checked={ex.pushDone}
                          disabled={ex.pushDone}
                          onToggle={() => toggleExercise('push')}
                      />
                    </View>
                    <View style={styles.checkRowWrapper}>
                      <CheckRow
                          label={<Text style={styles.cardLabel} numberOfLines={1}>{`🧘  Gập bụng · ${ex.situps} cái`}</Text>}
                          checked={ex.sitDone}
                          disabled={ex.sitDone}
                          onToggle={() => toggleExercise('sit')}
                      />
                    </View>
                  </View>
                  <Text style={styles.cardFootnote}>Mỗi phần: +{Math.floor(EXERCISE_FULL_XP / 3)} XP cơ bản (× chuỗi)</Text>
                </View>
              </View>

              {/* Purple Decorative Divider */}
              <RPGDivider color="#7b4fd4" />

              {/* Thẻ 2: Thói quen tốt */}
              <View style={[styles.cardThreeContainerFull, { borderColor: '#2b1d4a' }]}>
                {/* Right Image */}
                <Image source={IMG.habitGood} style={styles.cardRightImage} />
                {/* Blend Gradient Overlay */}
                <View style={styles.blendContainer}>
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.95 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.85 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.75 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.65 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.55 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.45 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.35 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.25 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.15 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.05 }} />
                </View>

                {/* Left Content */}
                <View style={styles.cardLeftContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>✨ THÓI QUEN TỐT</Text>
                    <Text style={styles.cardSubtitle}>Chỉ tick khi bạn đã thực hiện</Text>
                  </View>

                  <View style={styles.cardContent}>
                    {goodHabitsUi.map((h) => {
                      const done = daily.goodHabits[h.id];
                      return (
                          <View key={h.id} style={styles.checkRowWrapper}>
                            <CheckRow
                                label={
                                  <Text 
                                    style={[styles.cardLabel, done && styles.cardLabelDone]} 
                                    numberOfLines={1}
                                  >
                                    {`${h.icon}  ${h.label}`}
                                  </Text>
                                }
                                checked={done}
                                disabled={done}
                                onToggle={() => toggleGood(h.id)}
                            />
                          </View>
                      );
                    })}
                  </View>
                  <Text style={styles.cardFootnote}>Mỗi thói quen: +{GOOD_HABIT_XP} XP · +{currentPassiveBonus.healPerAction} HP</Text>
                </View>
              </View>

              {/* Purple Decorative Divider */}
              <RPGDivider color="#7b4fd4" />

              {/* Thẻ 3: Bỏ thói quen xấu */}
              <View style={[styles.cardThreeContainerFull, { borderColor: '#4a1d1d' }]}>
                {/* Right Image */}
                <Image source={IMG.habitBad} style={styles.cardRightImage} />
                {/* Blend Gradient Overlay */}
                <View style={styles.blendContainer}>
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.95 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.85 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.75 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.65 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.55 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.45 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.35 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.25 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.15 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.05 }} />
                </View>

                {/* Left Content */}
                <View style={styles.cardLeftContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>🛡️ BỎ THÓI QUEN XẤU</Text>
                    <Text style={styles.cardSubtitle}>Giữ vững: XP · Trượt: trừ HP</Text>
                  </View>

                  <View style={styles.cardContent}>
                    {badHabitsUi.map((h) => {
                      const v = daily.badHabits[h.id];
                      const locked = v != null;
                      return (
                          <View key={h.id} style={styles.badBlock}>
                            <Text style={styles.badTitle} numberOfLines={1}>
                              {h.icon}  {h.label}
                            </Text>
                            <View style={styles.badActions}>
                              <Pressable
                                  onPress={() => setBadHabit(h.id, 'ok')}
                                  disabled={locked}
                                  style={[
                                    styles.pill,
                                    styles.pillOk,
                                    v === 'ok' && styles.pillActiveOk,
                                    locked && v !== 'ok' && styles.pillDisabled,
                                  ]}
                              >
                                <Text style={styles.pillText}>Đã tránh</Text>
                              </Pressable>
                              <Pressable
                                  onPress={() => setBadHabit(h.id, 'fail')}
                                  disabled={locked}
                                  style={[
                                    styles.pill,
                                    styles.pillBad,
                                    v === 'fail' && styles.pillActiveBad,
                                    locked && v !== 'fail' && styles.pillDisabled,
                                  ]}
                              >
                                <Text style={styles.pillText}>Thất bại</Text>
                              </Pressable>
                            </View>
                          </View>
                      );
                    })}
                  </View>
                  <Text style={styles.cardFootnote}>
                    Tránh thành công: +{currentMilestoneBonus.badHabitOkXp} XP · Thất bại: −{currentMilestoneBonus.badHabitDamage} HP
                  </Text>
                </View>
              </View>

              {/* Gold Decorative Divider */}
              <RPGDivider color="#f5c842" />

              {/* Thẻ 4: Vượt qua bản thân */}
              <View style={[styles.cardThreeContainerFull, { borderColor: '#4a3b1d', marginBottom: 0 }]}>
                {/* Right Image */}
                <Image source={IMG.challenge} style={styles.cardRightImage} />
                {/* Blend Gradient Overlay */}
                <View style={styles.blendContainer}>
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.95 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.85 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.75 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.65 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.55 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.45 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.35 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.25 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.15 }} />
                  <View style={{ flex: 1, backgroundColor: COLORS.card, opacity: 0.05 }} />
                </View>

                {/* Left Content */}
                <View style={styles.cardLeftContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: COLORS.gold }]}>🐉 VƯỢT QUA BẢN THÂN</Text>
                    <Text style={styles.cardSubtitle}>Quest tùy chọn — XP cao hơn</Text>
                  </View>

                  <View style={styles.cardContent}>
                    {daily.overcome.map((q, idx) => (
                        <View key={q.id} style={styles.overcomeItemRow}>
                          <View style={styles.overcomeCheckContainer}>
                            <CheckRow
                                label={
                                  <Text 
                                    style={[styles.overcomeLabel, q.done && styles.overcomeLabelDone]} 
                                    numberOfLines={2}
                                  >
                                    {q.title}
                                  </Text>
                                }
                                checked={q.done}
                                disabled={q.done}
                                onToggle={() => toggleOvercome(idx)}
                            />
                          </View>
                          <View style={styles.overcomeXpBadge}>
                            <Text style={styles.overcomeXpText}>+{q.xp} XP</Text>
                          </View>
                        </View>
                    ))}
                  </View>
                </View>
              </View>

            </View>

          </ScrollView>
          {systemMessage}
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flexInner: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  headerBg: {
    height: 220,
    width: '100%',
    marginBottom: 12,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  heroIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  heroIconLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  headerBottom: {
    justifyContent: 'flex-end',
  },
  brand: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  levelStreakRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  levelCard: {
    flex: 1.5,
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  levelLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelNum: {
    color: COLORS.gold,
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  levelTitle: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  levelBars: {
    gap: 4,
    marginBottom: 8,
  },
  diffHint: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  reviveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 2,
  },
  reviveBtnText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  streakCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakEmoji: {
    fontSize: 32,
    marginBottom: 4,
    textAlign: 'center',
  },
  streakNum: {
    color: COLORS.orange,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  streakDayText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  streakMultiplierText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsWorkFullRow: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  genericCardFull: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  statsTitleDecoration: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  statsContainerVertical: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statRowLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    width: 110,
  },
  statRowBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#070710',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  statRowBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 100,
    gap: 6,
  },
  statRowLevel: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '900',
  },
  statRowXp: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  workHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workTitleFull: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '900',
  },
  workSubtitleFull: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  workInputRowFull: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  workInputFull: {
    flex: 1,
    backgroundColor: '#0c0c1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    fontSize: 14,
  },
  workAddBtnFull: {
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workAddBtnTextFull: {
    color: COLORS.gold,
    fontWeight: '900',
    fontSize: 12,
  },
  workListScrollFull: {
    maxHeight: 280,
  },
  taskRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    paddingBottom: 6,
  },
  taskCheckFull: {
    flex: 1,
  },
  taskCheckLabelFull: {
    color: '#e8e4dc',
    fontSize: 13,
    fontWeight: '600',
  },
  trashFull: {
    padding: 10,
  },
  trashTextFull: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyFull: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  colThreeCards: {
    gap: 0,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  cardThreeContainerFull: {
    width: '100%',
    backgroundColor: '#080816',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
    minHeight: 180,
  },
  cardRightImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '45%',
    height: '100%',
    resizeMode: 'cover',
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
  },
  blendContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '15%',
    flexDirection: 'row',
  },
  cardLeftContent: {
    width: '60%',
    zIndex: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  cardContent: {
    gap: 6,
    marginBottom: 8,
  },
  checkRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    paddingBottom: 6,
    marginBottom: 2,
  },
  cardLabel: {
    color: '#e8e4dc',
    fontSize: 12,
    fontWeight: '600',
  },
  cardLabelDone: {
    color: '#a89b7a',
  },
  cardFootnote: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 6,
  },
  badBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  badTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    paddingRight: 6,
  },
  badActions: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 55,
  },
  pillOk: {
    backgroundColor: '#0a1a10',
    borderColor: '#1a3c26',
  },
  pillBad: {
    backgroundColor: '#1d0e0e',
    borderColor: '#3c1a1a',
  },
  pillActiveOk: {
    borderColor: '#34d399',
    backgroundColor: '#113a24',
  },
  pillActiveBad: {
    borderColor: COLORS.red,
    backgroundColor: '#4d1c1c',
  },
  pillDisabled: {
    opacity: 0.2,
  },
  pillText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 9,
  },
  overcomeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  overcomeCheckContainer: {
    flex: 1,
  },
  overcomeLabel: {
    color: '#e8e4dc',
    fontSize: 12,
    fontWeight: '600',
  },
  overcomeLabelDone: {
    color: '#a89b7a',
  },
  overcomeXpBadge: {
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderColor: '#f5c842',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  overcomeXpText: {
    color: '#f5c842',
    fontSize: 9,
    fontWeight: '800',
  },
  penaltySection: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  penaltyTitle: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  penaltyText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '700',
  },
  penaltyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  penaltyBtnComplete: {
    flex: 1,
    backgroundColor: '#1b4d3e',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  penaltyBtnSkip: {
    flex: 1,
    backgroundColor: '#4d1b22',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  penaltyBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  // RPG Decorative Divider Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    paddingHorizontal: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.35,
  },
  dividerDiamond: {
    width: 10,
    height: 10,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  dividerDiamondInner: {
    width: 4,
    height: 4,
  },
});
