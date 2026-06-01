import { useMemo, useState } from 'react';
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

function parseDateKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateLong(key) {
  const date = parseDateKey(key);
  if (!date) return key;
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return monthKey;
  return `Tháng ${month}/${year}`;
}

function addMonthsToKey(monthKey, delta) {
  const [year, month] = String(monthKey).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function buildMonthCells(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return [];
  const firstDay = new Date(year, month - 1, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const totalDays = daysInMonth(year, month);
  const cells = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function rowTotals(row) {
  if (!row) {
    return {
      done: 0,
      total: 0,
      xp: 0,
      questsDone: 0,
    };
  }
  const total =
    (Number(row.workTotal) || 0) +
    (Number(row.exerciseTotal) || 0) +
    (Number(row.habitGoodTotal) || 0) +
    (Number(row.habitBadTotal) || 0) +
    (Number(row.overcomeTotal) || 0);
  return {
    done: Number(row.questsDone) || 0,
    total,
    xp: Number(row.xpEarned) || 0,
    questsDone: Number(row.questsDone) || 0,
  };
}

function rowCompletionPct(row) {
  const totals = rowTotals(row);
  return completionPct(totals.done, totals.total);
}

function aggregateRows(rows) {
  return rows.reduce(
    (acc, row) => {
      const totals = rowTotals(row);
      acc.days += 1;
      acc.xp += totals.xp;
      acc.done += totals.done;
      acc.total += totals.total;
      acc.workDone += Number(row.workDone) || 0;
      acc.workTotal += Number(row.workTotal) || 0;
      acc.exerciseDone += Number(row.exerciseDone) || 0;
      acc.exerciseTotal += Number(row.exerciseTotal) || 0;
      acc.goodDone += Number(row.habitGoodDone) || 0;
      acc.goodTotal += Number(row.habitGoodTotal) || 0;
      acc.badDone += Number(row.habitBadOk) || 0;
      acc.badTotal += Number(row.habitBadTotal) || 0;
      acc.overcomeDone += Number(row.overcomeDone) || 0;
      acc.overcomeTotal += Number(row.overcomeTotal) || 0;
      return acc;
    },
    {
      days: 0,
      xp: 0,
      done: 0,
      total: 0,
      workDone: 0,
      workTotal: 0,
      exerciseDone: 0,
      exerciseTotal: 0,
      goodDone: 0,
      goodTotal: 0,
      badDone: 0,
      badTotal: 0,
      overcomeDone: 0,
      overcomeTotal: 0,
    }
  );
}

function formatPct(pct) {
  return typeof pct === 'number'
    ? `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`
    : '—';
}

function intensityStyle(pct) {
  if (typeof pct !== 'number') return styles.dayNoData;
  if (pct >= 100) return styles.dayPerfect;
  if (pct >= 70) return styles.dayStrong;
  if (pct >= 35) return styles.dayPartial;
  return styles.dayWeak;
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
  const todayKey = getTodayKey();
  const [calendarMode, setCalendarMode] = useState('month');
  const [visibleMonth, setVisibleMonth] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedYear, setSelectedYear] = useState(Number(todayKey.slice(0, 4)));
  const streak = profile.streak ?? 0;
  const recordStreak = Math.max(profile.recordStreak ?? 0, streak);
  const totalXp = profile.totalXpEarned ?? 0;
  const totalQuests = profile.lifetimeQuestsCompleted ?? 0;
  const characterStats = normalizeStats(profile.stats);
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [history]
  );
  const historyByDate = useMemo(
    () => new Map(history.map((row) => [row.date, row])),
    [history]
  );
  const selectedRow = historyByDate.get(selectedDate);
  const selectedTotals = rowTotals(selectedRow);
  const selectedPct = rowCompletionPct(selectedRow);
  const monthRows = history.filter((row) => String(row.date).startsWith(visibleMonth));
  const monthSummary = aggregateRows(monthRows);
  const yearRows = history.filter((row) =>
    String(row.date).startsWith(`${selectedYear}-`)
  );
  const yearSummary = aggregateRows(yearRows);
  const monthCells = buildMonthCells(visibleMonth);

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
          <View style={styles.calendarHeader}>
            <Text style={styles.cardTitle}>Lịch nhiệm vụ</Text>
            <View style={styles.modeTabs}>
              {[
                ['day', 'Ngày'],
                ['month', 'Tháng'],
                ['year', 'Năm'],
              ].map(([id, label]) => (
                <Pressable
                  key={id}
                  onPress={() => setCalendarMode(id)}
                  style={[
                    styles.modeTab,
                    calendarMode === id && styles.modeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      calendarMode === id && styles.modeTabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {calendarMode === 'month' ? (
            <View>
              <View style={styles.calendarNav}>
                <Pressable
                  onPress={() => setVisibleMonth((m) => addMonthsToKey(m, -1))}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>{'<'}</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>{monthLabel(visibleMonth)}</Text>
                <Pressable
                  onPress={() => setVisibleMonth((m) => addMonthsToKey(m, 1))}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>{'>'}</Text>
                </Pressable>
              </View>
              <View style={styles.weekHeader}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <Text key={d} style={styles.weekDay}>{d}</Text>
                ))}
              </View>
              <View style={styles.monthGrid}>
                {monthCells.map((dateKey, index) => {
                  const row = dateKey ? historyByDate.get(dateKey) : null;
                  const pct = rowCompletionPct(row);
                  const isSelected = dateKey === selectedDate;
                  const isToday = dateKey === todayKey;
                  return (
                    <Pressable
                      key={dateKey ?? `empty-${index}`}
                      disabled={!dateKey}
                      onPress={() => dateKey && setSelectedDate(dateKey)}
                      style={[
                        styles.dayCell,
                        !dateKey && styles.dayEmpty,
                        dateKey && intensityStyle(pct),
                        isSelected && styles.daySelected,
                        isToday && styles.dayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !row && dateKey && styles.dayNumberMuted,
                        ]}
                      >
                        {dateKey ? Number(dateKey.slice(-2)) : ''}
                      </Text>
                      {row ? (
                        <Text style={styles.dayPct}>{formatPct(pct)}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.summaryStrip}>
                <Text style={styles.summaryText}>
                  Tháng này: {monthSummary.days} ngày · {monthSummary.xp} XP · {formatPct(completionPct(monthSummary.done, monthSummary.total))}
                </Text>
              </View>
            </View>
          ) : null}

          {calendarMode === 'day' ? (
            <View style={styles.dayList}>
              {sortedHistory.length > 0 ? (
                sortedHistory.slice(0, 60).map((row) => {
                  const pct = rowCompletionPct(row);
                  const active = row.date === selectedDate;
                  return (
                    <Pressable
                      key={row.date}
                      onPress={() => {
                        setSelectedDate(row.date);
                        setVisibleMonth(String(row.date).slice(0, 7));
                      }}
                      style={[styles.dayListRow, active && styles.dayListRowActive]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.dayListDate}>{formatDateLong(row.date)}</Text>
                        <Text style={styles.dayListMeta}>
                          {row.questsDone ?? 0} việc · {row.xpEarned ?? 0} XP
                        </Text>
                      </View>
                      <Text style={styles.dayListPct}>{formatPct(pct)}</Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Chưa có lịch sử ngày nào.</Text>
              )}
            </View>
          ) : null}

          {calendarMode === 'year' ? (
            <View>
              <View style={styles.calendarNav}>
                <Pressable
                  onPress={() => setSelectedYear((y) => y - 1)}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>{'<'}</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>Năm {selectedYear}</Text>
                <Pressable
                  onPress={() => setSelectedYear((y) => y + 1)}
                  style={styles.navBtn}
                >
                  <Text style={styles.navBtnText}>{'>'}</Text>
                </Pressable>
              </View>
              <View style={styles.yearGrid}>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = String(i + 1).padStart(2, '0');
                  const key = `${selectedYear}-${month}`;
                  const rows = history.filter((row) => String(row.date).startsWith(key));
                  const sum = aggregateRows(rows);
                  const pct = completionPct(sum.done, sum.total);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        setVisibleMonth(key);
                        setCalendarMode('month');
                      }}
                      style={[styles.monthTile, intensityStyle(pct)]}
                    >
                      <Text style={styles.monthTileTitle}>T{i + 1}</Text>
                      <Text style={styles.monthTileMeta}>{sum.days} ngày</Text>
                      <Text style={styles.monthTilePct}>{formatPct(pct)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.summaryStrip}>
                <Text style={styles.summaryText}>
                  Năm này: {yearSummary.days} ngày · {yearSummary.xp} XP · {formatPct(completionPct(yearSummary.done, yearSummary.total))}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi tiết ngày</Text>
          <Text style={styles.detailDate}>{formatDateLong(selectedDate)}</Text>
          {selectedRow ? (
            <>
              <View style={styles.detailTopGrid}>
                <View style={styles.detailTile}>
                  <Text style={styles.detailMuted}>Hoàn thành</Text>
                  <Text style={styles.detailValue}>{formatPct(selectedPct)}</Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.detailMuted}>XP</Text>
                  <Text style={styles.detailValue}>{selectedTotals.xp}</Text>
                </View>
                <View style={styles.detailTile}>
                  <Text style={styles.detailMuted}>Quest</Text>
                  <Text style={styles.detailValue}>
                    {selectedTotals.done}/{selectedTotals.total}
                  </Text>
                </View>
              </View>
              {[
                ['Công việc', selectedRow.workDone, selectedRow.workTotal],
                ['Thể dục', selectedRow.exerciseDone, selectedRow.exerciseTotal],
                ['Thói quen tốt', selectedRow.habitGoodDone, selectedRow.habitGoodTotal],
                ['Tránh thói xấu', selectedRow.habitBadOk, selectedRow.habitBadTotal],
                ['Vượt bản thân', selectedRow.overcomeDone, selectedRow.overcomeTotal],
              ].map(([label, done, total]) => (
                <View key={label} style={styles.detailLine}>
                  <Text style={styles.detailLineLabel}>{label}</Text>
                  <Text style={styles.detailLineValue}>
                    {Number(done) || 0}/{Number(total) || 0}
                  </Text>
                </View>
              ))}
              {Array.isArray(selectedRow.overcomeTitles) &&
              selectedRow.overcomeTitles.length > 0 ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteTitle}>Quest vượt bản thân</Text>
                  {selectedRow.overcomeTitles.map((title) => (
                    <Text key={title} style={styles.noteText}>• {title}</Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>
              Ngày này chưa có snapshot. Lịch sẽ có dữ liệu sau khi bạn làm hoặc app lưu tiến độ trong ngày đó.
            </Text>
          )}
        </View>

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
  calendarHeader: {
    gap: 10,
    marginBottom: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a38',
    backgroundColor: '#101018',
  },
  modeTabActive: {
    borderColor: '#d4af37',
    backgroundColor: '#211c0d',
  },
  modeTabText: {
    color: '#8f8a82',
    fontSize: 12,
    fontWeight: '800',
  },
  modeTabTextActive: {
    color: '#f3eee6',
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a38',
    backgroundColor: '#101018',
  },
  navBtnText: {
    color: '#d4af37',
    fontSize: 20,
    fontWeight: '900',
  },
  calendarTitle: {
    flex: 1,
    color: '#f3eee6',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    color: '#746f65',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    width: '12.4%',
    aspectRatio: 0.92,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a38',
    padding: 5,
    justifyContent: 'space-between',
    backgroundColor: '#101018',
  },
  dayEmpty: {
    opacity: 0,
  },
  dayNoData: {
    backgroundColor: '#101018',
  },
  dayWeak: {
    backgroundColor: '#2b1618',
    borderColor: '#5f2a2a',
  },
  dayPartial: {
    backgroundColor: '#2c2412',
    borderColor: '#6b5520',
  },
  dayStrong: {
    backgroundColor: '#13251d',
    borderColor: '#2f7a55',
  },
  dayPerfect: {
    backgroundColor: '#1f250f',
    borderColor: '#b9a22a',
  },
  daySelected: {
    borderColor: '#f3eee6',
    borderWidth: 2,
  },
  dayToday: {
    shadowColor: '#d4af37',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dayNumber: {
    color: '#f3eee6',
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  dayNumberMuted: {
    color: '#5c5766',
  },
  dayPct: {
    color: '#d4af37',
    fontSize: 8,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryStrip: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#101018',
    borderWidth: 1,
    borderColor: '#252532',
  },
  summaryText: {
    color: '#bdb7ad',
    fontSize: 12,
    fontWeight: '700',
  },
  dayList: {
    gap: 8,
  },
  dayListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252532',
    backgroundColor: '#101018',
  },
  dayListRowActive: {
    borderColor: '#d4af37',
    backgroundColor: '#211c0d',
  },
  dayListDate: {
    color: '#f3eee6',
    fontSize: 13,
    fontWeight: '800',
  },
  dayListMeta: {
    color: '#7d786f',
    fontSize: 11,
    marginTop: 3,
  },
  dayListPct: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
    minWidth: 56,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    color: '#8f8a82',
    fontSize: 12,
    lineHeight: 18,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthTile: {
    width: '31.5%',
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a38',
    padding: 10,
    justifyContent: 'space-between',
  },
  monthTileTitle: {
    color: '#f3eee6',
    fontSize: 14,
    fontWeight: '900',
  },
  monthTileMeta: {
    color: '#8f8a82',
    fontSize: 10,
    marginTop: 4,
  },
  monthTilePct: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  detailDate: {
    color: '#f3eee6',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  detailTopGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailTile: {
    flex: 1,
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252532',
    backgroundColor: '#101018',
    padding: 10,
    justifyContent: 'center',
  },
  detailMuted: {
    color: '#8f8a82',
    fontSize: 10,
    fontWeight: '700',
  },
  detailValue: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#252532',
  },
  detailLineLabel: {
    color: '#d8d2c8',
    fontSize: 13,
    fontWeight: '700',
  },
  detailLineValue: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  noteBox: {
    marginTop: 12,
    padding: 11,
    borderRadius: 8,
    backgroundColor: '#101018',
    borderWidth: 1,
    borderColor: '#2a2a38',
  },
  noteTitle: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  noteText: {
    color: '#bdb7ad',
    fontSize: 12,
    lineHeight: 18,
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
