import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  acceptBossTask,
  calculatePlayerPower,
  canPlayerJoinBoss,
  completeBossTask,
  completeBossTaskAndRollRewards,
  createMockBossEvent,
  createMockBossRules,
  createMockBossTasks,
  createMockLootTable,
  createMockRevealedBoss,
  createScheduledBossState,
  createTestRevealedBossState,
  expireCurrentBoss,
  failExpiredBossTasks,
  finishCurrentBossAndScheduleNext,
  formatPower,
  getBossParticipationState,
  getBossAchievementProgress,
  getBossHunterRank,
  getInventorySummary,
  getPowerRank,
  inventoryToDisplayRows,
  normalizeBossForDisplay,
  normalizeBossRulesForDisplay,
  normalizeBossResultsForDisplay,
  normalizeBossTasksForDisplay,
  normalizeLootTableForDisplay,
  summarizeBossResults,
  summarizeBossCodex,
  summarizeBossLootCollection,
  useInventoryItem,
} from '../utils/boss';
import { getBossVisual, getItemVisual } from '../utils/bossAssets';
import {
  fetchBossEncounterFromAI,
  fetchBossTasksFromAI,
  gradeBossTaskProofWithAI,
} from '../utils/aiCoach';

const DETAIL_TABS = [
  { id: 'rules', label: 'Nội quy' },
  { id: 'tasks', label: 'Nhiệm vụ' },
  { id: 'loot', label: 'Chiến lợi phẩm' },
];

const MAIN_TABS = [
  { id: 'current', label: 'Trận hiện tại' },
  { id: 'inventory', label: 'Túi đồ' },
  { id: 'history', label: 'Lịch sử' },
  { id: 'codex', label: 'Sổ tay' },
  { id: 'achievements', label: 'Danh hiệu' },
];

function formatCountdown(ms) {
  const numeric = Number(ms);
  const safe = Number.isFinite(numeric)
    ? Math.max(0, Math.floor(numeric / 1000))
    : 0;
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (days > 0) {
    return `${days} ngày ${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;
  }
  return `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;
}

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <View style={styles.hpWrap}>
      <View style={styles.hpHeader}>
        <Text style={styles.hpLabel}>MÁU BOSS</Text>
        <Text style={styles.hpPercent}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.hpText}>
        {formatPower(current)} / {formatPower(max)} máu
      </Text>
    </View>
  );
}

function getStatusTone(status) {
  if (status === 'defeated') return 'success';
  if (status === 'expired') return 'danger';
  if (status === 'active') return 'warning';
  return 'neutral';
}

function StatusBadge({ label, tone = 'neutral' }) {
  return (
    <View style={[styles.statusBadge, styles[`${tone}Badge`]]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

function SummaryPill({ label, value }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryPillLabel}>{label}</Text>
      <Text style={styles.summaryPillValue}>{value}</Text>
    </View>
  );
}

function BossArt({ boss }) {
  const visual = getBossVisual(boss?.imageKey ?? boss?.templateId);
  if (visual.source) {
    return (
      <View style={styles.bossArtMock}>
        <Image source={visual.source} style={styles.bossImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bossArtMock,
        {
          backgroundColor: visual.colors[0],
          borderColor: visual.colors[1],
        },
      ]}
    >
      <View style={[styles.bossSilhouette, { borderColor: visual.colors[2] }]}>
        <Text style={[styles.bossArtText, { color: visual.colors[2] }]}>
          {visual.symbol}
        </Text>
      </View>
      <Text style={styles.assetKeyText}>{visual.expectedFile}</Text>
    </View>
  );
}

function BossMiniArt({ imageKey }) {
  const visual = getBossVisual(imageKey);
  if (visual.source) {
    return (
      <View style={styles.bossMiniArt}>
        <Image source={visual.source} style={styles.bossMiniImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bossMiniArt,
        {
          backgroundColor: visual.colors[0],
          borderColor: visual.colors[1],
        },
      ]}
    >
      <Text style={[styles.bossMiniText, { color: visual.colors[2] }]}>
        {visual.symbol}
      </Text>
    </View>
  );
}

function ItemIcon({ item, quantity }) {
  const visual = getItemVisual(item?.iconKey ?? item?.id ?? item?.itemId, item?.rarity);
  if (visual.source) {
    return (
      <View style={styles.itemIcon}>
        <Image source={visual.source} style={styles.itemImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.itemIcon,
        {
          backgroundColor: visual.colors[0],
          borderColor: visual.colors[1],
        },
      ]}
    >
      <Text style={styles.itemIconText}>{quantity ?? visual.symbol}</Text>
    </View>
  );
}

function formatDateTime(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'Chưa có';
  }
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getResultOutcomeLabel(outcome) {
  if (outcome === 'defeated') return 'Chiến thắng';
  if (outcome === 'expired') return 'Hết giờ';
  return outcome;
}

function getBossStatusLabel(status) {
  const text = String(status ?? '');
  if (text === 'active') return 'Đang đánh';
  if (text === 'defeated') return 'Đã hạ';
  if (text === 'expired') return 'Hết giờ';
  if (text === 'countdown') return 'Đếm ngược';
  if (text === 'preview') return 'Xem trước';
  if (text === 'armed') return 'Đã lên lịch';
  if (text === 'locked') return 'Đang khóa';
  if (text === 'empty') return 'Chưa có';
  if (text === 'hidden') return 'Bí ẩn';
  return text || 'Không rõ';
}

function getTaskStatusLabel(status) {
  const text = String(status ?? '');
  if (text === 'Available') return 'Có thể nhận';
  if (text === 'Accepted') return 'Đã nhận';
  if (text === 'Completed') return 'Đã xong';
  if (text === 'Failed') return 'Thất bại';
  if (text === 'Locked') return 'Đang khóa';
  return text || 'Không rõ';
}

function getRarityLabel(rarity) {
  const text = String(rarity ?? '');
  if (text === 'Common') return 'Thường';
  if (text === 'Rare') return 'Hiếm';
  if (text === 'Epic') return 'Sử thi';
  if (text === 'Legendary') return 'Huyền thoại';
  if (text === 'Mythic') return 'Thần thoại';
  return text || 'Không rõ';
}

function getUseTypeLabel(useType) {
  const text = String(useType ?? '');
  if (text === 'restore_hp') return 'Hồi HP';
  if (text === 'restore_mp') return 'Hồi MP';
  if (text === 'prevent_hp_loss') return 'Chặn mất HP';
  if (text === 'protect_streak') return 'Bảo vệ chuỗi';
  if (text === 'valid_rest_day') return 'Ngày nghỉ hợp lệ';
  if (text === 'death_pardon') return 'Miễn tử';
  if (text === 'loot_boost') return 'Tăng may mắn';
  if (text === 'extend_boss_task') return 'Gia hạn boss';
  if (text === 'crafting_material') return 'Nguyên liệu';
  return text || 'Không rõ';
}

function getEventTypeLabel(eventType) {
  const text = String(eventType ?? '');
  if (text === 'work') return 'Công việc';
  if (text === 'fitness') return 'Thể dục';
  if (text === 'discipline') return 'Kỷ luật';
  if (text === 'weekly') return 'Boss tuần';
  if (text === 'elite') return 'Tinh anh';
  if (text === 'world') return 'Thế giới';
  return text || 'Không rõ';
}

function getBossTierLabel(tier) {
  const text = String(tier ?? '');
  if (text === 'World') return 'Thế giới';
  if (text === 'Elite') return 'Tinh anh';
  if (text === 'Nightmare') return 'Ác mộng';
  if (text === 'Hard') return 'Khó';
  if (text === 'Standard') return 'Tiêu chuẩn';
  return text || 'Không rõ';
}

function getGeneratorLabel(generator) {
  const text = String(generator ?? '');
  if (text === 'local_boss_generator_v1') return 'Máy sinh boss trong app';
  if (text === 'local_scheduler_v1') return 'Lịch tự động trong app';
  if (text === 'local') return 'Trong app';
  if (text === 'manual') return 'Tạo thủ công';
  return text || 'Không rõ';
}

function getBalanceLabel(balanceVersion) {
  const text = String(balanceVersion ?? '');
  if (text === 'discipline_safe_v1') return 'Cân bằng kỷ luật an toàn V1';
  return text || 'Không rõ';
}

export default function BossScreen({
  state,
  onBossStateChange,
  onBossFullStateChange,
  onBossAchievementUnlock,
  onBossHunterRankUp,
}) {
  const [mockMode, setMockMode] = useState('countdown');
  const [mainTab, setMainTab] = useState('current');
  const [detailTab, setDetailTab] = useState('rules');
  const [itemUseMessage, setItemUseMessage] = useState('');
  const [aiTaskMessage, setAiTaskMessage] = useState('');
  const [aiTaskLoading, setAiTaskLoading] = useState(false);
  const [aiBossLoading, setAiBossLoading] = useState(false);
  const [aiRevealEventId, setAiRevealEventId] = useState('');
  const [proofDrafts, setProofDrafts] = useState({});
  const [proofMessages, setProofMessages] = useState({});
  const [proofLoadingTaskId, setProofLoadingTaskId] = useState('');
  const [now, setNow] = useState(Date.now());
  const profile = state?.profile ?? {};
  const bossState = state?.boss ?? {};
  const hasStateEvent = Boolean(bossState.currentEvent);
  const hasStateBoss = Boolean(bossState.currentBoss);
  const playerPower = calculatePlayerPower(profile);
  const powerRank = getPowerRank(playerPower.total);
  const mockEvent = useMemo(() => createMockBossEvent(now), []);
  const mockBoss = useMemo(
    () => createMockRevealedBoss(playerPower.total, bossState.currentEvent?.eventType),
    [bossState.currentEvent?.eventType, playerPower.total]
  );
  const event = hasStateEvent ? bossState.currentEvent : mockEvent;
  const displayedBoss = useMemo(
    () =>
      hasStateBoss
        ? normalizeBossForDisplay(bossState.currentBoss, playerPower.total)
        : mockBoss,
    [bossState.currentBoss, hasStateBoss, mockBoss, playerPower.total]
  );
  const participation = getBossParticipationState(
    playerPower.total,
    displayedBoss
  );
  const participationGate = canPlayerJoinBoss(playerPower.total, displayedBoss);
  const canInteractWithBoss =
    Boolean(displayedBoss) &&
    participationGate.allowed &&
    displayedBoss.currentHp > 0 &&
    !['defeated', 'expired'].includes(displayedBoss.status);
  const rules = useMemo(
    () =>
      hasStateBoss
        ? normalizeBossRulesForDisplay(bossState.rules, displayedBoss)
        : createMockBossRules(displayedBoss),
    [bossState.rules, displayedBoss, hasStateBoss]
  );
  const tasks = useMemo(
    () =>
      hasStateBoss
        ? normalizeBossTasksForDisplay(bossState.tasks, displayedBoss)
        : createMockBossTasks(displayedBoss),
    [bossState.tasks, displayedBoss, hasStateBoss]
  );
  const loot = useMemo(
    () =>
      hasStateBoss
        ? normalizeLootTableForDisplay(bossState.lootTable)
        : createMockLootTable(),
    [bossState.lootTable, hasStateBoss]
  );
  const inventory = useMemo(
    () => inventoryToDisplayRows(state?.inventory),
    [state?.inventory]
  );
  const inventorySummary = useMemo(
    () => getInventorySummary(state?.inventory),
    [state?.inventory]
  );
  const bossHistory = useMemo(
    () => normalizeBossResultsForDisplay(bossState.results),
    [bossState.results]
  );
  const bossStats = useMemo(
    () => summarizeBossResults(bossState.results),
    [bossState.results]
  );
  const bossHunterRank = useMemo(
    () => getBossHunterRank(bossState.results),
    [bossState.results]
  );
  const notifiedHunterRank = String(bossState.notifiedHunterRank ?? '');
  const shouldNotifyHunterRank =
    bossHunterRank.rank !== 'E' && bossHunterRank.rank !== notifiedHunterRank;
  const bossCodex = useMemo(
    () => summarizeBossCodex(bossState.results),
    [bossState.results]
  );
  const bossLootCollection = useMemo(
    () => summarizeBossLootCollection(bossState.results),
    [bossState.results]
  );
  const bossAchievements = useMemo(
    () => getBossAchievementProgress(bossState.results),
    [bossState.results]
  );
  const storedBossAchievementIdKey = Array.isArray(
    bossState.unlockedAchievementIds
  )
    ? bossState.unlockedAchievementIds.join('|')
    : '';
  const pendingBossAchievements = useMemo(() => {
    const storedIds = new Set(
      Array.isArray(bossState.unlockedAchievementIds)
        ? bossState.unlockedAchievementIds.map((id) => String(id))
        : []
    );
    return bossAchievements.filter(
      (achievement) => achievement.unlocked && !storedIds.has(achievement.id)
    );
  }, [bossAchievements, storedBossAchievementIdKey]);
  const recentBossAchievementIds = Array.isArray(
    bossState.lastUnlockedAchievementIds
  )
    ? bossState.lastUnlockedAchievementIds.map((id) => String(id))
    : [];
  const recentBossAchievements = bossAchievements.filter((achievement) =>
    recentBossAchievementIds.includes(achievement.id)
  );
  const unlockedBossAchievements = bossAchievements.filter(
    (achievement) => achievement.unlocked
  ).length;
  const activeInventoryEffects = Array.isArray(state?.inventory?.activeEffects)
    ? state.inventory.activeEffects.filter(
        (effect) => effect && effect.status === 'active'
      )
    : [];
  const taskSummary = useMemo(
    () => ({
      total: tasks.length,
      available: tasks.filter((task) => task.status === 'Available').length,
      accepted: tasks.filter((task) => task.status === 'Accepted').length,
      completed: tasks.filter((task) => task.status === 'Completed').length,
      failed: tasks.filter((task) => task.status === 'Failed').length,
    }),
    [tasks]
  );
  const lootSummary = useMemo(
    () => ({
      total: loot.entries.length,
      rareCount: loot.entries.filter((item) =>
        ['Epic', 'Legendary', 'Mythic'].includes(item.rarity)
      ).length,
    }),
    [loot.entries]
  );
  const latestResult =
    Array.isArray(bossState.results) && bossState.results.length > 0
      ? bossState.results[bossState.results.length - 1]
      : null;
  const canScheduleNextBoss =
    hasStateBoss && ['defeated', 'expired'].includes(displayedBoss?.status);

  useEffect(() => {
    if (hasStateBoss) {
      setMockMode('reveal');
    } else if (hasStateEvent) {
      setMockMode('countdown');
    }
  }, [bossState.currentBoss?.id, bossState.currentEvent?.id, hasStateBoss, hasStateEvent]);

  useEffect(() => {
    const revealAt = Number(bossState.currentEvent?.revealAt);
    if (
      !hasStateEvent ||
      hasStateBoss ||
      !Number.isFinite(revealAt) ||
      revealAt > now ||
      !onBossFullStateChange
    ) {
      return;
    }

    const eventId = String(bossState.currentEvent?.id ?? 'auto_reveal');
    if (aiRevealEventId === eventId) return;
    handleRevealAiBoss('auto');
  }, [
    aiRevealEventId,
    bossState.currentEvent?.id,
    bossState.currentEvent?.revealAt,
    bossState.currentEvent?.eventType,
    hasStateBoss,
    hasStateEvent,
    now,
    onBossFullStateChange,
    playerPower.total,
  ]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      mainTab === 'current' &&
      !DETAIL_TABS.some((tab) => tab.id === detailTab)
    ) {
      setDetailTab('rules');
    }
  }, [detailTab, mainTab]);

  useEffect(() => {
    const endsAt = Number(bossState.currentBoss?.endsAt);
    const status = String(bossState.currentBoss?.status ?? '');
    if (
      !hasStateBoss ||
      !onBossFullStateChange ||
      !Number.isFinite(endsAt) ||
      endsAt > now ||
      ['defeated', 'expired'].includes(status)
    ) {
      return;
    }

    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: expireCurrentBoss(prevState?.boss, playerPower.total, now),
    }));
    setMockMode('reveal');
    setDetailTab('tasks');
  }, [
    bossState.currentBoss?.endsAt,
    bossState.currentBoss?.id,
    bossState.currentBoss?.status,
    hasStateBoss,
    now,
    onBossFullStateChange,
    playerPower.total,
  ]);

  useEffect(() => {
    if (!hasStateBoss || !onBossFullStateChange) {
      return;
    }

    const hasOpenTask = tasks.some((task) =>
      ['Available', 'Accepted'].includes(task.status)
    );
    if (!hasOpenTask) return;

    const sweepExpiredTasks = () => {
      const tickNow = Date.now();
      onBossFullStateChange((prevState) => {
        const nextBoss = failExpiredBossTasks(
          prevState?.boss,
          playerPower.total,
          tickNow
        );
        return nextBoss === prevState?.boss
          ? prevState
          : {
              ...prevState,
              boss: nextBoss,
            };
      });
    };

    sweepExpiredTasks();
    const timer = setInterval(sweepExpiredTasks, 30000);

    return () => clearInterval(timer);
  }, [
    hasStateBoss,
    onBossFullStateChange,
    playerPower.total,
    tasks,
  ]);

  useEffect(() => {
    if (pendingBossAchievements.length === 0 || !onBossFullStateChange) {
      return;
    }

    const pendingIds = pendingBossAchievements.map(
      (achievement) => achievement.id
    );
    const pendingTitles = pendingBossAchievements.map(
      (achievement) => achievement.title
    );
    const unlockedAt = Date.now();

    onBossFullStateChange((prevState) => {
      const boss = prevState?.boss && typeof prevState.boss === 'object'
        ? prevState.boss
        : {};
      const existingIds = Array.isArray(boss.unlockedAchievementIds)
        ? boss.unlockedAchievementIds.map((id) => String(id))
        : [];
      const mergedIds = [...new Set([...existingIds, ...pendingIds])].slice(-50);
      return {
        ...prevState,
        boss: {
          ...boss,
          unlockedAchievementIds: mergedIds,
          lastUnlockedAchievementIds: pendingIds.slice(-10),
          lastAchievementUnlockedAt: unlockedAt,
        },
      };
    });

    onBossAchievementUnlock?.(pendingTitles);
  }, [
    onBossAchievementUnlock,
    onBossFullStateChange,
    pendingBossAchievements,
  ]);

  useEffect(() => {
    if (!shouldNotifyHunterRank || !onBossFullStateChange) {
      return;
    }

    const unlockedAt = Date.now();
    onBossFullStateChange((prevState) => {
      const boss = prevState?.boss && typeof prevState.boss === 'object'
        ? prevState.boss
        : {};
      return {
        ...prevState,
        boss: {
          ...boss,
          notifiedHunterRank: bossHunterRank.rank,
          lastHunterRankUnlockedAt: unlockedAt,
        },
      };
    });

    onBossHunterRankUp?.(bossHunterRank);
  }, [
    bossHunterRank,
    onBossFullStateChange,
    onBossHunterRankUp,
    shouldNotifyHunterRank,
  ]);

  function updateBossState(updater) {
    if (!onBossStateChange) return;
    onBossStateChange((prevBossState) => updater(prevBossState));
    setMockMode('reveal');
    setDetailTab('tasks');
  }

  function handleAcceptTask(taskId) {
    updateBossState((prevBossState) =>
      acceptBossTask(prevBossState, taskId, playerPower.total)
    );
  }

  function handleCompleteTask(taskId, proofResult = null) {
    if (onBossFullStateChange) {
      const completedAt = Date.now();
      onBossFullStateChange((prevState) => {
        const next = completeBossTaskAndRollRewards(
          prevState?.boss,
          prevState?.inventory,
          taskId,
          playerPower.total,
          completedAt,
          proofResult
        );
        return {
          ...prevState,
          boss: next.boss,
          inventory: next.inventory,
        };
      });
      setMockMode('reveal');
      setDetailTab('tasks');
      return;
    }

    updateBossState((prevBossState) =>
      completeBossTask(
        prevBossState,
        taskId,
        playerPower.total,
        Date.now(),
        proofResult
      )
    );
  }

  async function handleSubmitBossProof(task) {
    if (!task?.id || proofLoadingTaskId) return;
    const proofText = String(proofDrafts[task.id] ?? '').trim();
    if (proofText.length < 12) {
      setProofMessages((prev) => ({
        ...prev,
        [task.id]: 'Bằng chứng quá ngắn. Hãy nhập thời gian, số lượng hoặc kết quả rõ hơn.',
      }));
      return;
    }

    setProofLoadingTaskId(task.id);
    setProofMessages((prev) => ({
      ...prev,
      [task.id]: 'AI đang chấm bằng chứng...',
    }));

    try {
      const verdict = await gradeBossTaskProofWithAI({
        state,
        boss: displayedBoss,
        task,
        proofText,
        playerPower: playerPower.total,
        now: Date.now(),
      });
      const prefix = verdict.approved ? 'Đạt' : 'Chưa đạt';
      const scoreText = verdict.passScore
        ? `${verdict.score}/${verdict.passScore}`
        : `${verdict.score}/100`;
      const missingText =
        !verdict.approved && verdict.missing?.length
          ? ` Thiếu: ${verdict.missing.join(', ')}`
          : '';
      setProofMessages((prev) => ({
        ...prev,
        [task.id]: `${prefix} ${scoreText}: ${verdict.feedback}${missingText}`,
      }));

      if (verdict.approved) {
        handleCompleteTask(task.id, {
          ...verdict,
          proofText,
        });
      }
    } catch {
      setProofMessages((prev) => ({
        ...prev,
        [task.id]: `Không chấm được bằng chứng: ${error?.message ?? 'lỗi không rõ'}`,
      }));
    } finally {
      setProofLoadingTaskId('');
    }
  }

  async function handleGenerateAiBossTasks() {
    if (!onBossFullStateChange || !displayedBoss || aiTaskLoading) return;
    setAiTaskLoading(true);
    setAiTaskMessage('Đang gọi AI sinh nhiệm vụ boss...');
    try {
      const generated = await fetchBossTasksFromAI({
        state,
        boss: displayedBoss,
        playerPower: playerPower.total,
        now: Date.now(),
      });
      onBossFullStateChange((prevState) => ({
        ...prevState,
        boss: {
          ...(prevState?.boss ?? {}),
          tasks: generated.tasks,
          taskGenerator: {
            generatedBy: generated.generatedBy,
            generatedAt: generated.generatedAt,
            reason: generated.reason,
          },
        },
      }));
      setMockMode('reveal');
      setDetailTab('tasks');
      setAiTaskMessage(
        generated.reason
          ? `AI đã sinh ${generated.tasks.length} nhiệm vụ: ${generated.reason}`
          : `AI đã sinh ${generated.tasks.length} nhiệm vụ boss.`
      );
    } catch (error) {
      setAiTaskMessage(
        `Không sinh được nhiệm vụ AI: ${error?.message ?? 'lỗi không rõ'}`
      );
    } finally {
      setAiTaskLoading(false);
    }
  }

  async function handleRevealAiBoss(source = 'manual') {
    if (!onBossFullStateChange || aiBossLoading) return;
    const revealNow = Date.now();
    const eventType = bossState.currentEvent?.eventType ?? 'weekly';
    const eventId = String(bossState.currentEvent?.id ?? `${source}_${revealNow}`);
    setAiBossLoading(true);
    setAiRevealEventId(eventId);

    const baseBoss = {
      ...createMockRevealedBoss(playerPower.total, eventType, revealNow),
      status: 'active',
      revealedAt: revealNow,
    };
    baseBoss.currentHp = baseBoss.maxHp;
    const baseLootTable = createMockLootTable(baseBoss);

    try {
      const generated = await fetchBossEncounterFromAI({
        state,
        baseBoss,
        baseLootTable,
        playerPower: playerPower.total,
        eventType,
        now: revealNow,
      });

      onBossFullStateChange((prevState) => {
        const prevBoss = prevState?.boss && typeof prevState.boss === 'object'
          ? prevState.boss
          : {};
        const historyIds = Array.isArray(prevBoss.lastSeenBossTemplateIds)
          ? prevBoss.lastSeenBossTemplateIds
          : [];
        return {
          ...prevState,
          boss: {
            ...prevBoss,
            currentEvent: null,
            currentBoss: generated.boss,
            tasks: generated.tasks,
            rules: generated.rules,
            lootTable: generated.lootTable,
            taskGenerator: {
              generatedBy: generated.generatedBy,
              generatedAt: generated.generatedAt,
              reason: generated.reason,
              challengeTier: generated.challengeTier,
              bossGenerated: true,
            },
            lastSeenBossTemplateIds: [
              ...new Set([
                ...historyIds,
                generated.boss.templateId,
                generated.boss.id,
              ]),
            ].slice(-20),
          },
        };
      });

      setMockMode('reveal');
      setDetailTab('rules');
    } catch (error) {
      onBossFullStateChange((prevState) => {
        const prevBoss = prevState?.boss && typeof prevState.boss === 'object'
          ? prevState.boss
          : {};
        const fallbackBoss = createTestRevealedBossState(
          playerPower.total,
          eventType
        );
        return {
          ...prevState,
          boss: {
            ...prevBoss,
            ...fallbackBoss,
            results: Array.isArray(prevBoss.results) ? prevBoss.results : [],
            unlockedAchievementIds: Array.isArray(prevBoss.unlockedAchievementIds)
              ? prevBoss.unlockedAchievementIds
              : [],
            lastUnlockedAchievementIds: Array.isArray(
              prevBoss.lastUnlockedAchievementIds
            )
              ? prevBoss.lastUnlockedAchievementIds
              : [],
            notifiedHunterRank: prevBoss.notifiedHunterRank ?? '',
            lastHunterRankUnlockedAt: prevBoss.lastHunterRankUnlockedAt ?? 0,
          },
        };
      });
      setMockMode('reveal');
      setDetailTab('rules');
    } finally {
      setAiBossLoading(false);
    }
  }

  function handleInitializeSchedule() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createScheduledBossState(),
    }));
    setMockMode('countdown');
    setDetailTab('rules');
  }

  function handleScheduleNextBoss() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: finishCurrentBossAndScheduleNext(prevState?.boss),
    }));
    setMockMode('countdown');
    setDetailTab('rules');
  }

  function handleUseInventoryItem(itemId) {
    if (!onBossFullStateChange) return;
    let message = '';
    onBossFullStateChange((prevState) => {
      const result = useInventoryItem(prevState, itemId);
      message = result.message;
      return result.state;
    });
    setItemUseMessage(message);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.eyebrow}>CỔNG BOSS</Text>
              <Text style={styles.title}>Hệ thống Boss V1</Text>
            </View>
            <StatusBadge
              label={
                hasStateBoss
                  ? getBossStatusLabel(displayedBoss.status)
                  : hasStateEvent
                    ? 'Đếm ngược'
                    : 'Xem trước'
              }
              tone={
                hasStateBoss
                  ? getStatusTone(displayedBoss.status)
                  : hasStateEvent
                    ? 'warning'
                    : 'neutral'
              }
            />
          </View>
          <Text style={styles.subtitle}>
            {hasStateBoss || hasStateEvent
              ? 'Đang đọc dữ liệu boss đã lưu.'
              : 'Đang xem trước vì chưa có boss hoặc lịch boss.'}
          </Text>
          <View style={styles.heroSummary}>
            <SummaryPill label="Lực chiến" value={formatPower(playerPower.total)} />
            <SummaryPill label="Hạng" value={powerRank} />
            <SummaryPill
              label="Túi đồ"
              value={`${inventorySummary.totalQuantity} món`}
            />
          </View>
        </View>

        <View style={styles.mainTabs}>
          {MAIN_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[
                styles.mainTab,
                mainTab === tab.id && styles.mainTabActive,
              ]}
              onPress={() => setMainTab(tab.id)}
            >
              <Text
                style={[
                  styles.mainTabText,
                  mainTab === tab.id && styles.mainTabTextActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {mainTab === 'current' ? (
          <>
        <View style={styles.modeTabs}>
          <Pressable
            style={[
              styles.modeTab,
              mockMode === 'countdown' && styles.modeTabActive,
            ]}
            onPress={() => setMockMode('countdown')}
          >
            <Text
              style={[
                styles.modeTabText,
                mockMode === 'countdown' && styles.modeTabTextActive,
              ]}
            >
              Đếm ngược
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeTab, mockMode === 'reveal' && styles.modeTabActive]}
            onPress={() => setMockMode('reveal')}
          >
            <Text
              style={[
                styles.modeTabText,
                mockMode === 'reveal' && styles.modeTabTextActive,
              ]}
            >
              Hiện boss
            </Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Lịch cổng boss</Text>
            <StatusBadge
              label={
                hasStateEvent
                  ? 'Đã lên lịch'
                  : hasStateBoss
                    ? 'Đang khóa'
                    : 'Chưa có'
              }
              tone={hasStateEvent ? 'warning' : hasStateBoss ? 'neutral' : 'danger'}
            />
          </View>
          {hasStateEvent ? (
            <View style={styles.scheduleBox}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Sự kiện</Text>
                <Text style={styles.scheduleValue}>{event?.title}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Loại</Text>
                <Text style={styles.scheduleValue}>
                  {getEventTypeLabel(event?.eventType)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Hiện lúc</Text>
                <Text style={styles.scheduleValue}>
                  {formatDateTime(event?.revealAt)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Còn lại</Text>
                <Text style={styles.scheduleValue}>
                  {formatCountdown((event?.revealAt ?? event?.startsAt) - now)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Nguồn</Text>
                <Text style={styles.scheduleValue}>
                  {event?.source === 'local_scheduler'
                    ? 'Lịch tự động'
                    : event?.source ?? 'Test thủ công'}
                </Text>
              </View>
            </View>
          ) : hasStateBoss ? (
            <>
              <Text style={styles.muted}>
                Boss đang hoạt động, lịch tiếp theo sẽ được tạo sau khi kết thúc trận.
              </Text>
              {canScheduleNextBoss ? (
                <Pressable
                  style={styles.primaryAction}
                  onPress={handleScheduleNextBoss}
                >
                  <Text style={styles.primaryActionText}>
                    Tạo lịch boss tiếp theo
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.muted}>
                Chưa có lịch boss. Khởi tạo lịch tự động để bắt đầu đếm ngược.
              </Text>
              <Pressable
                style={styles.primaryAction}
                onPress={handleInitializeSchedule}
              >
                <Text style={styles.primaryActionText}>Khởi tạo lịch boss</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.panel}>
          {mockMode === 'countdown' ? (
            <>
              <View style={styles.panelTitleRow}>
                <Text style={styles.panelTitle}>Cổng boss đang mở</Text>
                <StatusBadge label="Bí ẩn" tone="warning" />
              </View>
              <View style={styles.portalBox}>
                <View style={styles.portalOuter}>
                  <View style={styles.portalInner}>
                    <Text style={styles.portalMark}>?</Text>
                  </View>
                </View>
                <Text style={styles.portalCaption}>DỮ LIỆU BOSS ĐANG KHÓA</Text>
              </View>
              <Text style={styles.status}>
                {event?.title ?? 'Boss sắp xuất hiện'}
              </Text>
              <Text style={styles.countdown}>
                {formatCountdown((event?.revealAt ?? event?.startsAt) - now)}
              </Text>
              <View style={styles.lockGrid}>
                <Text style={styles.lockRow}>Đang khóa: Thông tin boss ???</Text>
                <Text style={styles.lockRow}>Đang khóa: Nội quy sẽ mở khi boss hiện</Text>
                <Text style={styles.lockRow}>Đang khóa: Nhiệm vụ boss chưa mở</Text>
                <Text style={styles.lockRow}>Đang khóa: Bảng vật phẩm ???</Text>
              </View>
              {!hasStateEvent && !hasStateBoss ? (
                <Pressable
                  style={styles.primaryAction}
                  onPress={handleInitializeSchedule}
                >
                  <Text style={styles.primaryActionText}>Khởi tạo lịch boss</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.panelTitleRow}>
                <Text style={styles.panelTitle}>Boss đã xuất hiện</Text>
                <StatusBadge
                  label={getBossStatusLabel(displayedBoss.status)}
                  tone={getStatusTone(displayedBoss.status)}
                />
              </View>
              <BossArt boss={displayedBoss} />
              <View style={styles.bossTitleRow}>
                <View style={styles.bossTitleMain}>
                  <Text style={styles.bossName}>{displayedBoss.name}</Text>
                  <Text style={styles.bossMeta}>
                    {displayedBoss.typeLabel} - {displayedBoss.themeLabel}
                  </Text>
                  {displayedBoss.lore ? (
                    <Text style={styles.cardSubText}>{displayedBoss.lore}</Text>
                  ) : null}
                </View>
                <View style={styles.bossTierBadge}>
                  <Text style={styles.bossTierText}>
                    {getBossTierLabel(displayedBoss.generatedTier)}
                  </Text>
                </View>
              </View>
              {displayedBoss.status === 'expired' ? (
                <Text style={styles.expiredBanner}>
                  Boss đã hết giờ - không quay chiến lợi phẩm.
                </Text>
              ) : null}
              <HpBar current={displayedBoss.currentHp} max={displayedBoss.maxHp} />
              <View style={styles.statGrid}>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Lực chiến của bạn</Text>
                  <Text style={styles.statValue}>{formatPower(playerPower.total)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Yêu cầu tham gia</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.requiredPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Đề xuất solo</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.recommendedPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Lực chiến boss</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.bossPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Cấp boss</Text>
                  <Text style={styles.statValue}>Cấp {displayedBoss.level}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Bậc AI</Text>
                  <Text style={styles.statValue}>
                    {getBossTierLabel(displayedBoss.generatedTier)}
                  </Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Độ khó</Text>
                  <Text style={styles.statValue}>{displayedBoss.difficulty}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Bậc chiến lợi phẩm</Text>
                  <Text style={styles.statValue}>T{displayedBoss.lootTier}</Text>
                </View>
              </View>
              <View style={styles.aiStatBox}>
                <Text style={styles.blockTitle}>Chỉ số boss AI</Text>
                <View style={styles.aiStatGrid}>
                  <Text style={styles.aiStatText}>
                    Công {formatPower(displayedBoss.statLine.attack)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    Thủ {formatPower(displayedBoss.statLine.defense)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    Tốc {formatPower(displayedBoss.statLine.speed)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    Tập trung {formatPower(displayedBoss.statLine.focus)}
                  </Text>
                </View>
                <Text style={styles.cardSubText}>
                  Nguồn sinh: {displayedBoss.generatedBy}
                </Text>
                {displayedBoss.visualPrompt ? (
                  <Text style={styles.cardSubText}>
                    Prompt ảnh: {displayedBoss.visualPrompt}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.participationBox, styles[participation.tone]]}>
                <Text style={styles.participationLabel}>{participation.label}</Text>
                <Text style={styles.participationText}>{participation.description}</Text>
                <Text style={styles.participationReason}>
                  {participationGate.reason}
                </Text>
              </View>
              <View style={styles.skillBox}>
                <Text style={styles.skillName}>{displayedBoss.specialSkill.name}</Text>
                <Text style={styles.skillText}>{displayedBoss.specialSkill.description}</Text>
              </View>
              <Text style={styles.muted}>
                Thời gian còn lại:{' '}
                {displayedBoss.status === 'expired'
                  ? '00h 00m 00s'
                  : formatCountdown(displayedBoss.endsAt - now)}
              </Text>
              {canScheduleNextBoss ? (
                <Pressable
                  style={styles.primaryAction}
                  onPress={handleScheduleNextBoss}
                >
                  <Text style={styles.primaryActionText}>
                    Kết thúc boss và tạo lịch tiếp theo
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
          </>
        ) : null}

        {mainTab === 'history' ? (
          <>
        {latestResult ? (
          <View style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Kết quả trận boss</Text>
              <StatusBadge
                label={getResultOutcomeLabel(latestResult.outcome)}
                tone={latestResult.outcome === 'defeated' ? 'success' : 'danger'}
              />
            </View>
            <Text
              style={[
                styles.resultOutcome,
                latestResult.outcome === 'expired' && styles.resultFailure,
              ]}
            >
              {latestResult.outcome === 'defeated'
                ? 'Chiến thắng'
                : latestResult.outcome === 'expired'
                  ? 'Hết giờ - thất bại'
                : latestResult.outcome}
            </Text>
            <View style={styles.resultGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Sát thương</Text>
                <Text style={styles.statValue}>
                  {formatPower(latestResult.damageDealt)}
                </Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Tỉ lệ sát thương</Text>
                <Text style={styles.statValue}>{latestResult.damagePercent}%</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Nhiệm vụ xong</Text>
                <Text style={styles.statValue}>{latestResult.tasksCompleted}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Lượt quay</Text>
                <Text style={styles.statValue}>{latestResult.rollsEarned}</Text>
              </View>
            </View>
            {latestResult.reason ? (
              <Text style={styles.cardSubText}>{latestResult.reason}</Text>
            ) : null}
            {latestResult.bonusRolls ? (
              <Text style={styles.cardSubText}>
                Lượt quay cộng thêm từ vật phẩm: +{latestResult.bonusRolls}
              </Text>
            ) : null}
            <Text style={styles.blockTitle}>Chiến lợi phẩm nhận được</Text>
            {Array.isArray(latestResult.lootReceived) &&
            latestResult.lootReceived.length > 0 ? (
              latestResult.lootReceived.map((item, index) => (
                <View key={`${item.itemId}-${index}`} style={styles.itemRow}>
                  <ItemIcon item={item} quantity={item.rarity?.[0] ?? '?'} />
                  <View style={styles.itemMain}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle}>
                        {item.name ?? item.itemId}
                      </Text>
                      <Text style={styles.itemQty}>x{item.quantity ?? 1}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {getRarityLabel(item.rarity)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.cardSubText}>Không có vật phẩm nào rơi.</Text>
            )}
            {canScheduleNextBoss ? (
              <Pressable
                style={styles.primaryAction}
                onPress={handleScheduleNextBoss}
              >
                <Text style={styles.primaryActionText}>
                  Tạo đếm ngược boss tiếp theo
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Thống kê boss</Text>
            <StatusBadge label={`${bossStats.winRate}% thắng`} tone="neutral" />
          </View>
          <View style={styles.resultGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Tổng trận</Text>
              <Text style={styles.statValue}>{bossStats.total}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Thắng / thua</Text>
              <Text style={styles.statValue}>
                {bossStats.victories}/{bossStats.expired}
              </Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Tổng sát thương</Text>
              <Text style={styles.statValue}>
                {formatPower(bossStats.totalDamage)}
              </Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Tổng đồ rơi</Text>
              <Text style={styles.statValue}>{bossStats.totalLoot}</Text>
            </View>
          </View>
          <View style={styles.recordBox}>
            <Text style={styles.blockTitle}>Kỷ lục hiện tại</Text>
            <Text style={styles.bulletLine}>
              - Boss mạnh nhất: {bossStats.strongestBossName} (
              {formatPower(bossStats.strongestBossPower)} lực chiến)
            </Text>
            <Text style={styles.bulletLine}>
              - Sát thương tốt nhất: {bossStats.bestDamagePercent}% trên{' '}
              {bossStats.bestDamageBossName}
            </Text>
            <Text style={styles.bulletLine}>
              - Trận nhiều đồ rơi nhất: {bossStats.bestLootBossName} (
              {bossStats.bestLootCount} món)
            </Text>
            <Text style={styles.bulletLine}>
              - Tổng lượt quay: {bossStats.totalRolls}
            </Text>
          </View>
        </View>
        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Lịch sử trận boss</Text>
            <StatusBadge label={`${bossHistory.length} trận`} tone="neutral" />
          </View>
          <View style={styles.detailBody}>
            {bossHistory.length === 0 ? (
              <View style={styles.emptyInventory}>
                <Text style={styles.emptyInventoryTitle}>
                  Chưa có lịch sử boss
                </Text>
                <Text style={styles.cardSubText}>
                  Khi boss bị hạ hoặc hết giờ, trận đấu sẽ được lưu ở đây.
                </Text>
              </View>
            ) : (
              bossHistory.map((result) => (
                <View key={result.id} style={styles.historyCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle}>{result.bossName}</Text>
                    <StatusBadge
                      label={getResultOutcomeLabel(result.outcome)}
                      tone={result.outcome === 'defeated' ? 'success' : 'danger'}
                    />
                  </View>
                  <Text style={styles.cardMeta}>
                    {result.bossTypeLabel} - {result.bossDifficulty} - Cấp{' '}
                    {result.bossLevel} - {formatDateTime(result.createdAt)}
                  </Text>
                  <View style={styles.historyStatGrid}>
                    <View style={styles.historyStatTile}>
                      <Text style={styles.statLabel}>Lực chiến</Text>
                      <Text style={styles.statValue}>
                        {formatPower(result.bossPower)}
                      </Text>
                    </View>
                    <View style={styles.historyStatTile}>
                      <Text style={styles.statLabel}>Sát thương</Text>
                      <Text style={styles.statValue}>
                        {result.damagePercent}%
                      </Text>
                    </View>
                    <View style={styles.historyStatTile}>
                      <Text style={styles.statLabel}>Nhiệm vụ</Text>
                      <Text style={styles.statValue}>
                        {result.tasksCompleted}/
                        {result.tasksCompleted + result.tasksFailed}
                      </Text>
                    </View>
                    <View style={styles.historyStatTile}>
                      <Text style={styles.statLabel}>Đồ rơi</Text>
                      <Text style={styles.statValue}>{result.lootCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubText}>
                    Lượt quay: {result.rollsEarned} - Bậc boss: {getBossTierLabel(result.bossTier)} -
                    Bậc đồ rơi {result.lootTier}
                  </Text>
                  {result.reason ? (
                    <Text style={styles.cardSubText}>{result.reason}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </View>
          </>
        ) : null}

        {mainTab === 'achievements' ? (
          <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Hạng thợ săn boss</Text>
            <StatusBadge label={`Hạng ${bossHunterRank.rank}`} tone="warning" />
          </View>
          <View style={styles.rankBox}>
            {bossState.lastHunterRankUnlockedAt &&
            bossState.notifiedHunterRank === bossHunterRank.rank ? (
              <Text style={styles.rankUnlockedText}>
                Vừa thăng hạng: {formatDateTime(bossState.lastHunterRankUnlockedAt)}
              </Text>
            ) : null}
            <Text style={styles.rankName}>
              {bossHunterRank.rank} - {bossHunterRank.title}
            </Text>
            <Text style={styles.rankScore}>
              {formatPower(bossHunterRank.score)} điểm săn boss
            </Text>
            <View style={styles.achievementTrack}>
              <View
                style={[
                  styles.rankFill,
                  { width: `${bossHunterRank.progressPercent}%` },
                ]}
              />
            </View>
            <View style={styles.rankProgressRow}>
              <Text style={styles.cardSubText}>
                Tiếp theo: {bossHunterRank.nextRank} - {bossHunterRank.nextTitle}
              </Text>
              <Text style={styles.cardSubText}>
                Còn {formatPower(bossHunterRank.pointsToNext)} điểm
              </Text>
            </View>
          </View>
          <View style={styles.resultGrid}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Tỉ lệ thắng</Text>
              <Text style={styles.statValue}>{bossStats.winRate}%</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>Lực chiến boss cao nhất</Text>
              <Text style={styles.statValue}>
                {formatPower(bossStats.strongestBossPower)}
              </Text>
            </View>
          </View>
        </View>
        ) : null}

        {mainTab === 'codex' ? (
          <>
        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Sổ tay boss</Text>
            <StatusBadge label={`${bossCodex.length} boss`} tone="neutral" />
          </View>
          {bossCodex.length === 0 ? (
            <View style={styles.emptyInventory}>
              <Text style={styles.emptyInventoryTitle}>Chưa có dữ liệu boss</Text>
              <Text style={styles.cardSubText}>
                Boss sẽ vào sổ tay sau khi một trận boss kết thúc.
              </Text>
            </View>
          ) : (
            <View style={styles.codexList}>
              {bossCodex.map((entry) => (
                <View key={entry.id} style={styles.codexCard}>
                  <BossMiniArt imageKey={entry.imageKey} />
                  <View style={styles.codexMain}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle}>{entry.bossName}</Text>
                      <Text style={styles.codexClearRate}>
                        {entry.victories}/{entry.encounters}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {entry.bossTypeLabel} - {entry.bossThemeLabel}
                    </Text>
                    <View style={styles.codexStatsRow}>
                      <Text style={styles.codexStat}>
                        Tốt nhất {entry.bestDamagePercent}%
                      </Text>
                      <Text style={styles.codexStat}>
                        Lực {formatPower(entry.strongestPower)}
                      </Text>
                      <Text style={styles.codexStat}>Đồ {entry.totalLoot}</Text>
                      <Text style={styles.codexStat}>
                        T{entry.highestLootTier}
                      </Text>
                    </View>
                    <Text style={styles.cardSubText}>
                      Lần cuối: {formatDateTime(entry.lastSeenAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Bộ sưu tập chiến lợi phẩm</Text>
            <StatusBadge
              label={`${bossLootCollection.length} vật phẩm`}
              tone="neutral"
            />
          </View>
          {bossLootCollection.length === 0 ? (
            <View style={styles.emptyInventory}>
              <Text style={styles.emptyInventoryTitle}>Chưa có vật phẩm rơi</Text>
              <Text style={styles.cardSubText}>
                Vật phẩm sẽ vào bộ sưu tập sau khi boss bị hạ và quay đồ.
              </Text>
            </View>
          ) : (
            <View style={styles.lootCollectionList}>
              {bossLootCollection.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <ItemIcon item={item} quantity={item.rarity[0]} />
                  <View style={styles.itemMain}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.itemQty}>x{item.totalQuantity}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {getRarityLabel(item.rarity)} - {getUseTypeLabel(item.useType)} - {item.dropCount} lần rơi
                    </Text>
                    <Text style={styles.cardSubText}>
                      Nguồn: {item.sourceBossNames.slice(0, 3).join(', ')}
                      {item.sourceBossNames.length > 3 ? '...' : ''}
                    </Text>
                    <Text style={styles.cardSubText}>
                      Lần gần nhất: {formatDateTime(item.lastDroppedAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
          </>
        ) : null}

        {mainTab === 'achievements' ? (
          <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Danh hiệu boss</Text>
            <StatusBadge
              label={`${unlockedBossAchievements}/${bossAchievements.length}`}
              tone={unlockedBossAchievements > 0 ? 'success' : 'neutral'}
            />
          </View>
          <View style={styles.achievementGrid}>
            {recentBossAchievements.length > 0 ? (
              <View style={styles.recentAchievementBox}>
                <Text style={styles.blockTitle}>Vừa mở khóa</Text>
                {recentBossAchievements.map((achievement) => (
                  <Text key={achievement.id} style={styles.bulletLine}>
                    - {achievement.title}
                  </Text>
                ))}
              </View>
            ) : null}
            {bossAchievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  achievement.unlocked && styles.achievementCardUnlocked,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{achievement.title}</Text>
                  <Text
                    style={[
                      styles.achievementState,
                      achievement.unlocked && styles.achievementStateUnlocked,
                    ]}
                  >
                    {achievement.unlocked ? 'Mở khóa' : 'Khóa'}
                  </Text>
                </View>
                <Text style={styles.cardSubText}>{achievement.description}</Text>
                <View style={styles.achievementTrack}>
                  <View
                    style={[
                      styles.achievementFill,
                      { width: `${achievement.progressPercent}%` },
                    ]}
                  />
                </View>
                <Text style={styles.cardMeta}>
                  {formatPower(achievement.current)} /{' '}
                  {formatPower(achievement.target)}
                </Text>
              </View>
            ))}
          </View>
        </View>
        ) : null}

        {mainTab === 'inventory' ? (
          <View style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Túi đồ boss</Text>
              <StatusBadge
                label={`${inventorySummary.totalQuantity} món`}
                tone="neutral"
              />
            </View>
            <View style={styles.detailBody}>
              <View style={styles.inventorySummary}>
                <View style={styles.inventorySummaryTile}>
                  <Text style={styles.statLabel}>Nhóm đồ</Text>
                  <Text style={styles.statValue}>
                    {inventorySummary.totalStacks}
                  </Text>
                </View>
                <View style={styles.inventorySummaryTile}>
                  <Text style={styles.statLabel}>Tổng số</Text>
                  <Text style={styles.statValue}>
                    {inventorySummary.totalQuantity}
                  </Text>
                </View>
                <View style={styles.inventorySummaryTile}>
                  <Text style={styles.statLabel}>Hiếm+</Text>
                  <Text style={styles.statValue}>
                    {inventorySummary.rareOrBetter}
                  </Text>
                </View>
                <View style={styles.inventorySummaryTile}>
                  <Text style={styles.statLabel}>Thần thoại</Text>
                  <Text style={styles.statValue}>
                    {inventorySummary.mythicCount}
                  </Text>
                </View>
              </View>
              {itemUseMessage ? (
                <Text style={styles.itemUseMessage}>{itemUseMessage}</Text>
              ) : null}
              {activeInventoryEffects.length > 0 ? (
                <View style={styles.activeEffectsBox}>
                  <Text style={styles.blockTitle}>Hiệu ứng đang bật</Text>
                  {activeInventoryEffects.map((effect) => (
                    <Text key={effect.id} style={styles.bulletLine}>
                      - {effect.name} ({getUseTypeLabel(effect.useType)})
                    </Text>
                  ))}
                </View>
              ) : null}
              {inventory.length === 0 ? (
                <View style={styles.emptyInventory}>
                  <Text style={styles.emptyInventoryTitle}>Túi đồ đang trống</Text>
                  <Text style={styles.cardSubText}>
                    Hạ boss để nhận vật phẩm. Từ phần này trở đi không hiện đồ
                    mẫu nữa.
                  </Text>
                </View>
              ) : (
                inventory.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <ItemIcon item={item} quantity={item.quantity} />
                    <View style={styles.itemMain}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.itemQty}>x{item.quantity}</Text>
                      </View>
                      <Text style={styles.cardMeta}>
                        {getRarityLabel(item.rarity)} - {item.scope} - {item.state}
                      </Text>
                      <Text style={styles.cardSubText}>{item.description}</Text>
                      <Text style={styles.cardSubText}>
                        Loại: {getUseTypeLabel(item.useType)} - Tổng đã nhặt: {item.totalObtained}
                      </Text>
                      <View style={styles.inventoryActions}>
                        {[
                          'restore_hp',
                          'restore_mp',
                          'prevent_hp_loss',
                          'protect_streak',
                          'valid_rest_day',
                          'death_pardon',
                          'loot_boost',
                          'extend_boss_task',
                        ].includes(item.useType) ? (
                          <Pressable
                            style={styles.useItemBtn}
                            onPress={() => handleUseInventoryItem(item.id)}
                            disabled={!onBossFullStateChange}
                          >
                            <Text style={styles.useItemText}>Dùng</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          style={[styles.useItemBtn, styles.useItemDisabled]}
                          disabled
                        >
                          <Text style={styles.useItemText}>
                            {item.useType === 'crafting_material'
                              ? 'Nguyên liệu'
                              : 'Chưa dùng'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        {mainTab === 'current' && mockMode === 'reveal' ? (
          <View style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Bảng boss</Text>
              <StatusBadge label={detailTab} tone="neutral" />
            </View>
            <View style={styles.boardSummary}>
              <SummaryPill
                label="Nhiệm vụ"
                value={`${taskSummary.completed}/${taskSummary.total}`}
              />
              <SummaryPill label="Đã nhận" value={taskSummary.accepted} />
              <SummaryPill label="Đồ rơi" value={`${lootSummary.rareCount}/${lootSummary.total}`} />
              <SummaryPill label="Vật phẩm" value={inventorySummary.totalQuantity} />
              <SummaryPill label="Lịch sử" value={bossHistory.length} />
            </View>
            <View style={styles.detailTabs}>
              {DETAIL_TABS.map((tab) => (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.detailTab,
                    detailTab === tab.id && styles.detailTabActive,
                  ]}
                  onPress={() => setDetailTab(tab.id)}
                >
                  <Text
                    style={[
                      styles.detailTabText,
                      detailTab === tab.id && styles.detailTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {detailTab === 'rules' ? (
              <View style={styles.detailBody}>
                {rules.groups.map((group) => (
                  <View key={group.title} style={styles.ruleBlock}>
                    <Text style={styles.blockTitle}>{group.title}</Text>
                    {group.lines.map((line) => (
                      <Text key={line} style={styles.bulletLine}>
                        - {line}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {detailTab === 'tasks' ? (
              <View style={styles.detailBody}>
                <Text style={styles.sectionNote}>
                  Tổng sát thương:{' '}
                  {formatPower(
                    tasks.reduce((sum, task) => sum + task.damage, 0)
                  )}
                  {' '}| Xong {taskSummary.completed}/{taskSummary.total}
                </Text>
                <Pressable
                  style={[
                    styles.aiTaskButton,
                    (!canInteractWithBoss || aiTaskLoading) &&
                      styles.taskActionDisabled,
                  ]}
                  disabled={!canInteractWithBoss || aiTaskLoading}
                  onPress={handleGenerateAiBossTasks}
                >
                  <Text style={styles.aiTaskButtonText}>
                    {aiTaskLoading ? 'AI đang sinh...' : 'AI sinh nhiệm vụ boss'}
                  </Text>
                </Pressable>
                {aiTaskMessage ? (
                  <Text style={styles.itemUseMessage}>{aiTaskMessage}</Text>
                ) : null}
                {bossState.taskGenerator?.generatedBy ? (
                  <Text style={styles.cardSubText}>
                    Nguồn sinh: {getGeneratorLabel(bossState.taskGenerator.generatedBy)}
                    {bossState.taskGenerator.reason
                      ? ` - ${bossState.taskGenerator.reason}`
                      : ''}
                  </Text>
                ) : null}
                {!canInteractWithBoss ? (
                  <Text style={styles.lockReason}>
                    Khóa tham chiến: {participationGate.reason}
                  </Text>
                ) : null}
                {tasks.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle}>{task.title}</Text>
                      <Text style={styles.taskDamage}>
                        {formatPower(task.damage)}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {task.category} - {task.difficulty} - {getTaskStatusLabel(task.status)}
                    </Text>
                    <Text style={styles.cardText}>{task.objective}</Text>
                    <Text style={styles.cardSubText}>Hạn chót: {task.deadline}</Text>
                    {task.deadlineAt ? (
                      <Text style={styles.cardSubText}>
                        Hết hạn lúc: {formatDateTime(task.deadlineAt)}
                      </Text>
                    ) : null}
                    <Text style={styles.cardSubText}>Bằng chứng cần nộp: {task.proof}</Text>
                    {task.proofPassScore ? (
                      <Text style={styles.cardSubText}>
                        AI chấm bằng chứng: cần {task.proofPassScore}/100
                        {task.challengeTier ? ` - ${getBossTierLabel(task.challengeTier)}` : ''}
                      </Text>
                    ) : null}
                    {task.failReason ? (
                      <Text style={styles.cardSubText}>
                        Lý do thất bại: {task.failReason}
                      </Text>
                    ) : null}
                    <View style={styles.taskActions}>
                      {task.status === 'Available' ? (
                        <Pressable
                          style={[
                            styles.taskActionBtn,
                            !canInteractWithBoss && styles.taskActionDisabled,
                          ]}
                          disabled={!canInteractWithBoss}
                          onPress={() => handleAcceptTask(task.id)}
                        >
                          <Text style={styles.taskActionText}>Nhận</Text>
                        </Pressable>
                      ) : null}
                      {task.status === 'Accepted' ? (
                        <View style={styles.proofBox}>
                          <TextInput
                            style={styles.proofInput}
                            value={proofDrafts[task.id] ?? ''}
                            onChangeText={(text) =>
                              setProofDrafts((prev) => ({
                                ...prev,
                                [task.id]: text,
                              }))
                            }
                            placeholder="Nhập bằng chứng: thời gian, số lượng, kết quả..."
                            placeholderTextColor="#6b6478"
                            multiline
                            editable={
                              canInteractWithBoss &&
                              proofLoadingTaskId !== task.id
                            }
                          />
                          {proofMessages[task.id] ? (
                            <Text style={styles.cardSubText}>
                              {proofMessages[task.id]}
                            </Text>
                          ) : null}
                          <Pressable
                            style={[
                              styles.taskActionBtn,
                              styles.taskCompleteBtn,
                              (!canInteractWithBoss ||
                                proofLoadingTaskId === task.id) &&
                                styles.taskActionDisabled,
                            ]}
                            disabled={
                              !canInteractWithBoss ||
                              proofLoadingTaskId === task.id
                            }
                            onPress={() => handleSubmitBossProof(task)}
                          >
                            <Text style={styles.taskActionText}>
                              {proofLoadingTaskId === task.id
                                ? 'AI đang chấm...'
                                : 'Gửi bằng chứng'}
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {task.status === 'Completed' ? (
                        <View style={styles.proofBox}>
                          <Text style={styles.taskDoneText}>Đã gây sát thương</Text>
                          {task.proofFeedback ? (
                            <Text style={styles.cardSubText}>
                              AI chấm: {task.proofScore}/
                              {task.proofPassScore ?? 100} - {task.proofFeedback}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      {task.status === 'Locked' ? (
                        <Text style={styles.taskLockedText}>Đang khóa</Text>
                      ) : null}
                      {task.status === 'Failed' ? (
                        <Text style={styles.taskFailedText}>Đã thất bại</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {detailTab === 'loot' ? (
              <View style={styles.detailBody}>
                <View style={styles.lootSummary}>
                  <Text style={styles.cardText}>
                    Lượt quay tối đa: {loot.maxRolls} - Bậc đồ rơi: {loot.lootTier}
                  </Text>
                  {loot.balanceVersion ? (
                    <Text style={styles.cardSubText}>
                      Cân bằng: {getBalanceLabel(loot.balanceVersion)} - mỗi lượt quay có thể không rơi đồ
                    </Text>
                  ) : null}
                  {loot.lootTheme ? (
                    <Text style={styles.cardSubText}>
                      Chủ đề: {loot.lootTheme}
                    </Text>
                  ) : null}
                  <Text style={styles.cardSubText}>
                    Điều kiện đồ chính: {loot.mainLootRequirement}
                  </Text>
                </View>
                {loot.entries.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <ItemIcon item={item} quantity={item.rarity[0]} />
                    <View style={styles.itemMain}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.dropRate}>{item.rate}</Text>
                      </View>
                      <Text style={styles.cardMeta}>
                        {getRarityLabel(item.rarity)} - {item.condition}
                      </Text>
                      {item.disciplineSafe ? (
                        <Text style={styles.cardSubText}>
                          Chặn phá kỷ luật: vật phẩm này cực hiếm, đã giới hạn tỉ lệ
                        </Text>
                      ) : null}
                      <Text style={styles.cardSubText}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {detailTab === 'inventory' ? (
              <View style={styles.detailBody}>
                <View style={styles.inventorySummary}>
                  <View style={styles.inventorySummaryTile}>
                    <Text style={styles.statLabel}>Nhóm đồ</Text>
                    <Text style={styles.statValue}>
                      {inventorySummary.totalStacks}
                    </Text>
                  </View>
                  <View style={styles.inventorySummaryTile}>
                    <Text style={styles.statLabel}>Tong so</Text>
                    <Text style={styles.statValue}>
                      {inventorySummary.totalQuantity}
                    </Text>
                  </View>
                  <View style={styles.inventorySummaryTile}>
                    <Text style={styles.statLabel}>Hiếm+</Text>
                    <Text style={styles.statValue}>
                      {inventorySummary.rareOrBetter}
                    </Text>
                  </View>
                  <View style={styles.inventorySummaryTile}>
                    <Text style={styles.statLabel}>Thần thoại</Text>
                    <Text style={styles.statValue}>
                      {inventorySummary.mythicCount}
                    </Text>
                  </View>
                </View>
                {itemUseMessage ? (
                  <Text style={styles.itemUseMessage}>{itemUseMessage}</Text>
                ) : null}
                {activeInventoryEffects.length > 0 ? (
                  <View style={styles.activeEffectsBox}>
                    <Text style={styles.blockTitle}>Hiệu ứng đang bật</Text>
                    {activeInventoryEffects.map((effect) => (
                      <Text key={effect.id} style={styles.bulletLine}>
                        - {effect.name} ({getUseTypeLabel(effect.useType)})
                      </Text>
                    ))}
                  </View>
                ) : null}
                {inventory.length === 0 ? (
                  <View style={styles.emptyInventory}>
                    <Text style={styles.emptyInventoryTitle}>Túi đồ đang trống</Text>
                    <Text style={styles.cardSubText}>
                      Hạ boss để nhận vật phẩm. Từ phần này trở đi không hiện đồ
                      mẫu nữa.
                    </Text>
                  </View>
                ) : (
                  inventory.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <ItemIcon item={item} quantity={item.quantity} />
                      <View style={styles.itemMain}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardTitle}>{item.name}</Text>
                          <Text style={styles.itemQty}>x{item.quantity}</Text>
                        </View>
                        <Text style={styles.cardMeta}>
                          {getRarityLabel(item.rarity)} - {item.scope} - {item.state}
                        </Text>
                        <Text style={styles.cardSubText}>{item.description}</Text>
                        <Text style={styles.cardSubText}>
                          Loại: {getUseTypeLabel(item.useType)} - Tổng đã nhặt:{' '}
                          {item.totalObtained}
                        </Text>
                        <View style={styles.inventoryActions}>
                          {[
                            'restore_hp',
                            'restore_mp',
                            'prevent_hp_loss',
                            'protect_streak',
                            'valid_rest_day',
                            'death_pardon',
                            'loot_boost',
                            'extend_boss_task',
                          ].includes(item.useType) ? (
                            <Pressable
                              style={styles.useItemBtn}
                              onPress={() => handleUseInventoryItem(item.id)}
                              disabled={!onBossFullStateChange}
                            >
                              <Text style={styles.useItemText}>Dùng</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            style={[styles.useItemBtn, styles.useItemDisabled]}
                            disabled
                          >
                            <Text style={styles.useItemText}>
                              {item.useType === 'crafting_material'
                                ? 'Nguyên liệu'
                                : 'Chưa dùng'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {detailTab === 'history' ? (
              <View style={styles.detailBody}>
                {bossHistory.length === 0 ? (
                  <View style={styles.emptyInventory}>
                    <Text style={styles.emptyInventoryTitle}>
                      Chưa có lịch sử boss
                    </Text>
                    <Text style={styles.cardSubText}>
                      Khi boss bị hạ gục hoặc hết giờ, trận đấu sẽ được lưu ở đây.
                    </Text>
                  </View>
                ) : (
                  bossHistory.map((result) => (
                    <View key={result.id} style={styles.historyCard}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle}>{result.bossName}</Text>
                        <StatusBadge
                          label={getResultOutcomeLabel(result.outcome)}
                          tone={
                            result.outcome === 'defeated' ? 'success' : 'danger'
                          }
                        />
                      </View>
                      <Text style={styles.cardMeta}>
                        {result.bossTypeLabel} - {result.bossDifficulty} - Cấp{' '}
                        {result.bossLevel} - {formatDateTime(result.createdAt)}
                      </Text>
                      <View style={styles.historyStatGrid}>
                        <View style={styles.historyStatTile}>
                          <Text style={styles.statLabel}>Lực chiến</Text>
                          <Text style={styles.statValue}>
                            {formatPower(result.bossPower)}
                          </Text>
                        </View>
                        <View style={styles.historyStatTile}>
                          <Text style={styles.statLabel}>Sát thương</Text>
                          <Text style={styles.statValue}>
                            {result.damagePercent}%
                          </Text>
                        </View>
                        <View style={styles.historyStatTile}>
                          <Text style={styles.statLabel}>Nhiệm vụ</Text>
                          <Text style={styles.statValue}>
                            {result.tasksCompleted}/{result.tasksCompleted + result.tasksFailed}
                          </Text>
                        </View>
                        <View style={styles.historyStatTile}>
                          <Text style={styles.statLabel}>Đồ rơi</Text>
                          <Text style={styles.statValue}>
                            {result.lootCount}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardSubText}>
                        Lượt quay: {result.rollsEarned} - Bậc boss: {getBossTierLabel(result.bossTier)} -
                        Bậc đồ rơi {result.lootTier}
                      </Text>
                      {result.reason ? (
                        <Text style={styles.cardSubText}>{result.reason}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {mainTab === 'current' ? (
          <>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Lực chiến hiện tại</Text>
          <Text style={styles.powerValue}>{formatPower(playerPower.total)}</Text>
          <Text style={styles.rankText}>{powerRank}</Text>
          <Text style={styles.muted}>
            Lực chiến tăng mãi, không giới hạn level, HP, MP, chỉ số, chuỗi hay
            tổng nhiệm vụ.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nguồn lực chiến</Text>
          {playerPower.sources.map((source) => (
            <View key={source.id} style={styles.sourceRow}>
              <View style={styles.sourceMain}>
                <Text style={styles.sourceLabel}>{source.label}</Text>
                <Text style={styles.sourceFormula}>
                  {formatPower(source.value)} x {source.multiplier}
                </Text>
              </View>
              <Text style={styles.sourcePoints}>{formatPower(source.points)}</Text>
            </View>
          ))}
        </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080816',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  hero: {
    borderWidth: 1,
    borderColor: '#32215f',
    backgroundColor: '#0e0b22',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  eyebrow: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: '#f5c842',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#c4bfd6',
    fontSize: 13,
    lineHeight: 20,
  },
  mainTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mainTab: {
    flexGrow: 1,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#0b0b16',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  mainTabActive: {
    borderColor: '#f5c842',
    backgroundColor: '#1d1720',
  },
  mainTabText: {
    color: '#9a94ad',
    fontSize: 11,
    fontWeight: '900',
  },
  mainTabTextActive: {
    color: '#f5c842',
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#0f0f1d',
    borderRadius: 8,
    paddingVertical: 10,
  },
  modeTabActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#171128',
  },
  modeTabText: {
    color: '#9a94ad',
    fontSize: 12,
    fontWeight: '900',
  },
  modeTabTextActive: {
    color: '#f5c842',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#1d1d36',
    backgroundColor: '#10101c',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  panelTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 68,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  neutralBadge: {
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  warningBadge: {
    borderColor: '#854d0e',
    backgroundColor: '#1c1307',
  },
  successBadge: {
    borderColor: '#166534',
    backgroundColor: '#07170d',
  },
  dangerBadge: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1c0a0d',
  },
  summaryPill: {
    minWidth: '30%',
    flexGrow: 1,
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#24243a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryPillLabel: {
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  summaryPillValue: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  status: {
    color: '#f5c842',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  portalBox: {
    height: 190,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5b21b6',
    backgroundColor: '#090618',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  portalOuter: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0a24',
  },
  portalInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: '#f5c842',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05040c',
  },
  portalMark: {
    color: '#a78bfa',
    fontSize: 54,
    fontWeight: '900',
  },
  portalCaption: {
    position: 'absolute',
    bottom: 12,
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  countdown: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    fontVariant: ['tabular-nums'],
  },
  lockGrid: {
    gap: 7,
  },
  lockRow: {
    color: '#9a94ad',
    backgroundColor: '#0b0b16',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f5c842',
    backgroundColor: 'rgba(245, 200, 66, 0.12)',
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 12,
  },
  primaryActionText: {
    color: '#f5c842',
    fontSize: 13,
    fontWeight: '900',
  },
  scheduleBox: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  scheduleLabel: {
    color: '#8f88a6',
    fontSize: 11,
    fontWeight: '900',
  },
  scheduleValue: {
    flex: 1,
    color: '#e8e4dc',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  bossArtMock: {
    height: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: '#14070b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bossImage: {
    width: '100%',
    height: '100%',
  },
  bossMiniArt: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090618',
  },
  bossMiniImage: {
    width: '100%',
    height: '100%',
  },
  bossMiniText: {
    fontSize: 16,
    fontWeight: '900',
  },
  bossSilhouette: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  bossArtText: {
    color: '#ef4444',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
  },
  assetKeyText: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 9,
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  bossName: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  bossTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  bossTitleMain: {
    flex: 1,
    minWidth: 0,
  },
  bossTierBadge: {
    borderWidth: 1,
    borderColor: '#f5c842',
    backgroundColor: 'rgba(245, 200, 66, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: 96,
  },
  bossTierText: {
    color: '#f5c842',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  bossMeta: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  expiredBanner: {
    color: '#fca5a5',
    backgroundColor: '#1c0a0d',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 12,
  },
  hpWrap: {
    marginBottom: 12,
  },
  hpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  hpLabel: {
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '900',
  },
  hpPercent: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '900',
  },
  hpTrack: {
    height: 13,
    backgroundColor: '#26080d',
    borderRadius: 7,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 7,
  },
  hpText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
    textAlign: 'right',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statTile: {
    width: '48%',
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 10,
  },
  statLabel: {
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  statValue: {
    color: '#f5c842',
    fontSize: 15,
    fontWeight: '900',
  },
  aiStatBox: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  aiStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiStatText: {
    color: '#c4b5fd',
    backgroundColor: '#171128',
    borderWidth: 1,
    borderColor: '#4b2f85',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '900',
  },
  participationBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  neutral: {
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  danger: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1c0a0d',
  },
  warning: {
    borderColor: '#854d0e',
    backgroundColor: '#1c1307',
  },
  success: {
    borderColor: '#166534',
    backgroundColor: '#07170d',
  },
  participationLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  participationText: {
    color: '#c4bfd6',
    fontSize: 12,
    lineHeight: 17,
  },
  participationReason: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 16,
    marginTop: 5,
  },
  skillBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    backgroundColor: '#0b0b16',
    padding: 10,
    marginBottom: 10,
  },
  skillName: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  skillText: {
    color: '#c4bfd6',
    fontSize: 12,
    lineHeight: 17,
  },
  resultOutcome: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  resultFailure: {
    color: '#ef4444',
  },
  detailTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  boardSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#0b0b16',
    borderRadius: 7,
    minHeight: 38,
    paddingHorizontal: 4,
  },
  detailTabActive: {
    borderColor: '#f5c842',
    backgroundColor: '#1d1720',
  },
  detailTabText: {
    color: '#9a94ad',
    fontSize: 10,
    fontWeight: '900',
  },
  detailTabTextActive: {
    color: '#f5c842',
  },
  detailBody: {
    gap: 10,
  },
  ruleBlock: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 11,
  },
  recordBox: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 11,
  },
  rankBox: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  rankName: {
    color: '#f5c842',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  rankUnlockedText: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rankScore: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  rankFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 999,
  },
  rankProgressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  codexList: {
    gap: 10,
  },
  codexCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 11,
  },
  codexMain: {
    flex: 1,
    minWidth: 0,
  },
  codexClearRate: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '900',
  },
  codexStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  codexStat: {
    color: '#c4bfd6',
    backgroundColor: '#111022',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  lootCollectionList: {
    gap: 10,
  },
  achievementGrid: {
    gap: 10,
  },
  achievementCard: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 11,
  },
  recentAchievementBox: {
    backgroundColor: '#171128',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 8,
    padding: 11,
  },
  achievementCardUnlocked: {
    borderColor: '#166534',
    backgroundColor: '#07170d',
  },
  achievementState: {
    color: '#8f88a6',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  achievementStateUnlocked: {
    color: '#22c55e',
  },
  achievementTrack: {
    height: 8,
    backgroundColor: '#19192c',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 9,
  },
  achievementFill: {
    height: '100%',
    backgroundColor: '#f5c842',
    borderRadius: 999,
  },
  blockTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  bulletLine: {
    color: '#c4bfd6',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  sectionNote: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
  },
  lockReason: {
    color: '#fca5a5',
    backgroundColor: '#1c0a0d',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  aiTaskButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7c3aed',
    backgroundColor: '#171128',
    borderRadius: 8,
    paddingVertical: 11,
  },
  aiTaskButtonText: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  taskCard: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 11,
  },
  historyCard: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#252542',
    borderRadius: 8,
    padding: 11,
  },
  historyStatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  historyStatTile: {
    width: '48%',
    backgroundColor: '#111022',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 9,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  taskDamage: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  cardMeta: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    marginBottom: 7,
  },
  cardText: {
    color: '#e8e4dc',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  cardSubText: {
    color: '#9a94ad',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  proofBox: {
    flex: 1,
    gap: 8,
  },
  proofInput: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: '#32215f',
    backgroundColor: '#080816',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
    textAlignVertical: 'top',
  },
  taskActionBtn: {
    backgroundColor: '#171128',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskCompleteBtn: {
    borderColor: '#166534',
    backgroundColor: '#07170d',
  },
  taskActionDisabled: {
    opacity: 0.35,
  },
  taskActionText: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  taskDoneText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '900',
  },
  taskLockedText: {
    color: '#9a94ad',
    fontSize: 12,
    fontWeight: '800',
  },
  taskFailedText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '900',
  },
  lootSummary: {
    backgroundColor: '#111022',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 10,
  },
  inventorySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inventorySummaryTile: {
    width: '48%',
    backgroundColor: '#111022',
    borderWidth: 1,
    borderColor: '#32215f',
    borderRadius: 8,
    padding: 10,
  },
  emptyInventory: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 12,
  },
  emptyInventoryTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  itemUseMessage: {
    color: '#f5c842',
    backgroundColor: '#171128',
    borderWidth: 1,
    borderColor: '#4b2f85',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '900',
  },
  activeEffectsBox: {
    backgroundColor: '#07170d',
    borderWidth: 1,
    borderColor: '#166534',
    borderRadius: 8,
    padding: 10,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 10,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b2f85',
    backgroundColor: '#171128',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemIconText: {
    color: '#f5c842',
    fontSize: 15,
    fontWeight: '900',
  },
  itemImage: {
    width: 34,
    height: 34,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  dropRate: {
    color: '#f5c842',
    fontSize: 13,
    fontWeight: '900',
  },
  itemQty: {
    color: '#f5c842',
    fontSize: 13,
    fontWeight: '900',
  },
  inventoryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 9,
  },
  useItemBtn: {
    borderWidth: 1,
    borderColor: '#4b2f85',
    backgroundColor: '#171128',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  useItemDisabled: {
    opacity: 0.45,
  },
  useItemText: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '900',
  },
  powerValue: {
    color: '#f5c842',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  rankText: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 9,
    gap: 12,
  },
  sourceMain: {
    flex: 1,
    minWidth: 0,
  },
  sourceLabel: {
    color: '#e8e4dc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  sourceFormula: {
    color: '#8f88a6',
    fontSize: 11,
    fontWeight: '600',
  },
  sourcePoints: {
    color: '#f5c842',
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: '#9a94ad',
    fontSize: 12,
    lineHeight: 18,
  },
});
