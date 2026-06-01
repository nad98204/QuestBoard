import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDaysToKey, getTodayKey } from '../utils/rpg';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍜', color: '#f97316', type: 'expense' },
  { id: 'transport', label: 'Di chuyển', icon: '🚌', color: '#38bdf8', type: 'expense' },
  { id: 'entertainment', label: 'Giải trí', icon: '🎮', color: '#a78bfa', type: 'expense' },
  { id: 'work_tools', label: 'Công cụ làm việc', icon: '🧰', color: '#facc15', type: 'expense' },
  { id: 'income', label: 'Thu nhập', icon: '💰', color: '#34d399', type: 'income' },
  { id: 'other', label: 'Khác', icon: '✦', color: '#94a3b8', type: 'both' },
];

const CUSTOM_CATEGORY_COLORS = [
  '#22c55e',
  '#06b6d4',
  '#eab308',
  '#ec4899',
  '#8b5cf6',
  '#f97316',
  '#14b8a6',
  '#fb7185',
];

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'expense', label: 'Chi tiêu' },
  { id: 'income', label: 'Thu nhập' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function timeKeyFromDate(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthLabel(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return monthKey;
  return `Tháng ${month}/${year}`;
}

function addMonthsToKey(monthKey, delta) {
  const [year, month] = String(monthKey).split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return getMonthKey(d);
}

function parseLocalDateTime(dateKey, timeKey) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey).trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeKey).trim());
  if (!dateMatch || !timeMatch) return null;

  const [, y, m, d] = dateMatch.map(Number);
  const [, hh, mm] = timeMatch.map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d ||
    dt.getHours() !== hh ||
    dt.getMinutes() !== mm
  ) {
    return null;
  }
  return dt;
}

function parseAmount(raw) {
  const source = String(raw ?? '').trim();
  if (!source) return null;
  let cleaned = source.replace(/[^\d,.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '+') return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    cleaned =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const parts = cleaned.split(',');
    cleaned =
      parts.length > 1 && parts[parts.length - 1].length === 3
        ? parts.join('')
        : cleaned.replace(',', '.');
  } else if (lastDot >= 0) {
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleaned = parts.join('');
    }
  }

  const n = Number(cleaned);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
  }
}

function formatSignedAmount(amount) {
  const sign = amount > 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
}

function categoryById(id, categories) {
  return (
    categories.find((c) => c.id === id) ??
    DEFAULT_CATEGORIES.find((c) => c.id === 'other') ??
    DEFAULT_CATEGORIES[0]
  );
}

function categoriesForMode(mode, categories) {
  if (mode === 'income') {
    return categories.filter((c) => c.type === 'income' || c.type === 'both');
  }
  if (mode === 'expense') {
    return categories.filter((c) => c.type === 'expense' || c.type === 'both');
  }
  return categories;
}

function normalizeCustomCategories(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  return raw
    .map((cat, index) => {
      if (!cat || typeof cat !== 'object') return null;
      const label = normalizeText(cat.label);
      if (!label) return null;
      const id = normalizeText(cat.id, `custom-${index}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      if (!id || seen.has(id)) return null;
      seen.add(id);
      const type = cat.type === 'income' ? 'income' : 'expense';
      return {
        id,
        label,
        icon: normalizeText(cat.icon, '✦'),
        color:
          normalizeText(cat.color) ||
          CUSTOM_CATEGORY_COLORS[index % CUSTOM_CATEGORY_COLORS.length],
        type,
        custom: true,
      };
    })
    .filter(Boolean);
}

function makeCategoryId(label) {
  const slug = normalizeText(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `custom-${slug || Date.now()}`;
}

function getTransactionDate(tx) {
  const d = new Date(tx?.dateTime);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function getDayLabel(dateKey) {
  const today = getTodayKey();
  if (dateKey === today) return 'Hôm nay';
  if (dateKey === addDaysToKey(today, -1)) return 'Hôm qua';

  const [year, month, day] = String(dateKey).split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildInitialDraft() {
  const now = new Date();
  return {
    description: '',
    amount: '',
    category: 'food',
    date: dateKeyFromDate(now),
    time: timeKeyFromDate(now),
    note: '',
  };
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export default function ExpenseScreen({
  transactions,
  customCategories,
  onTransactionsChange,
  onCategoriesChange,
}) {
  const [draft, setDraft] = useState(buildInitialDraft);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [visibleMonth, setVisibleMonth] = useState(getMonthKey());
  const [error, setError] = useState('');
  const canAdd = filter === 'expense' || filter === 'income';
  const normalizedCustomCategories = useMemo(
    () => normalizeCustomCategories(customCategories),
    [customCategories]
  );
  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...normalizedCustomCategories],
    [normalizedCustomCategories]
  );
  const entryCategories = useMemo(
    () => categoriesForMode(filter, allCategories),
    [allCategories, filter]
  );
  const entryTitle = filter === 'income' ? 'Thêm thu nhập' : 'Thêm chi tiêu';
  const entryPlaceholder =
    filter === 'income'
      ? 'Tên/mô tả, ví dụ: Lương'
      : 'Tên/mô tả, ví dụ: Siêu thị';
  const amountPlaceholder =
    filter === 'income'
      ? 'Số tiền thu, ví dụ: 12000000'
      : 'Số tiền chi, ví dụ: 85000';

  const allTransactions = useMemo(
    () => (Array.isArray(transactions) ? transactions : []),
    [transactions]
  );

  const monthTransactions = useMemo(
    () =>
      allTransactions.filter(
        (tx) => getMonthKey(getTransactionDate(tx)) === visibleMonth
      ),
    [allTransactions, visibleMonth]
  );

  const totals = useMemo(
    () =>
      monthTransactions.reduce(
        (acc, tx) => {
          const amount = Number(tx.amount) || 0;
          if (amount > 0) acc.income += amount;
          if (amount < 0) acc.expense += Math.abs(amount);
          acc.balance += amount;
          return acc;
        },
        { income: 0, expense: 0, balance: 0 }
      ),
    [monthTransactions]
  );

  const visibleTransactions = useMemo(() => {
    const list = monthTransactions.filter((tx) => {
      const amount = Number(tx.amount) || 0;
      if (filter === 'income') return amount > 0;
      if (filter === 'expense') return amount < 0;
      return true;
    });
    return [...list].sort(
      (a, b) => getTransactionDate(b).getTime() - getTransactionDate(a).getTime()
    );
  }, [filter, monthTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map();
    for (const tx of visibleTransactions) {
      const date = getTransactionDate(tx);
      const key = dateKeyFromDate(date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tx);
    }
    return Array.from(groups.entries());
  }, [visibleTransactions]);

  const updateDraft = (key, value) => {
    setError('');
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterChange = (nextFilter) => {
    setError('');
    setFilter(nextFilter);
    setDraft((prev) => {
      const nextCategories = categoriesForMode(nextFilter, allCategories);
      if (nextCategories.some((cat) => cat.id === prev.category)) return prev;
      return { ...prev, category: nextCategories[0]?.id ?? 'other' };
    });
  };

  const handleAddCategory = () => {
    if (!canAdd) return;

    const label = normalizeText(categoryDraft);
    if (!label) {
      setError('Nhập tên danh mục cần thêm.');
      return;
    }

    const type = filter === 'income' ? 'income' : 'expense';
    const duplicated = allCategories.some(
      (cat) =>
        cat.type !== (type === 'income' ? 'expense' : 'income') &&
        cat.label.trim().toLowerCase() === label.toLowerCase()
    );
    if (duplicated) {
      setError('Danh mục này đã tồn tại.');
      return;
    }

    const usedIds = new Set(allCategories.map((cat) => cat.id));
    let id = makeCategoryId(label);
    if (usedIds.has(id)) id = `${id}-${Date.now()}`;

    const nextCategory = {
      id,
      label,
      icon: type === 'income' ? '💰' : '✦',
      color:
        CUSTOM_CATEGORY_COLORS[
          normalizedCustomCategories.length % CUSTOM_CATEGORY_COLORS.length
        ],
      type,
      custom: true,
    };

    onCategoriesChange?.([...normalizedCustomCategories, nextCategory]);
    setCategoryDraft('');
    setDraft((prev) => ({ ...prev, category: id }));
    setError('');
  };

  const handleAdd = () => {
    if (!canAdd) return;

    const description = normalizeText(draft.description);
    const rawAmount = parseAmount(draft.amount);
    const dt = parseLocalDateTime(draft.date, draft.time);
    const amount =
      rawAmount == null
        ? null
        : filter === 'expense'
          ? -Math.abs(rawAmount)
          : Math.abs(rawAmount);

    if (!description) {
      setError('Nhập tên hoặc mô tả giao dịch.');
      return;
    }
    if (amount == null) {
      setError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!dt) {
      setError('Ngày giờ cần đúng dạng YYYY-MM-DD và HH:mm.');
      return;
    }

    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description,
        amount,
        category: draft.category,
        dateTime: dt.toISOString(),
        note: normalizeText(draft.note),
        createdAt: Date.now(),
      },
      ...allTransactions,
    ];
    onTransactionsChange(next);
    setDraft((prev) => ({
      ...buildInitialDraft(),
      category: prev.category,
    }));
  };

  const handleDelete = (id) => {
    onTransactionsChange(allTransactions.filter((tx) => tx.id !== id));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => setVisibleMonth((m) => addMonthsToKey(m, -1))}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>{'<'}</Text>
              </Pressable>
              <View style={styles.monthTitleWrap}>
                <Text style={styles.title}>Note chi phí</Text>
                <Text style={styles.monthTitle}>{monthLabel(visibleMonth)}</Text>
              </View>
              <Pressable
                onPress={() => setVisibleMonth((m) => addMonthsToKey(m, 1))}
                style={styles.navBtn}
              >
                <Text style={styles.navBtnText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.totalGrid}>
              <View style={styles.totalTile}>
                <Text style={styles.totalLabel}>Tổng thu</Text>
                <Text style={[styles.totalValue, styles.incomeText]}>
                  {formatCurrency(totals.income)}
                </Text>
              </View>
              <View style={styles.totalTile}>
                <Text style={styles.totalLabel}>Tổng chi</Text>
                <Text style={[styles.totalValue, styles.expenseText]}>
                  {formatCurrency(totals.expense)}
                </Text>
              </View>
              <View style={styles.totalTile}>
                <Text style={styles.totalLabel}>Còn lại</Text>
                <Text
                  style={[
                    styles.totalValue,
                    totals.balance >= 0 ? styles.incomeText : styles.expenseText,
                  ]}
                >
                  {formatSignedAmount(totals.balance)}
                </Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleFilterChange(item.id)}
                  style={[
                    styles.filterBtn,
                    filter === item.id && styles.filterBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item.id && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {canAdd ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{entryTitle}</Text>
              <TextInput
                value={draft.description}
                onChangeText={(v) => updateDraft('description', v)}
                placeholder={entryPlaceholder}
                placeholderTextColor="#6f6a7d"
                style={styles.input}
              />
              <TextInput
                value={draft.amount}
                onChangeText={(v) => updateDraft('amount', v)}
                placeholder={amountPlaceholder}
                placeholderTextColor="#6f6a7d"
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Danh mục</Text>
              <View style={styles.optionWrap}>
                {entryCategories.map((cat) => {
                  const active = draft.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => updateDraft('category', cat.id)}
                      style={[
                        styles.categoryBtn,
                        active && { borderColor: cat.color, backgroundColor: '#171923' },
                      ]}
                    >
                      <Text style={[styles.categoryIcon, { color: cat.color }]}>
                        {cat.icon}
                      </Text>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.categoryAddRow}>
                <TextInput
                  value={categoryDraft}
                  onChangeText={(v) => {
                    setError('');
                    setCategoryDraft(v);
                  }}
                  placeholder="Thêm danh mục mới"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.categoryAddInput]}
                />
                <Pressable style={styles.categoryAddBtn} onPress={handleAddCategory}>
                  <Text style={styles.categoryAddText}>Thêm</Text>
                </Pressable>
              </View>

              <View style={styles.dateRow}>
                <TextInput
                  value={draft.date}
                  onChangeText={(v) => updateDraft('date', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.dateInput]}
                />
                <TextInput
                  value={draft.time}
                  onChangeText={(v) => updateDraft('time', v)}
                  placeholder="HH:mm"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.timeInput]}
                />
              </View>

              <TextInput
                value={draft.note}
                onChangeText={(v) => updateDraft('note', v)}
                placeholder="Ghi chú tùy chọn"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.noteInput]}
                multiline
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                style={[
                  styles.addBtn,
                  filter === 'expense' && styles.addExpenseBtn,
                ]}
                onPress={handleAdd}
              >
                <Text style={styles.addBtnText}>{entryTitle}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Danh sách giao dịch</Text>
            {groupedTransactions.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có giao dịch phù hợp trong tháng này.</Text>
            ) : (
              groupedTransactions.map(([dateKey, items]) => (
                <View key={dateKey} style={styles.dayGroup}>
                  <Text style={styles.dayTitle}>{getDayLabel(dateKey)}</Text>
                  {items.map((tx) => {
                    const cat = categoryById(tx.category, allCategories);
                    const amount = Number(tx.amount) || 0;
                    const txDate = getTransactionDate(tx);
                    return (
                      <View key={tx.id} style={styles.txRow}>
                        <View
                          style={[
                            styles.txIconWrap,
                            { borderColor: cat.color, backgroundColor: `${cat.color}22` },
                          ]}
                        >
                          <Text style={[styles.txIcon, { color: cat.color }]}>
                            {cat.icon}
                          </Text>
                        </View>
                        <View style={styles.txBody}>
                          <View style={styles.txTopLine}>
                            <Text style={styles.txTitle} numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text
                              style={[
                                styles.txAmount,
                                amount >= 0 ? styles.incomeText : styles.expenseText,
                              ]}
                            >
                              {formatSignedAmount(amount)}
                            </Text>
                          </View>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {cat.label} · {timeKeyFromDate(txDate)}
                          </Text>
                          {tx.note ? (
                            <Text style={styles.txNote} numberOfLines={2}>
                              {tx.note}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => handleDelete(tx.id)}
                          hitSlop={10}
                          style={styles.deleteBtn}
                        >
                          <Text style={styles.deleteText}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 28,
  },
  header: {
    backgroundColor: '#080816',
    borderWidth: 1,
    borderColor: '#1d1d36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  navBtn: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a44',
    borderRadius: 8,
    backgroundColor: '#101018',
  },
  navBtnText: {
    color: '#f5c842',
    fontSize: 20,
    fontWeight: '900',
  },
  monthTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  monthTitle: {
    color: '#a0a0c0',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  totalGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  totalTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    padding: 10,
    justifyContent: 'center',
  },
  totalLabel: {
    color: '#8585a3',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  incomeText: {
    color: '#34d399',
  },
  expenseText: {
    color: '#fb7185',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
  },
  filterBtnActive: {
    borderColor: '#f5c842',
    backgroundColor: '#211c0d',
  },
  filterText: {
    color: '#8585a3',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#080816',
    borderWidth: 1,
    borderColor: '#1d1d36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#f5c842',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f1020',
    borderWidth: 1,
    borderColor: '#252542',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#a0a0c0',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 2,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryAddInput: {
    flex: 1,
    marginBottom: 0,
  },
  categoryAddBtn: {
    minWidth: 72,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c842',
    backgroundColor: 'rgba(245, 200, 66, 0.12)',
    paddingHorizontal: 12,
  },
  categoryAddText: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  optionText: {
    color: '#a0a0c0',
    fontSize: 12,
    fontWeight: '800',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1.3,
  },
  timeInput: {
    flex: 0.8,
  },
  noteInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#fb7185',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  addBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
  },
  addExpenseBtn: {
    borderColor: '#fb7185',
    backgroundColor: 'rgba(251, 113, 133, 0.14)',
  },
  addBtnText: {
    color: '#d1fae5',
    fontSize: 13,
    fontWeight: '900',
  },
  emptyText: {
    color: '#8585a3',
    fontSize: 12,
    lineHeight: 18,
  },
  dayGroup: {
    marginBottom: 14,
  },
  dayTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1b1b32',
    paddingVertical: 10,
  },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txIcon: {
    fontSize: 18,
  },
  txBody: {
    flex: 1,
    minWidth: 0,
  },
  txTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  txTitle: {
    flex: 1,
    minWidth: 0,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  txAmount: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    maxWidth: 120,
  },
  txMeta: {
    color: '#8585a3',
    fontSize: 11,
    marginTop: 4,
  },
  txNote: {
    color: '#c4c4dd',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  deleteBtn: {
    width: 28,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  deleteText: {
    color: '#fb7185',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
});
