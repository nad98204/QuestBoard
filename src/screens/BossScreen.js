import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  acceptBossTask,
  calculatePlayerPower,
  canPlayerJoinBoss,
  completeBossTask,
  completeBossTaskAndRollRewards,
  createEmptyBossState,
  createMockBossEvent,
  createMockBossRules,
  createMockBossTasks,
  createMockLootTable,
  createMockRevealedBoss,
  createScheduledBossState,
  createTestCountdownBossState,
  createTestRevealedBossState,
  expireCurrentBoss,
  finishCurrentBossAndScheduleNext,
  formatPower,
  getBossParticipationState,
  getInventorySummary,
  getPowerRank,
  inventoryToDisplayRows,
  normalizeBossForDisplay,
  normalizeBossRulesForDisplay,
  normalizeBossTasksForDisplay,
  normalizeLootTableForDisplay,
  useInventoryItem,
} from '../utils/boss';
import { getBossVisual, getItemVisual } from '../utils/bossAssets';

const DETAIL_TABS = [
  { id: 'rules', label: 'Noi quy' },
  { id: 'tasks', label: 'Nhiem vu' },
  { id: 'loot', label: 'Loot' },
  { id: 'inventory', label: 'Tui do' },
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
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <View style={styles.hpWrap}>
      <View style={styles.hpHeader}>
        <Text style={styles.hpLabel}>BOSS HP</Text>
        <Text style={styles.hpPercent}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.hpTrack}>
        <View style={[styles.hpFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.hpText}>
        {formatPower(current)} / {formatPower(max)} HP
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
    return 'Chua co';
  }
  return new Date(timestamp).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BossScreen({
  state,
  onBossStateChange,
  onBossFullStateChange,
}) {
  const [mockMode, setMockMode] = useState('countdown');
  const [detailTab, setDetailTab] = useState('rules');
  const [showDevTools, setShowDevTools] = useState(false);
  const [itemUseMessage, setItemUseMessage] = useState('');
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

    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createTestRevealedBossState(
        playerPower.total,
        bossState.currentEvent?.eventType
      ),
    }));
    setMockMode('reveal');
    setDetailTab('tasks');
  }, [
    bossState.currentEvent?.id,
    bossState.currentEvent?.revealAt,
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

  function handleCompleteTask(taskId) {
    if (onBossFullStateChange) {
      onBossFullStateChange((prevState) => {
        const next = completeBossTaskAndRollRewards(
          prevState?.boss,
          prevState?.inventory,
          taskId,
          playerPower.total
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
      completeBossTask(prevBossState, taskId, playerPower.total)
    );
  }

  function handleCreateCountdown() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createTestCountdownBossState(),
    }));
    setMockMode('countdown');
  }

  function handleCreateShortCountdown() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createTestCountdownBossState(Date.now(), 10000),
    }));
    setMockMode('countdown');
  }

  function handleRevealTestBoss() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createTestRevealedBossState(
        playerPower.total,
        bossState.currentEvent?.eventType
      ),
    }));
    setMockMode('reveal');
    setDetailTab('tasks');
  }

  function handleResetBoss() {
    if (!onBossFullStateChange) return;
    onBossFullStateChange((prevState) => ({
      ...prevState,
      boss: createEmptyBossState(),
    }));
    setMockMode('countdown');
    setDetailTab('rules');
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
              <Text style={styles.eyebrow}>CONG BOSS</Text>
              <Text style={styles.title}>Boss System V1</Text>
            </View>
            <StatusBadge
              label={
                hasStateBoss
                  ? displayedBoss.status
                  : hasStateEvent
                    ? 'countdown'
                    : 'preview'
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
              ? 'Dang doc du lieu boss tu state.'
              : 'Dang dung preview mock vi state chua co boss/event.'}
          </Text>
          <View style={styles.heroSummary}>
            <SummaryPill label="Power" value={formatPower(playerPower.total)} />
            <SummaryPill label="Rank" value={powerRank} />
            <SummaryPill
              label="Inventory"
              value={`${inventorySummary.totalQuantity} items`}
            />
          </View>
        </View>

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
              Countdown
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
              Reveal
            </Text>
          </Pressable>
        </View>

        <View style={styles.devPanel}>
          <Pressable
            style={styles.devHeader}
            onPress={() => setShowDevTools((prev) => !prev)}
          >
            <Text style={styles.devTitle}>Dev Tools</Text>
            <Text style={styles.devToggle}>{showDevTools ? 'Hide' : 'Show'}</Text>
          </Pressable>
          {showDevTools ? (
            <>
              <Text style={styles.muted}>
                Cong cu test tam thoi, khong phai tinh nang game chinh.
              </Text>
              <View style={styles.testActions}>
                <Pressable style={styles.testBtn} onPress={handleCreateCountdown}>
                  <Text style={styles.testBtnText}>Tao countdown</Text>
                </Pressable>
                <Pressable style={styles.testBtn} onPress={handleCreateShortCountdown}>
                  <Text style={styles.testBtnText}>10s countdown</Text>
                </Pressable>
                <Pressable style={styles.testBtn} onPress={handleRevealTestBoss}>
                  <Text style={styles.testBtnText}>Reveal boss test</Text>
                </Pressable>
                <Pressable
                  style={[styles.testBtn, styles.testDanger]}
                  onPress={handleResetBoss}
                >
                  <Text style={styles.testBtnText}>Reset boss</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Lich cong boss</Text>
            <StatusBadge
              label={hasStateEvent ? 'armed' : hasStateBoss ? 'locked' : 'empty'}
              tone={hasStateEvent ? 'warning' : hasStateBoss ? 'neutral' : 'danger'}
            />
          </View>
          {hasStateEvent ? (
            <View style={styles.scheduleBox}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Su kien</Text>
                <Text style={styles.scheduleValue}>{event?.title}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Loai</Text>
                <Text style={styles.scheduleValue}>{event?.eventType}</Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Reveal</Text>
                <Text style={styles.scheduleValue}>
                  {formatDateTime(event?.revealAt)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Con lai</Text>
                <Text style={styles.scheduleValue}>
                  {formatCountdown((event?.revealAt ?? event?.startsAt) - now)}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Nguon</Text>
                <Text style={styles.scheduleValue}>
                  {event?.source ?? 'manual_test'}
                </Text>
              </View>
            </View>
          ) : hasStateBoss ? (
            <>
              <Text style={styles.muted}>
                Boss dang active, lich tiep theo se duoc tao sau khi reset/ket thuc.
              </Text>
              {canScheduleNextBoss ? (
                <Pressable
                  style={styles.primaryAction}
                  onPress={handleScheduleNextBoss}
                >
                  <Text style={styles.primaryActionText}>
                    Tao lich boss tiep theo
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.muted}>
                Chua co lich boss trong state. Khoi tao lich local de bat dau
                countdown that.
              </Text>
              <Pressable
                style={styles.primaryAction}
                onPress={handleInitializeSchedule}
              >
                <Text style={styles.primaryActionText}>Khoi tao lich boss</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.panel}>
          {mockMode === 'countdown' ? (
            <>
              <View style={styles.panelTitleRow}>
                <Text style={styles.panelTitle}>Cong boss dang mo</Text>
                <StatusBadge label="hidden" tone="warning" />
              </View>
              <View style={styles.portalBox}>
                <View style={styles.portalOuter}>
                  <View style={styles.portalInner}>
                    <Text style={styles.portalMark}>?</Text>
                  </View>
                </View>
                <Text style={styles.portalCaption}>BOSS DATA SEALED</Text>
              </View>
              <Text style={styles.status}>
                {event?.title ?? 'Boss sap xuat hien'}
              </Text>
              <Text style={styles.countdown}>
                {formatCountdown((event?.revealAt ?? event?.startsAt) - now)}
              </Text>
              <View style={styles.lockGrid}>
                <Text style={styles.lockRow}>Locked: Thong tin boss ???</Text>
                <Text style={styles.lockRow}>Locked: Noi quy se mo khi reveal</Text>
                <Text style={styles.lockRow}>Locked: Nhiem vu boss bi khoa</Text>
                <Text style={styles.lockRow}>Locked: Bang vat pham ???</Text>
              </View>
              {!hasStateEvent && !hasStateBoss ? (
                <Pressable
                  style={styles.primaryAction}
                  onPress={handleInitializeSchedule}
                >
                  <Text style={styles.primaryActionText}>Khoi tao lich boss</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.panelTitleRow}>
                <Text style={styles.panelTitle}>Boss da xuat hien</Text>
                <StatusBadge
                  label={displayedBoss.status}
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
                </View>
                <View style={styles.bossTierBadge}>
                  <Text style={styles.bossTierText}>{displayedBoss.generatedTier}</Text>
                </View>
              </View>
              {displayedBoss.status === 'expired' ? (
                <Text style={styles.expiredBanner}>
                  Boss da het gio - khong roll loot.
                </Text>
              ) : null}
              <HpBar current={displayedBoss.currentHp} max={displayedBoss.maxHp} />
              <View style={styles.statGrid}>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Luc chien cua ban</Text>
                  <Text style={styles.statValue}>{formatPower(playerPower.total)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Yeu cau tham gia</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.requiredPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>De xuat solo</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.recommendedPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Boss power</Text>
                  <Text style={styles.statValue}>{formatPower(displayedBoss.bossPower)}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Boss level</Text>
                  <Text style={styles.statValue}>Lv {displayedBoss.level}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>AI tier</Text>
                  <Text style={styles.statValue}>{displayedBoss.generatedTier}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Do kho</Text>
                  <Text style={styles.statValue}>{displayedBoss.difficulty}</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statLabel}>Loot tier</Text>
                  <Text style={styles.statValue}>T{displayedBoss.lootTier}</Text>
                </View>
              </View>
              <View style={styles.aiStatBox}>
                <Text style={styles.blockTitle}>Chi so boss AI</Text>
                <View style={styles.aiStatGrid}>
                  <Text style={styles.aiStatText}>
                    ATK {formatPower(displayedBoss.statLine.attack)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    DEF {formatPower(displayedBoss.statLine.defense)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    SPD {formatPower(displayedBoss.statLine.speed)}
                  </Text>
                  <Text style={styles.aiStatText}>
                    FOC {formatPower(displayedBoss.statLine.focus)}
                  </Text>
                </View>
                <Text style={styles.cardSubText}>
                  Generator: {displayedBoss.generatedBy}
                </Text>
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
                Thoi gian con lai:{' '}
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
                    Ket thuc boss va tao lich tiep theo
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        {latestResult ? (
          <View style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Ket qua tran boss</Text>
              <StatusBadge
                label={latestResult.outcome}
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
                ? 'Chien thang'
                : latestResult.outcome === 'expired'
                  ? 'Het gio - that bai'
                : latestResult.outcome}
            </Text>
            <View style={styles.resultGrid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Damage</Text>
                <Text style={styles.statValue}>
                  {formatPower(latestResult.damageDealt)}
                </Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Damage %</Text>
                <Text style={styles.statValue}>{latestResult.damagePercent}%</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Tasks done</Text>
                <Text style={styles.statValue}>{latestResult.tasksCompleted}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Rolls</Text>
                <Text style={styles.statValue}>{latestResult.rollsEarned}</Text>
              </View>
            </View>
            {latestResult.reason ? (
              <Text style={styles.cardSubText}>{latestResult.reason}</Text>
            ) : null}
            <Text style={styles.blockTitle}>Loot nhan duoc</Text>
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
                    <Text style={styles.cardMeta}>{item.rarity ?? 'Unknown'}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.cardSubText}>Khong co vat pham nao roi.</Text>
            )}
            {canScheduleNextBoss ? (
              <Pressable
                style={styles.primaryAction}
                onPress={handleScheduleNextBoss}
              >
                <Text style={styles.primaryActionText}>
                  Tao countdown boss tiep theo
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {mockMode === 'reveal' ? (
          <View style={styles.panel}>
            <View style={styles.panelTitleRow}>
              <Text style={styles.panelTitle}>Bang boss</Text>
              <StatusBadge label={detailTab} tone="neutral" />
            </View>
            <View style={styles.boardSummary}>
              <SummaryPill
                label="Tasks"
                value={`${taskSummary.completed}/${taskSummary.total}`}
              />
              <SummaryPill label="Accepted" value={taskSummary.accepted} />
              <SummaryPill label="Loot" value={`${lootSummary.rareCount}/${lootSummary.total}`} />
              <SummaryPill label="Items" value={inventorySummary.totalQuantity} />
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
                  Tong damage:{' '}
                  {formatPower(
                    tasks.reduce((sum, task) => sum + task.damage, 0)
                  )}
                  {' '}| Done {taskSummary.completed}/{taskSummary.total}
                </Text>
                {!canInteractWithBoss ? (
                  <Text style={styles.lockReason}>
                    Khoa tham chien: {participationGate.reason}
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
                      {task.category} - {task.difficulty} - {task.status}
                    </Text>
                    <Text style={styles.cardText}>{task.objective}</Text>
                    <Text style={styles.cardSubText}>Deadline: {task.deadline}</Text>
                    <Text style={styles.cardSubText}>Proof: {task.proof}</Text>
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
                          <Text style={styles.taskActionText}>Nhan</Text>
                        </Pressable>
                      ) : null}
                      {task.status === 'Accepted' ? (
                        <Pressable
                          style={[
                            styles.taskActionBtn,
                            styles.taskCompleteBtn,
                            !canInteractWithBoss && styles.taskActionDisabled,
                          ]}
                          disabled={!canInteractWithBoss}
                          onPress={() => handleCompleteTask(task.id)}
                        >
                          <Text style={styles.taskActionText}>Hoan thanh</Text>
                        </Pressable>
                      ) : null}
                      {task.status === 'Completed' ? (
                        <Text style={styles.taskDoneText}>Da gay damage</Text>
                      ) : null}
                      {task.status === 'Locked' ? (
                        <Text style={styles.taskLockedText}>Dang khoa</Text>
                      ) : null}
                      {task.status === 'Failed' ? (
                        <Text style={styles.taskFailedText}>Da that bai</Text>
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
                    Max rolls: {loot.maxRolls} - Loot tier: {loot.lootTier}
                  </Text>
                  <Text style={styles.cardSubText}>
                    Loot chinh: {loot.mainLootRequirement}
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
                        {item.rarity} - {item.condition}
                      </Text>
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
                    <Text style={styles.statLabel}>Stacks</Text>
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
                    <Text style={styles.statLabel}>Rare+</Text>
                    <Text style={styles.statValue}>
                      {inventorySummary.rareOrBetter}
                    </Text>
                  </View>
                  <View style={styles.inventorySummaryTile}>
                    <Text style={styles.statLabel}>Mythic</Text>
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
                    <Text style={styles.blockTitle}>Hieu ung dang active</Text>
                    {activeInventoryEffects.map((effect) => (
                      <Text key={effect.id} style={styles.bulletLine}>
                        - {effect.name} ({effect.useType})
                      </Text>
                    ))}
                  </View>
                ) : null}
                {inventory.length === 0 ? (
                  <View style={styles.emptyInventory}>
                    <Text style={styles.emptyInventoryTitle}>Tui do dang trong</Text>
                    <Text style={styles.cardSubText}>
                      Ha boss de nhan vat pham. Tu phan nay tro di khong hien do
                      mock nua.
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
                          {item.rarity} - {item.scope} - {item.state}
                        </Text>
                        <Text style={styles.cardSubText}>{item.description}</Text>
                        <Text style={styles.cardSubText}>
                          Type: {item.useType} - Total found:{' '}
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
                              <Text style={styles.useItemText}>Dung</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            style={[styles.useItemBtn, styles.useItemDisabled]}
                            disabled
                          >
                            <Text style={styles.useItemText}>
                              {item.useType === 'crafting_material'
                                ? 'Nguyen lieu'
                                : 'V1'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Luc chien hien tai</Text>
          <Text style={styles.powerValue}>{formatPower(playerPower.total)}</Text>
          <Text style={styles.rankText}>{powerRank}</Text>
          <Text style={styles.muted}>
            Luc chien tang mai, khong gioi han level, HP, MP, stat, streak hay
            tong quest.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Nguon luc chien</Text>
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
  devPanel: {
    borderWidth: 1,
    borderColor: '#24243a',
    backgroundColor: '#0a0a14',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devTitle: {
    color: '#8f88a6',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  devToggle: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  testActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  testBtn: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4b2f85',
    backgroundColor: '#171128',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: '30%',
  },
  testDanger: {
    borderColor: '#7f1d1d',
    backgroundColor: '#1c0a0d',
  },
  testBtnText: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '900',
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
  taskCard: {
    backgroundColor: '#0b0b16',
    borderWidth: 1,
    borderColor: '#22223a',
    borderRadius: 8,
    padding: 11,
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
