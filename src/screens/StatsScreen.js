import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STATS } from '../utils/constants';
import {
  addDaysToKey,
  expToNextStatLevel,
  getTodayKey,
  normalizeStats,
  STAT_MAX_LEVEL,
} from '../utils/rpg';
import { ACHIEVEMENT_DEFS } from '../utils/achievements';

function lastSevenDateKeys() {
  const t = getTodayKey();
  const keys = [];
  for (let i = 6; i >= 0; i -= 1) {
    keys.push(addDaysToKey(t, -i));
  }
  return keys;
}

function formatMiniDate(isoDate) {
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function aggregateLastNDaysAll(history) {
  const keysSet = new Set(lastSevenDateKeys());
  const sums = {
    work: { done: 0, total: 0 },
    exercise: { done: 0, total: 0 },
    habitGood: { done: 0, total: 0 },
    habitBad: { done: 0, total: 0 },
    overcome: { done: 0, total: 0 },
  };

  for (const row of history) {
    if (!keysSet.has(row.date)) continue;
    sums.work.done += Number(row.workDone) || 0;
    sums.work.total += Number(row.workTotal) || 0;
    sums.exercise.done += Number(row.exerciseDone) || 0;
    sums.exercise.total += Number(row.exerciseTotal) || 0;
    sums.habitGood.done += Number(row.habitGoodDone) || 0;
    sums.habitGood.total += Number(row.habitGoodTotal) || 0;
    sums.habitBad.done += Number(row.habitBadOk) || 0;
    sums.habitBad.total += Number(row.habitBadTotal) || 0;
    sums.overcome.done += Number(row.overcomeDone) || 0;
    sums.overcome.total += Number(row.overcomeTotal) || 0;
  }

  return sums;
}

function completionPct(done, total) {
  if (!total || total <= 0) return null;
  return Math.round((done / total) * 1000) / 10;
}

function formatUnlockDate(ms) {
  try {
    return new Date(ms).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function StatsScreen({ state, onClose }) {
  const profile = state?.profile ?? {};
  const history = Array.isArray(state?.history) ? state.history : [];
  const streak = profile.streak ?? 0;
  const recordStreak = Math.max(profile.recordStreak ?? 0, streak);
  const totalXp = profile.totalXpEarned ?? 0;
  const totalQuests = profile.lifetimeQuestsCompleted ?? 0;
  const characterStats = normalizeStats(profile.stats);

  const keys7 = lastSevenDateKeys();
  const byDate = Object.fromEntries(
    keys7.map((k) => [
      k,
      history.find((h) => h.date === k) ?? {
        date: k,
        xpEarned: 0,
      },
    ])
  );
  const xpValues = keys7.map((k) => Math.max(0, Number(byDate[k]?.xpEarned) || 0));
  const maxXp = Math.max(...xpValues, 1);

  const sums = aggregateLastNDaysAll(history);

  const unlockedById = Object.fromEntries(
    (Array.isArray(state?.achievements) ? state.achievements : []).map(
      (a) => [a.id, a.unlockedAt]
    )
  );

  const rates = [
    {
      label: 'Công việc',
      pct: completionPct(sums.work.done, sums.work.total),
    },
    {
      label: 'Thể dục',
      pct: completionPct(sums.exercise.done, sums.exercise.total),
    },
    {
      label: 'Thói quen tốt',
      pct: completionPct(sums.habitGood.done, sums.habitGood.total),
    },
    {
      label: 'Tránh thói xấu',
      pct: completionPct(sums.habitBad.done, sums.habitBad.total),
      hint: 'Không MXH · junk · trì hoãn — tính theo đã “tránh…”',
    },
    {
      label: 'Vượt bản thân',
      pct: completionPct(sums.overcome.done, sums.overcome.total),
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>📊 Thống kê</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeTap}>
          <Text style={styles.closeText}>Đóng</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>XP 7 ngày</Text>
          <View style={styles.chartWrap}>
            {keys7.map((k, idx) => {
              const xp = xpValues[idx];
              const pixelH =
                xp === 0 ? 4 : Math.max(14, Math.round((xp / maxXp) * 104));
              return (
                <View key={k} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: pixelH },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{formatMiniDate(k)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chỉ số nhân vật</Text>
          <View style={styles.statSheet}>
            {Object.keys(STATS).map((key) => {
              const def = STATS[key];
              const stat = characterStats[key];
              const cap = expToNextStatLevel(stat.level);
              const pct =
                stat.level >= STAT_MAX_LEVEL
                  ? 100
                  : Math.min(100, (stat.xpInLevel / cap) * 100);
              return (
                <View key={key} style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <View style={styles.statNameWrap}>
                      <Text style={styles.statIcon}>{def.icon}</Text>
                      <View style={styles.statNameTextWrap}>
                        <Text style={styles.statName}>{def.label}</Text>
                        <Text style={styles.statKey}>{def.name}</Text>
                      </View>
                    </View>
                    <Text style={styles.statLevel}>Lv.{stat.level}</Text>
                  </View>
                  <View style={styles.statExpTrack}>
                    <View style={[styles.statExpFill, { width: `${pct}%` }]} />
                  </View>
                  <View style={styles.statMetaRow}>
                    <Text style={styles.statEffect}>{def.effect}</Text>
                    <Text style={styles.statExpText}>
                      {stat.level >= STAT_MAX_LEVEL
                        ? 'MAX'
                        : `${stat.xpInLevel}/${cap} EXP`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.streakGrid}>
            <View style={styles.streakTile}>
              <Text style={styles.streakMuted}>Chuỗi hiện tại</Text>
              <Text style={styles.streakValue}>🔥 {streak}</Text>
            </View>
            <View style={styles.streakTile}>
              <Text style={styles.streakMuted}>Kỷ lục streak</Text>
              <Text style={styles.streakValue}>⭐ {recordStreak}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.metricLabel}>Tổng XP tích lũy</Text>
          <Text style={styles.metricValue}>{totalXp} XP</Text>
          <View style={{ height: 14 }} />
          <Text style={styles.metricLabel}>Tổng quest hoàn thành</Text>
          <Text style={styles.metricValue}>{totalQuests} quest</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tỉ lệ hoàn thành (7 ngày)</Text>
          {rates.map((r) => (
            <View key={r.label} style={styles.rateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateLabel}>{r.label}</Text>
                {r.hint ? (
                  <Text style={styles.rateHint}>{r.hint}</Text>
                ) : null}
              </View>
              <Text style={styles.ratePct}>
                {typeof r.pct === 'number'
                  ? `${r.pct.toFixed(r.pct % 1 === 0 ? 0 : 1)}%`
                  : '—'}
              </Text>
            </View>
          ))}
          <Text style={styles.rateFoot}>
            Chỉ tính các ngày có snapshot trong history (≤30 ngày).
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thành tích</Text>
          <View style={styles.achList}>
            {ACHIEVEMENT_DEFS.map((def) => {
              const unlockedAt = unlockedById[def.id];
              const locked = unlockedAt == null;
              return (
                <View
                  key={def.id}
                  style={[styles.achRow, locked && styles.achRowLocked]}
                >
                  <Text style={styles.achIcon}>{def.icon}</Text>
                  <View style={styles.achTexts}>
                    <Text
                      style={[styles.achTitle, locked && styles.achTitleLocked]}
                    >
                      {def.title}
                    </Text>
                    <Text
                      style={[styles.achDesc, locked && styles.achDescLocked]}
                    >
                      {def.desc}
                    </Text>
                    {!locked ? (
                      <Text style={styles.achDate}>
                        Mở khóa · {formatUnlockDate(unlockedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c10' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a38',
  },
  headerTitle: {
    color: '#f3eee6',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeTap: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: '#d4af37', fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#14141c',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  cardTitle: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 12,
  },
  statSheet: {
    gap: 10,
  },
  statRow: {
    backgroundColor: '#101018',
    borderWidth: 1,
    borderColor: '#2f2b1d',
    borderRadius: 8,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statIcon: {
    fontSize: 24,
    marginRight: 10,
    width: 30,
    textAlign: 'center',
  },
  statNameTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statName: {
    color: '#f3eee6',
    fontSize: 15,
    fontWeight: '800',
  },
  statKey: {
    color: '#746f65',
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statLevel: {
    color: '#d4af37',
    fontSize: 25,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statExpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#272211',
  },
  statExpFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#d4af37',
  },
  statMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 7,
  },
  statEffect: {
    flex: 1,
    minWidth: 0,
    color: '#9a958c',
    fontSize: 11,
    lineHeight: 16,
  },
  statExpText: {
    color: '#d4af37',
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 132,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barTrack: {
    width: '70%',
    maxWidth: 28,
    height: 108,
    justifyContent: 'flex-end',
    backgroundColor: '#1a1810',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#d4af37',
    borderRadius: 6,
    minHeight: 3,
  },
  barLabel: {
    color: '#5c5766',
    fontSize: 9,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  streakGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  streakTile: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  streakMuted: { color: '#7d786f', fontSize: 11 },
  streakValue: {
    color: '#d4af37',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
  metricLabel: { color: '#9a958c', fontSize: 12 },
  metricValue: {
    color: '#f3eee6',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
    paddingBottom: 10,
  },
  rateLabel: { color: '#e8e4dc', fontWeight: '600', fontSize: 14 },
  rateHint: { color: '#5c5766', fontSize: 10, marginTop: 2 },
  ratePct: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 12,
    minWidth: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  rateFoot: {
    color: '#5c5766',
    fontSize: 10,
    marginTop: 4,
  },
  achList: {
    gap: 0,
  },
  achRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  achRowLocked: {
    opacity: 0.42,
  },
  achIcon: {
    fontSize: 22,
    marginRight: 12,
    lineHeight: 26,
  },
  achTexts: { flex: 1, minWidth: 0 },
  achTitle: {
    color: '#d4af37',
    fontWeight: '800',
    fontSize: 15,
  },
  achTitleLocked: {
    color: '#6e6b66',
    fontWeight: '700',
  },
  achDesc: {
    color: '#9a958c',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  achDescLocked: {
    color: '#5c5766',
  },
  achDate: {
    color: '#d4af37',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    opacity: 0.95,
    fontVariant: ['tabular-nums'],
  },
});
