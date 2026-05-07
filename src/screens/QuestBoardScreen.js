import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Alert,
  ScrollView,
  Switch,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  EXERCISE_FULL_XP,
  GOOD_HABITS,
  GOOD_HABIT_XP,
  STAT_MILESTONES,
  STATS,
  WORK_TASK_XP,
} from '../utils/constants';
import {
  advanceStreak,
  applyStatGain,
  applyStatLevelFitnessBonus,
  applyXpGain,
  expToNextStatLevel,
  getCharacterTitle,
  getPassiveBonus,
  getStatBonus,
  getStatMilestoneBonus,
  normalizeFitnessConfig,
  normalizeStats,
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
  applyDailyReminderSchedule,
  loadNotificationSettings,
  notificationsSupportedNative,
  requestNotificationPermissionIfNeeded,
  saveNotificationSettings,
} from '../utils/notifications';
import {
  habitsWithCustomLabels,
  saveBadHabitLabels,
  saveFitnessConfig,
  saveGoodHabitLabels,
} from '../utils/preferences';

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

export default function QuestBoardScreen() {
  const [state, setState] = useState(null);
  const [draftTask, setDraftTask] = useState('');
  const [notifSettings, setNotifSettings] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAiCoach, setShowAiCoach] = useState(false);
  const [systemMsg, setSystemMsg] = useState({
    visible: false,
    title: '',
    lines: [],
    color: '#facc15',
  });
  // Rollback: legacy toast state before SystemMessage migration.
  // const [achievementToast, setAchievementToast] = useState(null);
  const insets = useSafeAreaInsets();

  const flushNotifTimes = useCallback(() => {
    setNotifSettings((prev) => {
      const next = {
        ...prev,
        morningHour: Math.min(
          23,
          Math.max(0, Math.round(Number(prev.morningHour)) || 0)
        ),
        morningMinute: Math.min(
          59,
          Math.max(0, Math.round(Number(prev.morningMinute)) || 0)
        ),
        eveningHour: Math.min(
          23,
          Math.max(0, Math.round(Number(prev.eveningHour)) || 0)
        ),
        eveningMinute: Math.min(
          59,
          Math.max(0, Math.round(Number(prev.eveningMinute)) || 0)
        ),
      };
      Promise.resolve().then(async () => {
        await saveNotificationSettings(next);
        await applyDailyReminderSchedule(next);
      });
      return next;
    });
  }, []);

  // Rollback: legacy toast auto-hide before SystemMessage migration.
  // useEffect(() => {
  //   if (achievementToast == null) return undefined;
  //   const id = setTimeout(() => setAchievementToast(null), 3000);
  //   return () => clearTimeout(id);
  // }, [achievementToast]);

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
          // Rollback: setAchievementToast(`🏅 Thành tích mới: ${names}!`);
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
        // Rollback: setAchievementToast({ type: 'passive', text: `⚡ Passive mới: ${PASSIVE_LEVEL_BONUSES[passiveLevel]}` });
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
        // Rollback: setAchievementToast({ type: 'title', text: `🎖️ Danh hiệu mới: ${afterTitle}!` });
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
        // Rollback: setAchievementToast({ type: 'milestone', text: `🌟 Milestone: ${desc}` });
        showSystemMessage('MILESTONE', [desc], '#34d399');
      } else {
        // Rollback: setAchievementToast((prev) => prev?.type === 'title' || prev?.type === 'passive' || prev?.type === 'milestone' ? prev : buildStatLevelToast(statName, afterLevel));
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
      let profile = damage(s.profile, 20);
      queueMicrotask(() => {
        showSystemMessage('HẬU QUẢ', ["Ngươi đã chọn con đường yếu đuối.", "-20 HP"], '#ef4444');
      });
      const daily = { ...s.daily, penaltyHandled: true };
      delete daily.penaltyQuest;
      return { ...s, profile, daily };
    });
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    (async () => {
      const n = await loadNotificationSettings();
      setNotifSettings(n);
    })();
  }, []);

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
        profile = damage(profile, milestoneBonus.badHabitDamage);
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
          <ActivityIndicator size="large" color="#d4af37" />
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

  // Rollback: legacy toast banner before SystemMessage migration.
  // const toastTop =
  //   showStats || showSettings || showAiCoach ? insets.top + 8 : 8;
  // const achievementBanner =
  //   achievementToast != null ? (
  //     <View
  //       style={[
  //         styles.achToastWrap,
  //         achievementToast?.type === 'title' && styles.titleToastWrap,
  //         achievementToast?.type === 'passive' && styles.passiveToastWrap,
  //         achievementToast?.type === 'milestone' && styles.milestoneToastWrap,
  //         { top: toastTop },
  //       ]}
  //       pointerEvents="none"
  //     >
  //       <Text
  //         style={[
  //           styles.achToastText,
  //           achievementToast?.type === 'title' && styles.titleToastText,
  //           achievementToast?.type === 'passive' && styles.passiveToastText,
  //           achievementToast?.type === 'milestone' && styles.milestoneToastText,
  //         ]}
  //       >
  //         {getToastText(achievementToast)}
  //       </Text>
  //     </View>
  //   ) : null;

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
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTexts}>
              <Text style={styles.brand}>⚔️ QuestBoard</Text>
              <Text style={styles.tagline}>
                Nhiệm vụ hằng ngày · Phong cách RPG
              </Text>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => {
                  setShowStats(false);
                  setShowAiCoach(false);
                  setShowSettings(true);
                }}
                hitSlop={14}
                style={styles.heroIconTap}
              >
                <Text style={styles.heroIcon}>⚙️</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowStats(false);
                  setShowSettings(false);
                  setShowAiCoach(true);
                }}
                hitSlop={14}
                style={styles.heroIconTap}
              >
                <Text style={styles.heroIcon}>🤖</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowSettings(false);
                  setShowAiCoach(false);
                  setShowStats(true);
                }}
                hitSlop={14}
                style={styles.heroIconTap}
              >
                <Text style={styles.heroIcon}>📊</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View>
              <Text style={styles.levelLabel}>Cấp độ</Text>
              <Text style={styles.levelNum}>{profile.level}</Text>
              <Text
                style={styles.levelTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {getCharacterTitle(profile.level)}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <View>
                <Text style={styles.streakNum}>{profile.streak} ngày</Text>
                <Text style={styles.streakMeta}>
                  Chuỗi · {xpBonusLabel}
                </Text>
              </View>
            </View>
          </View>
          <BarMeter
            label="Kinh nghiệm"
            value={profile.xpInLevel}
            max={xpCap}
            color="#d4af37"
            trackColor="#2a2618"
            rightLabel={`${profile.xpInLevel}/${xpCap} XP`}
          />
          <BarMeter
            label="Sinh lực (HP)"
            value={profile.hp}
            max={currentPassiveBonus.maxHp}
            color="#4e9f6d"
            trackColor="#1a2820"
            rightLabel={`${Math.round(profile.hp)}/${
              currentPassiveBonus.maxHp
            } HP`}
          />
          <Text style={styles.diffHint}>
            Độ khó thể dục hôm nay: ×
            {profile.difficultyMult.toFixed(4)} (+0.01%/ngày)
          </Text>
        </View>

        <View style={styles.characterStatsSection}>
          <Text style={styles.characterStatsTitle}>Chỉ số nhân vật</Text>
          <View style={styles.characterStatsGrid}>
            {STAT_KEYS.map((key, index) => {
              const def = STATS[key];
              const stat = characterStats[key];
              const cap = expToNextStatLevel(stat.level);
              const pct = Math.min(100, (stat.xpInLevel / cap) * 100);
              const color = STAT_COLORS[key];
              const fullWidth = index === STAT_KEYS.length - 1;

              return (
                <View
                  key={key}
                  style={[
                    styles.characterStatTile,
                    fullWidth && styles.characterStatTileFull,
                  ]}
                >
                  <View style={styles.characterStatTop}>
                    <Text style={styles.characterStatName}>
                      {def.icon} {def.label}
                    </Text>
                    <Text style={[styles.characterStatLevel, { color }]}>
                      Lv.{stat.level}
                    </Text>
                  </View>
                  <View style={styles.characterStatTrack}>
                    <View
                      style={[
                        styles.characterStatFill,
                        { width: `${pct}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.characterStatXp}>
                    {stat.xpInLevel} / {cap} XP
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {daily.penaltyQuest ? (
          <View style={styles.penaltySection}>
            <Text style={styles.penaltyTitle}>⚠️ NHIỆM VỤ PHẠT</Text>
            <Text style={styles.penaltyText}>{daily.penaltyQuest.text}</Text>
            <View style={styles.penaltyActions}>
              <Pressable style={styles.penaltyBtnComplete} onPress={handlePenaltyComplete}>
                <Text style={styles.penaltyBtnText}>HOÀN THÀNH</Text>
              </Pressable>
              <Pressable style={styles.penaltyBtnSkip} onPress={handlePenaltySkip}>
                <Text style={styles.penaltyBtnText}>BỎ QUA (mất 20 HP)</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <SectionCard
          title="Công việc"
          subtitle={`+${WORK_TASK_XP} XP mỗi nhiệm vụ · hệ số ${streakM}`}
          icon="📜"
        >
          <View style={styles.inputRow}>
            <TextInput
              value={draftTask}
              onChangeText={setDraftTask}
              placeholder="Nhập nhiệm vụ hôm nay..."
              placeholderTextColor="#5c5766"
              style={styles.input}
              onSubmitEditing={addWorkTask}
            />
            <Pressable style={styles.addBtn} onPress={addWorkTask}>
              <Text style={styles.addBtnText}>Thêm</Text>
            </Pressable>
          </View>
          {daily.workTasks.length === 0 ? (
            <Text style={styles.empty}>Chưa có nhiệm vụ — thêm vài quest!</Text>
          ) : null}
          {daily.workTasks.map((w) => (
            <View key={w.id} style={styles.taskRow}>
              <View style={styles.taskCheck}>
                <CheckRow
                  label={w.text}
                  checked={w.done}
                  disabled={w.done}
                  onToggle={() => toggleWorkTask(w.id)}
                />
              </View>
              <Pressable
                onPress={() => removeWorkTask(w.id)}
                hitSlop={8}
                style={styles.trash}
              >
                <Text style={styles.trashText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Thể dục (random)"
          subtitle="Hoàn thành từng hạng mục để nhận XP"
          icon="🏃"
        >
          <CheckRow
            label={`Chạy bộ · ${ex.runKm} km`}
            checked={ex.runDone}
            disabled={ex.runDone}
            onToggle={() => toggleExercise('run')}
          />
          <CheckRow
            label={`Hít đất · ${ex.pushups} cái`}
            checked={ex.pushDone}
            disabled={ex.pushDone}
            onToggle={() => toggleExercise('push')}
          />
          <CheckRow
            label={`Gập bụng · ${ex.situps} cái`}
            checked={ex.sitDone}
            disabled={ex.sitDone}
            onToggle={() => toggleExercise('sit')}
          />
          <Text style={styles.smallNote}>
            Mỗi phần: +{Math.floor(EXERCISE_FULL_XP / 3)} XP cơ bản (× chuỗi)
          </Text>
        </SectionCard>

        <SectionCard
          title="Thói quen tốt"
          subtitle="Chỉ tick khi bạn đã thực hiện"
          icon="✨"
        >
          {goodHabitsUi.map((h) => (
            <CheckRow
              key={h.id}
              label={`${h.icon}  ${h.label}`}
              checked={daily.goodHabits[h.id]}
              disabled={daily.goodHabits[h.id]}
              onToggle={() => toggleGood(h.id)}
            />
          ))}
          <Text style={styles.smallNote}>
            Mỗi thói quen: +{GOOD_HABIT_XP} XP · +{currentPassiveBonus.healPerAction} HP
          </Text>
        </SectionCard>

        <SectionCard
          title="Bỏ thói quen xấu"
          subtitle="Giữ vững: XP · Trượt: trừ HP"
          icon="🛡️"
        >
          {badHabitsUi.map((h) => {
            const v = daily.badHabits[h.id];
            const locked = v != null;
            return (
              <View key={h.id} style={styles.badBlock}>
                <Text style={styles.badTitle}>
                  {h.icon} {h.label}
                </Text>
                <View style={styles.badActions}>
                  <Pressable
                    onPress={() => setBadHabit(h.id, 'ok')}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.pill,
                      styles.pillOk,
                      v === 'ok' && styles.pillActiveOk,
                      locked && v !== 'ok' && styles.pillDisabled,
                      pressed && !locked && styles.pillPressed,
                    ]}
                  >
                    <Text style={styles.pillText}>Đã tránh</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setBadHabit(h.id, 'fail')}
                    disabled={locked}
                    style={({ pressed }) => [
                      styles.pill,
                      styles.pillBad,
                      v === 'fail' && styles.pillActiveBad,
                      locked && v !== 'fail' && styles.pillDisabled,
                      pressed && !locked && styles.pillPressed,
                    ]}
                  >
                    <Text style={styles.pillText}>Thất bại</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Text style={styles.smallNote}>
            Tránh thành công: +{currentMilestoneBonus.badHabitOkXp} XP · Thất bại: −
            {currentMilestoneBonus.badHabitDamage} HP
          </Text>
        </SectionCard>

        <SectionCard
          title="Vượt qua bản thân"
          subtitle="Quest tùy chọn — XP cao hơn"
          icon="🐉"
        >
          {daily.overcome.map((q, idx) => (
            <CheckRow
              key={q.id}
              label={`${q.title}  (+${q.xp} XP)`}
              checked={q.done}
              disabled={q.done}
              onToggle={() => toggleOvercome(idx)}
            />
          ))}
        </SectionCard>

        {notifSettings ? (
          <SectionCard
            title="Nhắc nhở hằng ngày"
            subtitle="Local notification — không cần server"
            icon="🔔"
          >
            {!notificationsSupportedNative() ? (
              <Text style={styles.smallNote}>
                Thông báo định kỳ chỉ hỗ trợ trên app iOS/Android.
              </Text>
            ) : (
              <>
                <View style={styles.notifRow}>
                  <View style={styles.notifRowText}>
                    <Text style={styles.notifLabel}>Bật nhắc nhở</Text>
                    <Text style={styles.notifHint}>
                      Sáng & tối mỗi ngày (giờ máy)
                    </Text>
                  </View>
                  <Switch
                    value={notifSettings.enabled}
                    onValueChange={async (v) => {
                      if (v) {
                        const ok = await requestNotificationPermissionIfNeeded();
                        if (!ok) {
                          Alert.alert(
                            'Cần quyền thông báo',
                            'Hãy bật quyền trong Cài đặt hệ thống để nhận nhắc quest hằng ngày.'
                          );
                          return;
                        }
                      }
                      setNotifSettings((prev) => {
                        const next = { ...prev, enabled: v };
                        Promise.resolve().then(async () => {
                          await saveNotificationSettings(next);
                          await applyDailyReminderSchedule(next);
                        });
                        return next;
                      });
                    }}
                    thumbColor={
                      notifSettings.enabled ? '#d4af37' : '#5c5766'
                    }
                    trackColor={{
                      false: '#2a2a38',
                      true: '#3d3520',
                    }}
                  />
                </View>

                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockTitle}>Buổi sáng</Text>
                  <Text style={styles.timeBlockSub}>
                    ⚔️ Quest hôm nay đang chờ bạn!
                  </Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      editable={notifSettings.enabled}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(notifSettings.morningHour)}
                      onChangeText={(t) => {
                        const n = Number(String(t).replace(/\D/g, '') || 0);
                        setNotifSettings((p) => ({
                          ...p,
                          morningHour: Math.min(23, Math.max(0, n)),
                        }));
                      }}
                      onBlur={flushNotifTimes}
                      style={[styles.timeField, !notifSettings.enabled && styles.timeFieldDisabled]}
                    />
                    <Text style={styles.timeSep}>:</Text>
                    <TextInput
                      editable={notifSettings.enabled}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(notifSettings.morningMinute)}
                      onChangeText={(t) => {
                        const n = Number(String(t).replace(/\D/g, '') || 0);
                        setNotifSettings((p) => ({
                          ...p,
                          morningMinute: Math.min(59, Math.max(0, n)),
                        }));
                      }}
                      onBlur={flushNotifTimes}
                      style={[styles.timeField, !notifSettings.enabled && styles.timeFieldDisabled]}
                    />
                  </View>
                </View>

                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockTitle}>Buổi tối</Text>
                  <Text style={styles.timeBlockSub}>
                    🔥 Đừng quên hoàn thành quest trước khi ngủ!
                  </Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      editable={notifSettings.enabled}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(notifSettings.eveningHour)}
                      onChangeText={(t) => {
                        const n = Number(String(t).replace(/\D/g, '') || 0);
                        setNotifSettings((p) => ({
                          ...p,
                          eveningHour: Math.min(23, Math.max(0, n)),
                        }));
                      }}
                      onBlur={flushNotifTimes}
                      style={[styles.timeField, !notifSettings.enabled && styles.timeFieldDisabled]}
                    />
                    <Text style={styles.timeSep}>:</Text>
                    <TextInput
                      editable={notifSettings.enabled}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(notifSettings.eveningMinute)}
                      onChangeText={(t) => {
                        const n = Number(String(t).replace(/\D/g, '') || 0);
                        setNotifSettings((p) => ({
                          ...p,
                          eveningMinute: Math.min(59, Math.max(0, n)),
                        }));
                      }}
                      onBlur={flushNotifTimes}
                      style={[styles.timeField, !notifSettings.enabled && styles.timeFieldDisabled]}
                    />
                  </View>
                </View>
              </>
            )}
          </SectionCard>
        ) : null}

        <Text style={styles.footer}>
          Đồng bộ đám mây (Firestore) · cache offline (AsyncStorage) · quest reset
          mỗi ngày mới theo lịch
        </Text>
      </ScrollView>
      {systemMessage}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0c0c10' },
  flexInner: { flex: 1 },
  achToastWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 50,
    backgroundColor: '#1e1c14',
    borderWidth: 1,
    borderColor: '#5c4f2a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  achToastText: {
    color: '#f3eee6',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  titleToastWrap: {
    backgroundColor: '#3a2a0a',
    borderColor: '#f59e0b',
  },
  titleToastText: {
    color: '#fff7d6',
  },
  passiveToastWrap: {
    backgroundColor: '#33270b',
    borderColor: '#d4af37',
  },
  passiveToastText: {
    color: '#fff3bf',
  },
  milestoneToastWrap: {
    backgroundColor: '#0f2f22',
    borderColor: '#10b981',
  },
  milestoneToastText: {
    color: '#d1fae5',
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0c0c10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#8a847a', marginTop: 12 },
  hero: { marginBottom: 14 },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTexts: { flex: 1, paddingRight: 8 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroIconTap: { padding: 6 },
  heroIcon: { fontSize: 24 },
  brand: {
    color: '#f3eee6',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: { color: '#7d786f', marginTop: 4, fontSize: 13 },
  statsCard: {
    backgroundColor: '#14141c',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a38',
    marginBottom: 8,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelLabel: { color: '#9a958c', fontSize: 12 },
  levelNum: { color: '#d4af37', fontSize: 32, fontWeight: '800' },
  levelTitle: {
    color: '#f59e0b',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 1,
    minWidth: 86,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#241a12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d2a18',
  },
  streakIcon: { fontSize: 22, marginRight: 8 },
  streakNum: { color: '#ffb454', fontWeight: '700' },
  streakMeta: { color: '#a88050', fontSize: 11, marginTop: 2 },
  diffHint: {
    color: '#5c5766',
    fontSize: 11,
    marginTop: 6,
  },
  characterStatsSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  characterStatsTitle: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  characterStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characterStatTile: {
    width: '48.7%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#373737',
  },
  characterStatTileFull: {
    width: '100%',
  },
  characterStatTop: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  characterStatName: {
    flex: 1,
    minWidth: 0,
    color: '#f3eee6',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 8,
  },
  characterStatLevel: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  characterStatTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  characterStatFill: {
    height: '100%',
    borderRadius: 2,
  },
  characterStatXp: {
    color: '#9a958c',
    fontSize: 10,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  inputRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#12121a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e8e4dc',
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  addBtn: {
    backgroundColor: '#3d3520',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5c4f2a',
  },
  addBtnText: { color: '#d4af37', fontWeight: '700' },
  empty: { color: '#5c5766', fontStyle: 'italic', marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  taskCheck: { flex: 1 },
  trash: { padding: 8, marginLeft: 4 },
  trashText: { color: '#8a5a5a', fontSize: 16, fontWeight: '700' },
  smallNote: { color: '#5c5766', fontSize: 11, marginTop: 8 },
  badBlock: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  badTitle: { color: '#ddd8d0', fontWeight: '600', marginBottom: 8 },
  badActions: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  pillOk: {
    backgroundColor: '#13261c',
    borderColor: '#2a5c40',
  },
  pillBad: {
    backgroundColor: '#2a1616',
    borderColor: '#5c2a2a',
  },
  pillActiveOk: {
    borderColor: '#4e9f6d',
    backgroundColor: '#1a3324',
  },
  pillActiveBad: {
    borderColor: '#c94c4c',
    backgroundColor: '#331a1a',
  },
  pillDisabled: { opacity: 0.35 },
  pillPressed: { opacity: 0.8 },
  pillText: { color: '#e8e4dc', fontWeight: '700', fontSize: 13 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 4,
  },
  notifRowText: { flex: 1, marginRight: 12 },
  notifLabel: {
    color: '#e8e4dc',
    fontSize: 15,
    fontWeight: '700',
  },
  notifHint: {
    color: '#5c5766',
    fontSize: 11,
    marginTop: 4,
  },
  timeBlock: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  timeBlockTitle: {
    color: '#c8c4bc',
    fontSize: 13,
    fontWeight: '700',
  },
  timeBlockSub: {
    color: '#5c5766',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeField: {
    minWidth: 48,
    backgroundColor: '#12121a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e8e4dc',
    borderWidth: 1,
    borderColor: '#2a2a38',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timeFieldDisabled: {
    opacity: 0.4,
  },
  timeSep: {
    color: '#7d786f',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  footer: {
    color: '#4a453d',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  penaltySection: {
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  penaltyTitle: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  penaltyText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  penaltyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  penaltyBtnComplete: {
    flex: 1,
    backgroundColor: '#064e3b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  penaltyBtnSkip: {
    flex: 1,
    backgroundColor: '#450a0a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  penaltyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
