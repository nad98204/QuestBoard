import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import {
  fetchAssetSnapshotFromAI,
  fetchExpenseTransactionsFromAI,
  fetchBudgetRecordsFromAI,
  fetchLoanRecordsFromAI,
  fetchMoneyJarsFromAI,
} from '../utils/aiCoach';

const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍜', color: '#f97316', type: 'expense' },
  { id: 'breakfast', label: 'Ăn sáng', icon: '🥖', color: '#fb923c', type: 'expense' },
  { id: 'lunch', label: 'Ăn trưa', icon: '🍱', color: '#f97316', type: 'expense' },
  { id: 'dinner', label: 'Ăn tối', icon: '🍲', color: '#ea580c', type: 'expense' },
  { id: 'coffee_tea', label: 'Cà phê / trà sữa', icon: '☕', color: '#a16207', type: 'expense' },
  { id: 'snacks', label: 'Đồ ăn vặt', icon: '🍿', color: '#f59e0b', type: 'expense' },
  { id: 'groceries_market', label: 'Đi chợ', icon: '🥬', color: '#22c55e', type: 'expense' },
  { id: 'supermarket_food', label: 'Siêu thị thực phẩm', icon: '🛒', color: '#84cc16', type: 'expense' },
  { id: 'restaurant', label: 'Nhà hàng', icon: '🍽️', color: '#ef4444', type: 'expense' },
  { id: 'drinks', label: 'Đồ uống / nước', icon: '🥤', color: '#06b6d4', type: 'expense' },

  { id: 'transport', label: 'Di chuyển', icon: '🚌', color: '#38bdf8', type: 'expense' },
  { id: 'fuel', label: 'Xăng xe', icon: '⛽', color: '#0ea5e9', type: 'expense' },
  { id: 'parking', label: 'Gửi xe', icon: '🅿️', color: '#0284c7', type: 'expense' },
  { id: 'ride_hailing', label: 'Grab / taxi', icon: '🚕', color: '#22c55e', type: 'expense' },
  { id: 'public_transport', label: 'Xe bus / tàu', icon: '🚆', color: '#38bdf8', type: 'expense' },
  { id: 'flight', label: 'Vé máy bay', icon: '✈️', color: '#60a5fa', type: 'expense' },
  { id: 'vehicle_maintenance', label: 'Bảo dưỡng xe', icon: '🔧', color: '#94a3b8', type: 'expense' },
  { id: 'car_wash', label: 'Rửa xe', icon: '🧽', color: '#67e8f9', type: 'expense' },
  { id: 'traffic_fine', label: 'Phạt giao thông', icon: '🚨', color: '#ef4444', type: 'expense' },
  { id: 'vehicle_rental', label: 'Thuê xe', icon: '🚗', color: '#0f766e', type: 'expense' },

  { id: 'housing_rent', label: 'Tiền thuê nhà', icon: '🏠', color: '#64748b', type: 'expense' },
  { id: 'electricity', label: 'Điện', icon: '💡', color: '#facc15', type: 'expense' },
  { id: 'water_bill', label: 'Nước', icon: '💧', color: '#38bdf8', type: 'expense' },
  { id: 'internet_bill', label: 'Internet', icon: '🌐', color: '#818cf8', type: 'expense' },
  { id: 'gas_bill', label: 'Gas', icon: '🔥', color: '#f97316', type: 'expense' },
  { id: 'apartment_fee', label: 'Phí chung cư', icon: '🏢', color: '#94a3b8', type: 'expense' },
  { id: 'furniture', label: 'Nội thất', icon: '🛋️', color: '#a855f7', type: 'expense' },
  { id: 'home_appliances', label: 'Đồ gia dụng', icon: '🔌', color: '#14b8a6', type: 'expense' },
  { id: 'home_repair', label: 'Sửa chữa nhà', icon: '🛠️', color: '#f59e0b', type: 'expense' },
  { id: 'cleaning_supplies', label: 'Vệ sinh nhà cửa', icon: '🧼', color: '#2dd4bf', type: 'expense' },

  { id: 'personal_shopping', label: 'Mua sắm cá nhân', icon: '🛍️', color: '#ec4899', type: 'expense' },
  { id: 'clothing', label: 'Quần áo', icon: '👕', color: '#f472b6', type: 'expense' },
  { id: 'shoes', label: 'Giày dép', icon: '👟', color: '#fb7185', type: 'expense' },
  { id: 'bags_accessories', label: 'Túi / phụ kiện', icon: '👜', color: '#e879f9', type: 'expense' },
  { id: 'cosmetics', label: 'Mỹ phẩm', icon: '💄', color: '#ec4899', type: 'expense' },
  { id: 'skincare', label: 'Skincare', icon: '🧴', color: '#f9a8d4', type: 'expense' },
  { id: 'perfume', label: 'Nước hoa', icon: '🫧', color: '#c084fc', type: 'expense' },
  { id: 'haircare', label: 'Cắt tóc / làm tóc', icon: '💇', color: '#a78bfa', type: 'expense' },
  { id: 'personal_items', label: 'Đồ cá nhân', icon: '🧻', color: '#94a3b8', type: 'expense' },
  { id: 'laundry', label: 'Giặt ủi', icon: '🧺', color: '#67e8f9', type: 'expense' },

  { id: 'healthcare', label: 'Sức khỏe', icon: '🏥', color: '#22c55e', type: 'expense' },
  { id: 'medical_checkup', label: 'Khám bệnh', icon: '🩺', color: '#10b981', type: 'expense' },
  { id: 'medicine', label: 'Thuốc', icon: '💊', color: '#34d399', type: 'expense' },
  { id: 'health_insurance', label: 'Bảo hiểm y tế', icon: '🛡️', color: '#14b8a6', type: 'expense' },
  { id: 'dental', label: 'Nha khoa', icon: '🦷', color: '#06b6d4', type: 'expense' },
  { id: 'glasses_lens', label: 'Mắt kính / lens', icon: '👓', color: '#60a5fa', type: 'expense' },
  { id: 'supplements', label: 'Thực phẩm chức năng', icon: '🍀', color: '#84cc16', type: 'expense' },
  { id: 'gym_sports', label: 'Gym / thể thao', icon: '🏋️', color: '#ef4444', type: 'expense' },
  { id: 'mental_health', label: 'Chăm sóc tinh thần', icon: '🧘', color: '#a78bfa', type: 'expense' },

  { id: 'work_tools', label: 'Công cụ làm việc', icon: '🧰', color: '#facc15', type: 'expense' },
  { id: 'software', label: 'Phần mềm', icon: '💻', color: '#38bdf8', type: 'expense' },
  { id: 'courses', label: 'Khóa học', icon: '🎓', color: '#f59e0b', type: 'expense' },
  { id: 'books', label: 'Sách', icon: '📚', color: '#a16207', type: 'expense' },
  { id: 'stationery', label: 'Văn phòng phẩm', icon: '✏️', color: '#facc15', type: 'expense' },
  { id: 'electronics', label: 'Thiết bị điện tử', icon: '📱', color: '#818cf8', type: 'expense' },
  { id: 'hosting_domain', label: 'Hosting / domain', icon: '🖥️', color: '#0ea5e9', type: 'expense' },
  { id: 'printing_docs', label: 'In ấn tài liệu', icon: '🖨️', color: '#64748b', type: 'expense' },
  { id: 'coworking', label: 'Coworking / chỗ làm', icon: '🏬', color: '#14b8a6', type: 'expense' },

  { id: 'entertainment', label: 'Giải trí', icon: '🎮', color: '#a78bfa', type: 'expense' },
  { id: 'game', label: 'Game', icon: '🕹️', color: '#8b5cf6', type: 'expense' },
  { id: 'cinema', label: 'Phim / rạp chiếu', icon: '🎬', color: '#ef4444', type: 'expense' },
  { id: 'music_subscription', label: 'Nhạc / subscription', icon: '🎧', color: '#06b6d4', type: 'expense' },
  { id: 'travel', label: 'Du lịch', icon: '🧳', color: '#22c55e', type: 'expense' },
  { id: 'hotel', label: 'Khách sạn', icon: '🏨', color: '#f97316', type: 'expense' },
  { id: 'events_concert', label: 'Sự kiện / concert', icon: '🎟️', color: '#ec4899', type: 'expense' },
  { id: 'bar_karaoke', label: 'Bar / karaoke', icon: '🎤', color: '#a855f7', type: 'expense' },
  { id: 'hobbies', label: 'Sở thích cá nhân', icon: '🎨', color: '#14b8a6', type: 'expense' },
  { id: 'collectibles', label: 'Đồ chơi / sưu tầm', icon: '🧩', color: '#f59e0b', type: 'expense' },

  { id: 'relationship_family', label: 'Gia đình / quan hệ', icon: '👨‍👩‍👧', color: '#f472b6', type: 'expense' },
  { id: 'parents', label: 'Ba mẹ', icon: '👪', color: '#fb7185', type: 'expense' },
  { id: 'children', label: 'Con cái', icon: '🧒', color: '#f9a8d4', type: 'expense' },
  { id: 'partner_spouse', label: 'Người yêu / vợ chồng', icon: '💑', color: '#ec4899', type: 'expense' },
  { id: 'dating', label: 'Đi chơi người yêu', icon: '💞', color: '#fb7185', type: 'expense' },
  { id: 'friends', label: 'Bạn bè', icon: '🤝', color: '#38bdf8', type: 'expense' },
  { id: 'gifts', label: 'Quà tặng', icon: '🎁', color: '#f43f5e', type: 'expense' },
  { id: 'wedding', label: 'Cưới hỏi', icon: '💍', color: '#facc15', type: 'expense' },
  { id: 'birthday', label: 'Sinh nhật', icon: '🎂', color: '#f97316', type: 'expense' },
  { id: 'funeral_support', label: 'Hiếu hỉ', icon: '🕯️', color: '#94a3b8', type: 'expense' },
  { id: 'charity_help', label: 'Từ thiện / giúp đỡ', icon: '🤲', color: '#22c55e', type: 'expense' },

  { id: 'finance', label: 'Tài chính', icon: '🏦', color: '#34d399', type: 'expense' },
  { id: 'debt_payment', label: 'Trả nợ', icon: '💳', color: '#fb7185', type: 'expense' },
  { id: 'loan_interest', label: 'Lãi vay', icon: '📉', color: '#ef4444', type: 'expense' },
  { id: 'bank_fee', label: 'Phí ngân hàng', icon: '🏧', color: '#94a3b8', type: 'expense' },
  { id: 'card_fee', label: 'Phí thẻ', icon: '💳', color: '#64748b', type: 'expense' },
  { id: 'investment', label: 'Đầu tư', icon: '📈', color: '#22c55e', type: 'expense' },
  { id: 'savings', label: 'Tiết kiệm', icon: '🐷', color: '#34d399', type: 'expense' },
  { id: 'insurance', label: 'Bảo hiểm', icon: '🛡️', color: '#14b8a6', type: 'expense' },
  { id: 'tax', label: 'Thuế', icon: '🧾', color: '#f59e0b', type: 'expense' },
  { id: 'emergency_fund', label: 'Quỹ dự phòng', icon: '🧯', color: '#f97316', type: 'expense' },

  { id: 'pet', label: 'Thú cưng', icon: '🐾', color: '#a78bfa', type: 'expense' },
  { id: 'pet_food', label: 'Thức ăn thú cưng', icon: '🥫', color: '#f59e0b', type: 'expense' },
  { id: 'vet', label: 'Khám thú y', icon: '🩺', color: '#22c55e', type: 'expense' },
  { id: 'pet_accessories', label: 'Phụ kiện thú cưng', icon: '🦴', color: '#fb7185', type: 'expense' },
  { id: 'pet_spa', label: 'Spa thú cưng', icon: '🫧', color: '#38bdf8', type: 'expense' },
  { id: 'pet_medicine', label: 'Thuốc thú cưng', icon: '💊', color: '#34d399', type: 'expense' },

  { id: 'unexpected_expense', label: 'Chi phí phát sinh', icon: '⚠️', color: '#f97316', type: 'expense' },
  { id: 'lost_money', label: 'Mất tiền / thất lạc', icon: '🕳️', color: '#ef4444', type: 'expense' },
  { id: 'unclear_expense', label: 'Khoản không rõ', icon: '❓', color: '#94a3b8', type: 'expense' },

  { id: 'income', label: 'Thu nhập', icon: '💰', color: '#34d399', type: 'income' },
  { id: 'salary', label: 'Lương', icon: '💼', color: '#22c55e', type: 'income' },
  { id: 'bonus', label: 'Thưởng', icon: '🏆', color: '#facc15', type: 'income' },
  { id: 'freelance_income', label: 'Freelance', icon: '🧑‍💻', color: '#38bdf8', type: 'income' },
  { id: 'business_income', label: 'Kinh doanh', icon: '🏪', color: '#10b981', type: 'income' },
  { id: 'selling_income', label: 'Bán đồ', icon: '🏷️', color: '#84cc16', type: 'income' },
  { id: 'investment_profit', label: 'Đầu tư sinh lời', icon: '📈', color: '#22c55e', type: 'income' },
  { id: 'savings_interest', label: 'Lãi tiết kiệm', icon: '🏦', color: '#34d399', type: 'income' },
  { id: 'gift_income', label: 'Được tặng', icon: '🎁', color: '#f472b6', type: 'income' },
  { id: 'refund', label: 'Hoàn tiền', icon: '↩️', color: '#06b6d4', type: 'income' },
  { id: 'allowance', label: 'Trợ cấp', icon: '🤲', color: '#14b8a6', type: 'income' },
  { id: 'side_income', label: 'Thu nhập phụ', icon: '✨', color: '#a78bfa', type: 'income' },
  { id: 'income_other', label: 'Thu nhập khác', icon: '💵', color: '#94a3b8', type: 'income' },

  { id: 'internal_transfer', label: 'Chuyển khoản nội bộ', icon: '↔️', color: '#67e8f9', type: 'both' },
  { id: 'cash_withdrawal', label: 'Rút tiền mặt', icon: '🏧', color: '#38bdf8', type: 'both' },
  { id: 'ewallet_topup', label: 'Nạp ví điện tử', icon: '📲', color: '#06b6d4', type: 'both' },
  { id: 'wallet_transfer', label: 'Chuyển ví', icon: '🔁', color: '#14b8a6', type: 'both' },
  { id: 'savings_deposit', label: 'Gửi tiết kiệm', icon: '📥', color: '#22c55e', type: 'both' },
  { id: 'savings_withdrawal', label: 'Rút tiết kiệm', icon: '📤', color: '#84cc16', type: 'both' },

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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeekMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getPeriodRange(period, anchor = new Date()) {
  if (period === 'daily') {
    const start = startOfDay(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (period === 'weekly') {
    const start = startOfWeekMonday(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

function periodLabel(period) {
  if (period === 'daily') return 'Ngày';
  if (period === 'weekly') return 'Tuần';
  return 'Tháng';
}

function getPeriodDateLabel(period, anchor = new Date()) {
  const { start, end } = getPeriodRange(period, anchor);
  if (period === 'daily') return formatDateKeyLabel(dateKeyFromDate(start));
  const last = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return `${formatDateKeyLabel(dateKeyFromDate(start))} - ${formatDateKeyLabel(dateKeyFromDate(last))}`;
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

function formatDateKeyLabel(dateKey) {
  const [year, month, day] = String(dateKey ?? '').split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function getLoanPaidAmount(loan) {
  return (Array.isArray(loan?.payments) ? loan.payments : []).reduce(
    (sum, payment) => sum + Math.abs(Number(payment.amount) || 0),
    0
  );
}

function getLoanRemainingAmount(loan) {
  if (loan?.status === 'settled' && getLoanPaidAmount(loan) <= 0) return 0;
  return Math.max(0, Math.abs(Number(loan?.amount) || 0) - getLoanPaidAmount(loan));
}

function isLoanSettled(loan) {
  return loan?.status === 'settled' || getLoanRemainingAmount(loan) <= 0;
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

function buildDraftFromTransaction(tx, categories) {
  const amount = Number(tx?.amount) || 0;
  const date = getTransactionDate(tx);
  const mode = amount >= 0 ? 'income' : 'expense';
  const modeCategories = categoriesForMode(mode, categories);
  const category = modeCategories.some((cat) => cat.id === tx?.category)
    ? tx.category
    : modeCategories[0]?.id ?? 'other';

  return {
    description: normalizeText(tx?.description),
    amount: String(Math.abs(amount)),
    category,
    date: dateKeyFromDate(date),
    time: timeKeyFromDate(date),
    note: normalizeText(tx?.note),
  };
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatSnapshotTime(value) {
  const time = Number(value) || 0;
  if (!time) return '';
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ExpenseScreen({
  transactions,
  customCategories,
  loanRecords,
  budgetRecords,
  moneyJars,
  assetSnapshot,
  onTransactionsChange,
  onCategoriesChange,
  onLoanRecordsChange,
  onBudgetRecordsChange,
  onMoneyJarsChange,
  onAssetSnapshotChange,
}) {
  const [draft, setDraft] = useState(buildInitialDraft);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [visibleMonth, setVisibleMonth] = useState(getMonthKey());
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(buildInitialDraft);
  const [editMode, setEditMode] = useState('expense');
  const [editError, setEditError] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiError, setAiError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [loanAiText, setLoanAiText] = useState('');
  const [loanAiBusy, setLoanAiBusy] = useState(false);
  const [loanAiStatus, setLoanAiStatus] = useState('');
  const [loanAiError, setLoanAiError] = useState('');
  const [budgetAiText, setBudgetAiText] = useState('');
  const [budgetAiBusy, setBudgetAiBusy] = useState(false);
  const [budgetAiStatus, setBudgetAiStatus] = useState('');
  const [budgetAiError, setBudgetAiError] = useState('');
  const [jarAiText, setJarAiText] = useState('');
  const [jarAiBusy, setJarAiBusy] = useState(false);
  const [jarAiStatus, setJarAiStatus] = useState('');
  const [jarAiError, setJarAiError] = useState('');
  const [assetAiText, setAssetAiText] = useState('');
  const [assetAiBusy, setAssetAiBusy] = useState(false);
  const [assetAiStatus, setAssetAiStatus] = useState('');
  const [assetAiError, setAssetAiError] = useState('');
  const [activeLedgerTab, setActiveLedgerTab] = useState('transactions');
  const canAdd = filter === 'expense' || filter === 'income';
  const isEditing = editingId != null;
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
  const editCategories = useMemo(
    () => categoriesForMode(editMode, allCategories),
    [allCategories, editMode]
  );
  const entryTitle = filter === 'income' ? 'Thêm thu nhập' : 'Thêm chi tiêu';
  const editTitle = editMode === 'income' ? 'Sửa thu nhập' : 'Sửa chi tiêu';
  const selectedEntryCategory = categoryById(draft.category, allCategories);
  const selectedEditCategory = categoryById(editDraft.category, allCategories);
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
  const allLoanRecords = useMemo(
    () => (Array.isArray(loanRecords) ? loanRecords : []),
    [loanRecords]
  );
  const allBudgetRecords = useMemo(
    () => (Array.isArray(budgetRecords) ? budgetRecords : []),
    [budgetRecords]
  );
  const allMoneyJars = useMemo(
    () => (Array.isArray(moneyJars) ? moneyJars : []),
    [moneyJars]
  );
  const currentAssetSnapshot = useMemo(() => {
    const snapshot =
      assetSnapshot && typeof assetSnapshot === 'object' ? assetSnapshot : {};
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    return {
      total: Math.max(0, Number(snapshot.total) || 0),
      items: items
        .map((item, index) => ({
          id: String(item?.id ?? `asset-${index}`),
          label: normalizeText(item?.label, 'Tai san'),
          amount: Math.max(0, Number(item?.amount) || 0),
        }))
        .filter((item) => item.amount > 0 || item.label),
      note: normalizeText(snapshot.note),
      updatedAt: Number(snapshot.updatedAt) || 0,
    };
  }, [assetSnapshot]);

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

  const sortedLoanRecords = useMemo(
    () =>
      [...allLoanRecords].sort(
        (a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
      ),
    [allLoanRecords]
  );

  const loanTotals = useMemo(
    () =>
      allLoanRecords.reduce(
        (acc, loan) => {
          const amount = getLoanRemainingAmount(loan);
          if (amount <= 0) return acc;
          if (loan.type === 'borrowed') acc.borrowed += amount;
          else acc.lent += amount;
          return acc;
        },
        { lent: 0, borrowed: 0 }
      ),
    [allLoanRecords]
  );

  const budgetRows = useMemo(() => {
    const activeBudgets = allBudgetRecords.filter(
      (budget) => budget.status !== 'disabled'
    );
    return activeBudgets
      .map((budget) => {
        const cat = categoryById(budget.category, allCategories);
        const range = getPeriodRange(budget.period, new Date());
        const spent = allTransactions.reduce((sum, tx) => {
          const amount = Number(tx.amount) || 0;
          if (amount >= 0) return sum;
          if (tx.category !== budget.category) return sum;
          const txDate = getTransactionDate(tx);
          if (txDate < range.start || txDate >= range.end) return sum;
          return sum + Math.abs(amount);
        }, 0);
        const limit = Math.max(0, Number(budget.limit) || 0);
        const remaining = Math.max(0, limit - spent);
        const progress = limit > 0 ? Math.min(1.5, spent / limit) : 0;
        return {
          ...budget,
          categoryInfo: cat,
          spent,
          remaining,
          progress,
          periodDateLabel: getPeriodDateLabel(budget.period, new Date()),
        };
      })
      .sort((a, b) => {
        const aOver = a.spent > a.limit ? 1 : 0;
        const bOver = b.spent > b.limit ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;
        return (b.progress ?? 0) - (a.progress ?? 0);
      });
  }, [allBudgetRecords, allCategories, allTransactions]);

  const activeJarRows = useMemo(() => {
    const monthlyIncome = totals.income;
    return allMoneyJars
      .filter((jar) => jar.status !== 'disabled')
      .map((jar) => {
        const categoryInfo = jar.category
          ? categoryById(jar.category, allCategories)
          : null;
        const allocated = Math.round((monthlyIncome * (Number(jar.percent) || 0)) / 100);
        const spent = jar.category
          ? monthTransactions.reduce((sum, tx) => {
              const amount = Number(tx.amount) || 0;
              if (amount >= 0 || tx.category !== jar.category) return sum;
              return sum + Math.abs(amount);
            }, 0)
          : 0;
        return {
          ...jar,
          categoryInfo,
          allocated,
          spent,
          remaining: Math.max(0, allocated - spent),
          progress: allocated > 0 ? Math.min(1.5, spent / allocated) : 0,
        };
      })
      .sort((a, b) => {
        const order = { critical: 0, important: 1, nice: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      });
  }, [allMoneyJars, allCategories, monthTransactions, totals.income]);

  const jarPercentTotal = useMemo(
    () =>
      activeJarRows.reduce(
        (sum, jar) => sum + Math.max(0, Number(jar.percent) || 0),
        0
      ),
    [activeJarRows]
  );

  const updateDraft = (key, value) => {
    setError('');
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditDraft = (key, value) => {
    setEditError('');
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditError('');
    setEditDraft(buildInitialDraft());
  };

  const handleFilterChange = (nextFilter) => {
    setError('');
    setCategoryOpen(false);
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

  const handleAiNote = async () => {
    const text = normalizeText(aiText);
    if (!text) {
      setAiError('Nhập nội dung như: bữa tối 100k, mua sắm 400k.');
      setAiStatus('');
      return;
    }

    const now = new Date();
    setAiBusy(true);
    setAiError('');
    setAiStatus('');
    try {
      const result = await fetchExpenseTransactionsFromAI({
        text,
        categories: allCategories.map((cat) => ({
          id: cat.id,
          label: cat.label,
          type: cat.type,
        })),
        dateKey: dateKeyFromDate(now),
        timeKey: timeKeyFromDate(now),
      });

      const createdAt = Date.now();
      const nextTransactions = result.transactions.map((tx, index) => {
        const dt =
          parseLocalDateTime(tx.date, tx.time) ??
          parseLocalDateTime(dateKeyFromDate(now), timeKeyFromDate(now)) ??
          now;
        return {
          id: `${createdAt}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          dateTime: dt.toISOString(),
          note: normalizeText(tx.note),
          createdAt: createdAt + index,
          generatedBy: 'openai_expense_note_v1',
        };
      });

      onTransactionsChange([...nextTransactions, ...allTransactions]);
      setVisibleMonth(getMonthKey(getTransactionDate(nextTransactions[0])));
      setAiText('');
      setAiStatus(
        result.message ||
          `Đã ghi ${nextTransactions.length} giao dịch từ nội dung AI.`
      );
    } catch (e) {
      setAiError(e?.message ?? 'AI chưa ghi được giao dịch. Thử lại sau.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleLoanAiNote = async () => {
    const text = normalizeText(loanAiText);
    if (!text) {
      setLoanAiError('Nhập nội dung như: cho Nam vay 500k, mượn Lan 1tr.');
      setLoanAiStatus('');
      return;
    }

    const now = new Date();
    setLoanAiBusy(true);
    setLoanAiError('');
    setLoanAiStatus('');
    try {
      const result = await fetchLoanRecordsFromAI({
        text,
        dateKey: dateKeyFromDate(now),
        openLoans: allLoanRecords
          .filter((loan) => getLoanRemainingAmount(loan) > 0)
          .map((loan) => ({
            type: loan.type,
            person: loan.person,
            amount: Math.abs(Number(loan.amount) || 0),
            remainingAmount: getLoanRemainingAmount(loan),
          })),
      });
      const createdAt = Date.now();
      let nextLoans = [...allLoanRecords];
      let createdCount = 0;
      let paymentCount = 0;

      for (const loan of result.loans) {
        if (loan.action === 'payment') {
          const expectedType =
            loan.paymentType === 'received'
              ? 'lent'
              : loan.paymentType === 'paid'
                ? 'borrowed'
                : loan.type;
          const personKey = loan.person.trim().toLowerCase();
          const candidates = nextLoans.filter((item) => {
            const samePerson =
              String(item.person ?? '').trim().toLowerCase() === personKey;
            const sameType = item.type === expectedType;
            return samePerson && sameType && getLoanRemainingAmount(item) > 0;
          });
          const fallbackCandidates = nextLoans.filter((item) => {
            const samePerson =
              String(item.person ?? '').trim().toLowerCase() === personKey;
            return samePerson && getLoanRemainingAmount(item) > 0;
          });
          const target = candidates[0] ?? fallbackCandidates[0];
          if (!target) {
            throw new Error(
              `Không tìm thấy khoản vay nợ đang mở của ${loan.person} để ghi trả tiền.`
            );
          }

          const payment = {
            id: `${createdAt}-payment-${paymentCount}-${Math.random().toString(36).slice(2, 8)}`,
            amount: loan.amount,
            date: loan.date,
            note: normalizeText(loan.note),
            createdAt: createdAt + paymentCount,
          };
          nextLoans = nextLoans.map((item) => {
            if (item.id !== target.id) return item;
            const payments = [...(Array.isArray(item.payments) ? item.payments : []), payment];
            const paid = payments.reduce(
              (sum, row) => sum + Math.abs(Number(row.amount) || 0),
              0
            );
            const settled = paid >= Math.abs(Number(item.amount) || 0);
            return {
              ...item,
              payments,
              status: settled ? 'settled' : 'open',
              settledAt: settled ? Date.now() : null,
            };
          });
          paymentCount += 1;
          continue;
        }

        nextLoans = [
          {
            id: `${createdAt}-loan-${createdCount}-${Math.random().toString(36).slice(2, 8)}`,
            type: loan.type,
            person: loan.person,
            amount: loan.amount,
            date: loan.date,
            dueDate: loan.dueDate,
            note: normalizeText(loan.note),
            payments: [],
            status: 'open',
            createdAt: createdAt + createdCount,
            settledAt: null,
            generatedBy: 'openai_loan_note_v1',
          },
          ...nextLoans,
        ];
        createdCount += 1;
      }

      onLoanRecordsChange?.(nextLoans);
      setLoanAiText('');
      setLoanAiStatus(
        result.message ||
          `Đã ghi ${createdCount} khoản vay nợ và ${paymentCount} lần trả.`
      );
    } catch (e) {
      setLoanAiError(e?.message ?? 'AI chưa ghi được khoản vay nợ. Thử lại sau.');
    } finally {
      setLoanAiBusy(false);
    }
  };

  const handleBudgetAiNote = async () => {
    const text = normalizeText(budgetAiText);
    if (!text) {
      setBudgetAiError('Nhập nội dung như: tháng này ăn uống 3tr, cà phê tuần này 300k.');
      setBudgetAiStatus('');
      return;
    }

    const now = new Date();
    setBudgetAiBusy(true);
    setBudgetAiError('');
    setBudgetAiStatus('');
    try {
      const result = await fetchBudgetRecordsFromAI({
        text,
        categories: allCategories.map((cat) => ({
          id: cat.id,
          label: cat.label,
          type: cat.type,
        })),
        currentBudgets: allBudgetRecords
          .filter((budget) => budget.status !== 'disabled')
          .map((budget) => ({
            period: budget.period,
            category: budget.category,
            categoryLabel: categoryById(budget.category, allCategories).label,
            limit: budget.limit,
          })),
        dateKey: dateKeyFromDate(now),
      });

      const createdAt = Date.now();
      let nextBudgets = [...allBudgetRecords];
      let createdCount = 0;
      let updatedCount = 0;
      for (const budget of result.budgets) {
        const existing = nextBudgets.find(
          (item) =>
            item.status !== 'disabled' &&
            item.period === budget.period &&
            item.category === budget.category
        );
        if (budget.action === 'update' && existing) {
          nextBudgets = nextBudgets.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  limit: budget.limit,
                  startDate: budget.startDate,
                  note: normalizeText(budget.note),
                  updatedAt: Date.now(),
                }
              : item
          );
          updatedCount += 1;
          continue;
        }

        nextBudgets = [
          {
            id: `${createdAt}-budget-${createdCount}-${Math.random().toString(36).slice(2, 8)}`,
            period: budget.period,
            category: budget.category,
            limit: budget.limit,
            startDate: budget.startDate,
            note: normalizeText(budget.note),
            status: 'active',
            createdAt: createdAt + createdCount,
            updatedAt: createdAt + createdCount,
            generatedBy: 'openai_budget_note_v1',
          },
          ...nextBudgets,
        ];
        createdCount += 1;
      }

      onBudgetRecordsChange?.(nextBudgets);
      setBudgetAiText('');
      setBudgetAiStatus(
        result.message ||
          `Đã tạo ${createdCount} và cập nhật ${updatedCount} ngân sách.`
      );
    } catch (e) {
      setBudgetAiError(e?.message ?? 'AI chưa thiết lập được ngân sách. Thử lại sau.');
    } finally {
      setBudgetAiBusy(false);
    }
  };

  const handleDisableBudget = (id) => {
    Alert.alert(
      'Xóa ngân sách?',
      'Ngân sách này sẽ bị ẩn khỏi danh sách theo dõi.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onBudgetRecordsChange?.(
              allBudgetRecords.map((budget) =>
                budget.id === id
                  ? { ...budget, status: 'disabled', updatedAt: Date.now() }
                  : budget
              )
            );
          },
        },
      ]
    );
  };

  const handleJarAiNote = async () => {
    const text = normalizeText(jarAiText);
    if (!text) {
      setJarAiError('Nhập nội dung như: chia lương 55% thiết yếu, 10% đi chơi người yêu.');
      setJarAiStatus('');
      return;
    }

    setJarAiBusy(true);
    setJarAiError('');
    setJarAiStatus('');
    try {
      const result = await fetchMoneyJarsFromAI({
        text,
        categories: allCategories.map((cat) => ({
          id: cat.id,
          label: cat.label,
          type: cat.type,
        })),
        currentJars: allMoneyJars
          .filter((jar) => jar.status !== 'disabled')
          .map((jar) => ({
            label: jar.label,
            percent: jar.percent,
            category: jar.category,
            priority: jar.priority,
          })),
      });

      const createdAt = Date.now();
      let nextJars = [...allMoneyJars];
      let createdCount = 0;
      let updatedCount = 0;
      for (const jar of result.jars) {
        const labelKey = jar.label.trim().toLowerCase();
        const existing = nextJars.find(
          (item) =>
            item.status !== 'disabled' &&
            String(item.label ?? '').trim().toLowerCase() === labelKey
        );
        if (jar.action === 'update' && existing) {
          nextJars = nextJars.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  percent: jar.percent,
                  category: jar.category,
                  priority: jar.priority,
                  note: normalizeText(jar.note),
                  updatedAt: Date.now(),
                }
              : item
          );
          updatedCount += 1;
          continue;
        }

        nextJars = [
          {
            id: `${createdAt}-jar-${createdCount}-${Math.random().toString(36).slice(2, 8)}`,
            label: jar.label,
            percent: jar.percent,
            category: jar.category,
            priority: jar.priority,
            note: normalizeText(jar.note),
            status: 'active',
            createdAt: createdAt + createdCount,
            updatedAt: createdAt + createdCount,
            generatedBy: 'openai_money_jar_v1',
          },
          ...nextJars,
        ];
        createdCount += 1;
      }

      onMoneyJarsChange?.(nextJars);
      setJarAiText('');
      setJarAiStatus(
        result.message || `Đã tạo ${createdCount} và cập nhật ${updatedCount} hũ.`
      );
    } catch (e) {
      setJarAiError(e?.message ?? 'AI chưa thiết lập được hũ tiền. Thử lại sau.');
    } finally {
      setJarAiBusy(false);
    }
  };

  const handleAssetAiNote = async () => {
    const text = normalizeText(assetAiText);
    if (!text) {
      setAssetAiError('Nhap tong tai san hien tai, vi du: tien mat 5tr, ngan hang 40tr, dau tu 20tr.');
      setAssetAiStatus('');
      return;
    }

    setAssetAiBusy(true);
    setAssetAiError('');
    setAssetAiStatus('');
    try {
      const result = await fetchAssetSnapshotFromAI({ text });
      const now = Date.now();
      const nextSnapshot = {
        total: result.snapshot.total,
        items: result.snapshot.items,
        note: normalizeText(result.snapshot.note),
        updatedAt: now,
        generatedBy: 'openai_asset_snapshot_v1',
      };

      onAssetSnapshotChange?.(nextSnapshot);
      setAssetAiText('');
      setAssetAiStatus(
        result.message || 'Da cap nhat tong tai san ca nhan.'
      );
    } catch (e) {
      setAssetAiError(e?.message ?? 'AI chua cap nhat duoc tong tai san. Thu lai sau.');
    } finally {
      setAssetAiBusy(false);
    }
  };

  const handleDisableJar = (id) => {
    Alert.alert(
      'Xóa hũ tiền?',
      'Hũ này sẽ bị ẩn khỏi chiến lược chia tiền.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onMoneyJarsChange?.(
              allMoneyJars.map((jar) =>
                jar.id === id
                  ? { ...jar, status: 'disabled', updatedAt: Date.now() }
                  : jar
              )
            );
          },
        },
      ]
    );
  };

  const handleSettleLoan = (id) => {
    onLoanRecordsChange?.(
      allLoanRecords.map((loan) =>
        loan.id === id && !isLoanSettled(loan)
          ? (() => {
              const remaining = getLoanRemainingAmount(loan);
              const now = Date.now();
              const payment = {
                id: `${now}-payment-full-${Math.random().toString(36).slice(2, 8)}`,
                amount: remaining,
                date: dateKeyFromDate(new Date()),
                note: 'Trả hết',
                createdAt: now,
              };
              return {
                ...loan,
                payments: [
                  ...(Array.isArray(loan.payments) ? loan.payments : []),
                  payment,
                ],
                status: 'settled',
                settledAt: now,
              };
            })()
          : loan
      )
    );
  };

  const handleDeleteLoan = (id) => {
    Alert.alert(
      'Xóa khoản vay nợ?',
      'Khoản vay nợ này sẽ bị xóa khỏi sổ vay nợ.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onLoanRecordsChange?.(
              allLoanRecords.filter((loan) => loan.id !== id)
            );
          },
        },
      ]
    );
  };

  const handleEdit = (tx) => {
    const amount = Number(tx?.amount) || 0;
    const mode = amount >= 0 ? 'income' : 'expense';
    const txDate = getTransactionDate(tx);

    setEditingId(tx.id);
    setEditMode(mode);
    setVisibleMonth(getMonthKey(txDate));
    setEditDraft(buildDraftFromTransaction(tx, allCategories));
    setEditCategoryOpen(false);
    setCategoryDraft('');
    setEditError('');
  };

  const handleEditModeChange = (nextMode) => {
    setEditMode(nextMode);
    setEditError('');
    setEditCategoryOpen(false);
    setEditDraft((prev) => {
      const nextCategories = categoriesForMode(nextMode, allCategories);
      if (nextCategories.some((cat) => cat.id === prev.category)) return prev;
      return { ...prev, category: nextCategories[0]?.id ?? 'other' };
    });
  };

  const handleSubmit = () => {
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

    const payload = {
      description,
      amount,
      category: draft.category,
      dateTime: dt.toISOString(),
      note: normalizeText(draft.note),
    };

    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...payload,
        createdAt: Date.now(),
      },
      ...allTransactions,
    ];
    onTransactionsChange(next);
    setDraft((prev) => ({
      ...buildInitialDraft(),
      category: prev.category,
    }));
    setManualOpen(false);
    setCategoryOpen(false);
  };

  const handleSaveEdit = () => {
    if (!isEditing) return;

    const description = normalizeText(editDraft.description);
    const rawAmount = parseAmount(editDraft.amount);
    const dt = parseLocalDateTime(editDraft.date, editDraft.time);
    const amount =
      rawAmount == null
        ? null
        : editMode === 'expense'
          ? -Math.abs(rawAmount)
          : Math.abs(rawAmount);

    if (!description) {
      setEditError('Nhập tên hoặc mô tả giao dịch.');
      return;
    }
    if (amount == null) {
      setEditError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!dt) {
      setEditError('Ngày giờ cần đúng dạng YYYY-MM-DD và HH:mm.');
      return;
    }

    const next = allTransactions.map((tx) =>
      tx.id === editingId
        ? {
            ...tx,
            description,
            amount,
            category: editDraft.category,
            dateTime: dt.toISOString(),
            note: normalizeText(editDraft.note),
            updatedAt: Date.now(),
          }
        : tx
    );
    onTransactionsChange(next);
    closeEditModal();
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Xóa giao dịch?',
      'Giao dịch này sẽ bị xóa khỏi danh sách.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            if (editingId === id) {
              closeEditModal();
            }
            onTransactionsChange(allTransactions.filter((tx) => tx.id !== id));
          },
        },
      ]
    );
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
                style={[
                  styles.navBtn,
                  activeLedgerTab !== 'transactions' && styles.navBtnDisabled,
                ]}
                disabled={activeLedgerTab !== 'transactions'}
              >
                <Text style={styles.navBtnText}>{'<'}</Text>
              </Pressable>
              <View style={styles.monthTitleWrap}>
                <Text style={styles.title}>Note chi phí</Text>
                <Text style={styles.monthTitle}>
                  {activeLedgerTab === 'transactions'
                    ? monthLabel(visibleMonth)
                    : activeLedgerTab === 'loans'
                      ? 'Sổ vay nợ riêng'
                      : activeLedgerTab === 'budgets'
                        ? 'Theo dõi ngân sách'
                        : 'Chiến lược chia hũ'}
                </Text>
              </View>
              <Pressable
                onPress={() => setVisibleMonth((m) => addMonthsToKey(m, 1))}
                style={[
                  styles.navBtn,
                  activeLedgerTab !== 'transactions' && styles.navBtnDisabled,
                ]}
                disabled={activeLedgerTab !== 'transactions'}
              >
                <Text style={styles.navBtnText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.ledgerTabs}>
              <Pressable
                style={[
                  styles.ledgerTabBtn,
                  activeLedgerTab === 'transactions' && styles.ledgerTabActive,
                ]}
                onPress={() => setActiveLedgerTab('transactions')}
              >
                <Text
                  style={[
                    styles.ledgerTabText,
                    activeLedgerTab === 'transactions' && styles.ledgerTabTextActive,
                  ]}
                >
                  Giao dịch
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ledgerTabBtn,
                  activeLedgerTab === 'loans' && styles.ledgerTabActive,
                ]}
                onPress={() => setActiveLedgerTab('loans')}
              >
                <Text
                  style={[
                    styles.ledgerTabText,
                    activeLedgerTab === 'loans' && styles.ledgerTabTextActive,
                  ]}
                >
                  Vay nợ
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ledgerTabBtn,
                  activeLedgerTab === 'budgets' && styles.ledgerTabActive,
                ]}
                onPress={() => setActiveLedgerTab('budgets')}
              >
                <Text
                  style={[
                    styles.ledgerTabText,
                    activeLedgerTab === 'budgets' && styles.ledgerTabTextActive,
                  ]}
                >
                  Ngân sách
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ledgerTabBtn,
                  activeLedgerTab === 'jars' && styles.ledgerTabActive,
                ]}
                onPress={() => setActiveLedgerTab('jars')}
              >
                <Text
                  style={[
                    styles.ledgerTabText,
                    activeLedgerTab === 'jars' && styles.ledgerTabTextActive,
                  ]}
                >
                  Hũ tiền
                </Text>
              </Pressable>
            </View>

            {activeLedgerTab === 'transactions' ? (
              <>
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
              </>
            ) : activeLedgerTab === 'loans' ? (
              <View style={styles.loanTotalRow}>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Người khác nợ mình</Text>
                  <Text style={[styles.totalValue, styles.incomeText]}>
                    {formatCurrency(loanTotals.lent)}
                  </Text>
                </View>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Mình đang nợ</Text>
                  <Text style={[styles.totalValue, styles.expenseText]}>
                    {formatCurrency(loanTotals.borrowed)}
                  </Text>
                </View>
              </View>
            ) : activeLedgerTab === 'budgets' ? (
              <View style={styles.loanTotalRow}>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Đang theo dõi</Text>
                  <Text style={[styles.totalValue, styles.incomeText]}>
                    {budgetRows.length} mục
                  </Text>
                </View>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Vượt ngân sách</Text>
                  <Text style={[styles.totalValue, styles.expenseText]}>
                    {budgetRows.filter((budget) => budget.spent > budget.limit).length} mục
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.loanTotalRow}>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Thu tháng này</Text>
                  <Text style={[styles.totalValue, styles.incomeText]}>
                    {formatCurrency(totals.income)}
                  </Text>
                </View>
                <View style={styles.loanTotalTile}>
                  <Text style={styles.totalLabel}>Đã chia</Text>
                  <Text
                    style={[
                      styles.totalValue,
                      jarPercentTotal > 100 ? styles.expenseText : styles.incomeText,
                    ]}
                  >
                    {Math.round(jarPercentTotal * 10) / 10}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {activeLedgerTab === 'transactions' ? (
          <View style={styles.aiCard}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>AI</Text>
              </View>
              <View style={styles.aiHeaderCopy}>
                <Text style={styles.aiTitle}>Hôm nay bạn đã chi tiêu gì?</Text>
                <Text style={styles.aiSubtitle}>Nhập tự nhiên, AI sẽ tự tách khoản và chọn danh mục.</Text>
              </View>
            </View>
            <TextInput
              value={aiText}
              onChangeText={(v) => {
                setAiText(v);
                setAiError('');
                setAiStatus('');
              }}
              placeholder="bữa tối 100k, mua sắm 400k"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.aiInput]}
              multiline
              editable={!aiBusy}
            />
            {aiError ? <Text style={styles.errorText}>{aiError}</Text> : null}
            {aiStatus ? <Text style={styles.aiStatusText}>{aiStatus}</Text> : null}
            <Pressable
              style={[styles.aiSubmitBtn, aiBusy && styles.disabledBtn]}
              onPress={handleAiNote}
              disabled={aiBusy}
            >
              {aiBusy ? (
                <ActivityIndicator color="#061516" />
              ) : (
                <Text style={styles.aiSubmitText}>AI ghi giao dịch</Text>
              )}
            </Pressable>
          </View>
          ) : null}

          {activeLedgerTab === 'loans' ? (
          <View style={styles.loanCard}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.loanAvatar}>
                <Text style={styles.loanAvatarText}>NỢ</Text>
              </View>
              <View style={styles.aiHeaderCopy}>
                <Text style={styles.aiTitle}>Sổ vay nợ riêng</Text>
                <Text style={styles.aiSubtitle}>
                  Chỉ ghi khoản cho vay hoặc mình đi vay, không tính vào chi tiêu.
                </Text>
              </View>
            </View>

            <TextInput
              value={loanAiText}
              onChangeText={(v) => {
                setLoanAiText(v);
                setLoanAiError('');
                setLoanAiStatus('');
              }}
              placeholder="cho Nam vay 500k, mượn Lan 1tr"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.aiInput]}
              multiline
              editable={!loanAiBusy}
            />
            {loanAiError ? (
              <Text style={styles.errorText}>{loanAiError}</Text>
            ) : null}
            {loanAiStatus ? (
              <Text style={styles.loanStatusText}>{loanAiStatus}</Text>
            ) : null}
            <Pressable
              style={[styles.loanSubmitBtn, loanAiBusy && styles.disabledBtn]}
              onPress={handleLoanAiNote}
              disabled={loanAiBusy}
            >
              {loanAiBusy ? (
                <ActivityIndicator color="#100b16" />
              ) : (
                <Text style={styles.loanSubmitText}>AI ghi vay nợ</Text>
              )}
            </Pressable>

            <View style={styles.loanList}>
              {sortedLoanRecords.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có khoản vay nợ nào.</Text>
              ) : (
                sortedLoanRecords.map((loan) => {
                  const settled = isLoanSettled(loan);
                  const borrowed = loan.type === 'borrowed';
                  const paidAmount = getLoanPaidAmount(loan);
                  const remainingAmount = getLoanRemainingAmount(loan);
                  const payments = Array.isArray(loan.payments) ? loan.payments : [];
                  return (
                    <View
                      key={loan.id}
                      style={[styles.loanRow, settled && styles.loanRowSettled]}
                    >
                      <View style={styles.loanBody}>
                        <View style={styles.txTopLine}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {borrowed
                              ? `Mình vay ${loan.person}`
                              : `${loan.person} nợ mình`}
                          </Text>
                          <Text
                            style={[
                              styles.txAmount,
                              remainingAmount > 0
                                ? borrowed
                                  ? styles.expenseText
                                  : styles.incomeText
                                : styles.txSettledText,
                            ]}
                          >
                            {remainingAmount > 0
                              ? formatCurrency(remainingAmount)
                              : 'Đã xong'}
                          </Text>
                        </View>
                        <Text style={styles.txMeta} numberOfLines={1}>
                          Gốc {formatCurrency(Number(loan.amount) || 0)} · đã trả{' '}
                          {formatCurrency(paidAmount)} · {formatDateKeyLabel(loan.date)}
                          {loan.dueDate
                            ? ` · hạn ${formatDateKeyLabel(loan.dueDate)}`
                            : ''}
                        </Text>
                        {loan.note ? (
                          <Text style={styles.txNote} numberOfLines={2}>
                            {loan.note}
                          </Text>
                        ) : null}
                        {payments.length > 0 ? (
                          <View style={styles.paymentList}>
                            {payments.map((payment, index) => (
                              <Text
                                key={payment.id ?? `${loan.id}-payment-${index}`}
                                style={styles.paymentText}
                                numberOfLines={1}
                              >
                                - Đợt {index + 1}: {formatCurrency(payment.amount)} ·{' '}
                                {formatDateKeyLabel(payment.date)}
                                {payment.note ? ` · ${payment.note}` : ''}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.loanActions}>
                        {!settled ? (
                          <Pressable
                            style={styles.loanSettleBtn}
                            onPress={() => handleSettleLoan(loan.id)}
                          >
                            <Text style={styles.loanSettleText}>Trả hết</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteLoan(loan.id)}
                          hitSlop={10}
                        >
                          <Text style={styles.deleteText}>×</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
          ) : null}

          {activeLedgerTab === 'budgets' ? (
          <View style={styles.budgetCard}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.budgetAvatar}>
                <Text style={styles.budgetAvatarText}>BDG</Text>
              </View>
              <View style={styles.aiHeaderCopy}>
                <Text style={styles.aiTitle}>Ngân sách chi tiêu</Text>
                <Text style={styles.aiSubtitle}>
                  Đặt giới hạn ngày, tuần, tháng. App tự tính đã dùng từ giao dịch thật.
                </Text>
              </View>
            </View>

            <TextInput
              value={budgetAiText}
              onChangeText={(v) => {
                setBudgetAiText(v);
                setBudgetAiError('');
                setBudgetAiStatus('');
              }}
              placeholder="tháng này ăn uống 3tr, cà phê tuần này 300k"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.aiInput]}
              multiline
              editable={!budgetAiBusy}
            />
            {budgetAiError ? (
              <Text style={styles.errorText}>{budgetAiError}</Text>
            ) : null}
            {budgetAiStatus ? (
              <Text style={styles.budgetStatusText}>{budgetAiStatus}</Text>
            ) : null}
            <Pressable
              style={[styles.budgetSubmitBtn, budgetAiBusy && styles.disabledBtn]}
              onPress={handleBudgetAiNote}
              disabled={budgetAiBusy}
            >
              {budgetAiBusy ? (
                <ActivityIndicator color="#171005" />
              ) : (
                <Text style={styles.budgetSubmitText}>AI đặt ngân sách</Text>
              )}
            </Pressable>

            <View style={styles.budgetList}>
              {budgetRows.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có ngân sách nào.</Text>
              ) : (
                budgetRows.map((budget) => {
                  const over = budget.spent > budget.limit;
                  const percent = Math.round((budget.progress || 0) * 100);
                  return (
                    <View key={budget.id} style={styles.budgetRow}>
                      <View style={styles.budgetTopLine}>
                        <View style={styles.budgetTitleWrap}>
                          <Text
                            style={[
                              styles.categoryIcon,
                              { color: budget.categoryInfo.color },
                            ]}
                          >
                            {budget.categoryInfo.icon}
                          </Text>
                          <View style={styles.budgetNameWrap}>
                            <Text style={styles.txTitle} numberOfLines={1}>
                              {budget.categoryInfo.label}
                            </Text>
                            <Text style={styles.txMeta} numberOfLines={1}>
                              {periodLabel(budget.period)} · {budget.periodDateLabel}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.txAmount,
                            over ? styles.expenseText : styles.incomeText,
                          ]}
                        >
                          {percent}%
                        </Text>
                      </View>
                      <View style={styles.budgetProgressTrack}>
                        <View
                          style={[
                            styles.budgetProgressFill,
                            over && styles.budgetProgressOver,
                            { width: `${Math.min(100, percent)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.txMeta}>
                        Đã dùng {formatCurrency(budget.spent)} /{' '}
                        {formatCurrency(budget.limit)} · còn{' '}
                        {formatCurrency(budget.remaining)}
                      </Text>
                      {budget.note ? (
                        <Text style={styles.txNote} numberOfLines={2}>
                          {budget.note}
                        </Text>
                      ) : null}
                      <Pressable
                        style={styles.budgetDeleteBtn}
                        onPress={() => handleDisableBudget(budget.id)}
                      >
                        <Text style={styles.budgetDeleteText}>Xóa ngân sách</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>
          ) : null}

          {activeLedgerTab === 'jars' ? (
          <View style={styles.jarCard}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.jarAvatar}>
                <Text style={styles.jarAvatarText}>JAR</Text>
              </View>
              <View style={styles.aiHeaderCopy}>
                <Text style={styles.aiTitle}>Chiến lược chia hũ</Text>
                <Text style={styles.aiSubtitle}>
                  AI giúp chia % thu nhập tháng: thiết yếu, tích lũy, đầu tư, đi chơi người yêu.
                </Text>
              </View>
            </View>

            <View style={styles.assetBox}>
              <View style={styles.assetTopLine}>
                <View style={styles.assetTitleWrap}>
                  <Text style={styles.assetLabel}>Tong tai san ca nhan</Text>
                  <Text style={styles.txMeta}>
                    {currentAssetSnapshot.updatedAt
                      ? `Cap nhat ${formatSnapshotTime(currentAssetSnapshot.updatedAt)}`
                      : 'Chua cap nhat'}
                  </Text>
                </View>
                <Text style={styles.assetValue}>
                  {formatCurrency(currentAssetSnapshot.total)}
                </Text>
              </View>

              {currentAssetSnapshot.items.length > 0 ? (
                <View style={styles.assetItemList}>
                  {currentAssetSnapshot.items.slice(0, 8).map((item) => (
                    <View key={item.id} style={styles.assetItemRow}>
                      <Text style={styles.assetItemLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={styles.assetItemAmount}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.txMeta}>
                  Ghi nhanh bang AI: tien mat, ngan hang, dau tu, tiet kiem...
                </Text>
              )}

              {currentAssetSnapshot.note ? (
                <Text style={styles.txNote} numberOfLines={2}>
                  {currentAssetSnapshot.note}
                </Text>
              ) : null}

              <TextInput
                value={assetAiText}
                onChangeText={(v) => {
                  setAssetAiText(v);
                  setAssetAiError('');
                  setAssetAiStatus('');
                }}
                placeholder="vi du: tien mat 5tr, ngan hang 40tr, dau tu 20tr, tiet kiem 15tr"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.assetInput]}
                multiline
                editable={!assetAiBusy}
              />
              {assetAiError ? <Text style={styles.errorText}>{assetAiError}</Text> : null}
              {assetAiStatus ? (
                <Text style={styles.assetStatusText}>{assetAiStatus}</Text>
              ) : null}
              <Pressable
                style={[styles.assetSubmitBtn, assetAiBusy && styles.disabledBtn]}
                onPress={handleAssetAiNote}
                disabled={assetAiBusy}
              >
                {assetAiBusy ? (
                  <ActivityIndicator color="#071416" />
                ) : (
                  <Text style={styles.assetSubmitText}>AI cap nhat tai san</Text>
                )}
              </Pressable>
            </View>

            <TextInput
              value={jarAiText}
              onChangeText={(v) => {
                setJarAiText(v);
                setJarAiError('');
                setJarAiStatus('');
              }}
              placeholder="lên chiến lược: 50% thiết yếu, 20% tích lũy, 10% đi chơi người yêu"
              placeholderTextColor="#6f6a7d"
              style={[styles.input, styles.aiInput]}
              multiline
              editable={!jarAiBusy}
            />
            {jarAiError ? <Text style={styles.errorText}>{jarAiError}</Text> : null}
            {jarAiStatus ? (
              <Text style={styles.jarStatusText}>{jarAiStatus}</Text>
            ) : null}
            <Pressable
              style={[styles.jarSubmitBtn, jarAiBusy && styles.disabledBtn]}
              onPress={handleJarAiNote}
              disabled={jarAiBusy}
            >
              {jarAiBusy ? (
                <ActivityIndicator color="#05130e" />
              ) : (
                <Text style={styles.jarSubmitText}>AI lên chiến lược hũ</Text>
              )}
            </Pressable>

            <View style={styles.jarSummaryBox}>
              <Text style={styles.txMeta}>
                Tổng thu tháng này: {formatCurrency(totals.income)} · đã phân bổ{' '}
                {Math.round(jarPercentTotal * 10) / 10}%
              </Text>
              {jarPercentTotal > 100 ? (
                <Text style={styles.errorText}>
                  Tổng hũ đang vượt 100%, nên nhờ AI cân lại tỷ lệ.
                </Text>
              ) : null}
            </View>

            <View style={styles.budgetList}>
              {activeJarRows.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có hũ tiền nào.</Text>
              ) : (
                activeJarRows.map((jar) => {
                  const tracked = Boolean(jar.categoryInfo);
                  const over = tracked && jar.spent > jar.allocated;
                  const percent = Math.round((jar.progress || 0) * 100);
                  return (
                    <View key={jar.id} style={styles.jarRow}>
                      <View style={styles.budgetTopLine}>
                        <View style={styles.budgetTitleWrap}>
                          <Text style={styles.jarIcon}>
                            {jar.priority === 'critical'
                              ? '🛡️'
                              : jar.priority === 'nice'
                                ? '✨'
                                : '📌'}
                          </Text>
                          <View style={styles.budgetNameWrap}>
                            <Text style={styles.txTitle} numberOfLines={1}>
                              {jar.label}
                            </Text>
                            <Text style={styles.txMeta} numberOfLines={1}>
                              {jar.percent}% thu nhập
                              {tracked ? ` · ${jar.categoryInfo.label}` : ' · tích lũy'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.txAmount, over ? styles.expenseText : styles.incomeText]}>
                          {formatCurrency(jar.allocated)}
                        </Text>
                      </View>
                      {tracked ? (
                        <>
                          <View style={styles.budgetProgressTrack}>
                            <View
                              style={[
                                styles.jarProgressFill,
                                over && styles.budgetProgressOver,
                                { width: `${Math.min(100, percent)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.txMeta}>
                            Đã chi {formatCurrency(jar.spent)} · còn{' '}
                            {formatCurrency(jar.remaining)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.txMeta}>
                          Gợi ý chuyển vào hũ/tài khoản riêng mỗi tháng.
                        </Text>
                      )}
                      {jar.note ? (
                        <Text style={styles.txNote} numberOfLines={2}>
                          {jar.note}
                        </Text>
                      ) : null}
                      <Pressable
                        style={styles.jarDeleteBtn}
                        onPress={() => handleDisableJar(jar.id)}
                      >
                        <Text style={styles.jarDeleteText}>Xóa hũ</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>
          ) : null}

          {activeLedgerTab === 'transactions' && canAdd ? (
            <Pressable
              style={styles.manualToggle}
              onPress={() => setManualOpen((open) => !open)}
            >
              <Text style={styles.manualToggleText}>
                {manualOpen ? 'Ẩn nhập tay' : 'Nhập tay khi cần'}
              </Text>
              <Text style={styles.manualToggleIcon}>{manualOpen ? '−' : '+'}</Text>
            </Pressable>
          ) : null}

          {activeLedgerTab === 'transactions' && manualOpen && canAdd ? (
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
              <Pressable
                style={styles.categorySummaryRow}
                onPress={() => setCategoryOpen((open) => !open)}
              >
                <View style={styles.selectedCategoryPill}>
                  <Text
                    style={[
                      styles.categoryIcon,
                      { color: selectedEntryCategory.color },
                    ]}
                  >
                    {selectedEntryCategory.icon}
                  </Text>
                  <Text style={styles.selectedCategoryText}>
                    {selectedEntryCategory.label}
                  </Text>
                </View>
                <Text style={styles.categoryToggleText}>
                  {categoryOpen ? 'Thu gọn' : 'Mở danh mục'}
                </Text>
              </Pressable>
              {categoryOpen ? (
                <>
                  <View style={styles.optionWrap}>
                    {entryCategories.map((cat) => {
                      const active = draft.category === cat.id;
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => {
                            updateDraft('category', cat.id);
                            setCategoryOpen(false);
                          }}
                          style={[
                            styles.categoryBtn,
                            active && {
                              borderColor: cat.color,
                              backgroundColor: '#171923',
                            },
                          ]}
                        >
                          <Text style={[styles.categoryIcon, { color: cat.color }]}>
                            {cat.icon}
                          </Text>
                          <Text
                            style={[
                              styles.optionText,
                              active && styles.optionTextActive,
                            ]}
                          >
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
                    <Pressable
                      style={styles.categoryAddBtn}
                      onPress={handleAddCategory}
                    >
                      <Text style={styles.categoryAddText}>Thêm</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

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
                onPress={handleSubmit}
              >
                <Text style={styles.addBtnText}>{entryTitle}</Text>
              </Pressable>
            </View>
          ) : null}

          {activeLedgerTab === 'transactions' ? (
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
                    const active = editingId === tx.id;
                    return (
                      <View
                        key={tx.id}
                        style={[styles.txRow, active && styles.txRowEditing]}
                      >
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
                        <View style={styles.txActions}>
                          <Pressable
                            onPress={() => handleEdit(tx)}
                            hitSlop={8}
                            style={styles.editBtn}
                          >
                            <Text style={styles.editText}>Sửa</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(tx.id)}
                            hitSlop={10}
                            style={styles.deleteBtn}
                          >
                            <Text style={styles.deleteText}>×</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={isEditing}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTitle}</Text>
              <Pressable onPress={closeEditModal} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.filterRow}>
                {FILTERS.filter((item) => item.id !== 'all').map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleEditModeChange(item.id)}
                    style={[
                      styles.filterBtn,
                      editMode === item.id && styles.filterBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        editMode === item.id && styles.filterTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={editDraft.description}
                onChangeText={(v) => updateEditDraft('description', v)}
                placeholder="Tên/mô tả giao dịch"
                placeholderTextColor="#6f6a7d"
                style={styles.input}
              />
              <TextInput
                value={editDraft.amount}
                onChangeText={(v) => updateEditDraft('amount', v)}
                placeholder="Số tiền"
                placeholderTextColor="#6f6a7d"
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Danh mục</Text>
              <Pressable
                style={styles.categorySummaryRow}
                onPress={() => setEditCategoryOpen((open) => !open)}
              >
                <View style={styles.selectedCategoryPill}>
                  <Text
                    style={[
                      styles.categoryIcon,
                      { color: selectedEditCategory.color },
                    ]}
                  >
                    {selectedEditCategory.icon}
                  </Text>
                  <Text style={styles.selectedCategoryText}>
                    {selectedEditCategory.label}
                  </Text>
                </View>
                <Text style={styles.categoryToggleText}>
                  {editCategoryOpen ? 'Thu gọn' : 'Mở danh mục'}
                </Text>
              </Pressable>
              {editCategoryOpen ? (
                <View style={styles.optionWrap}>
                  {editCategories.map((cat) => {
                    const active = editDraft.category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          updateEditDraft('category', cat.id);
                          setEditCategoryOpen(false);
                        }}
                        style={[
                          styles.categoryBtn,
                          active && {
                            borderColor: cat.color,
                            backgroundColor: '#171923',
                          },
                        ]}
                      >
                        <Text style={[styles.categoryIcon, { color: cat.color }]}>
                          {cat.icon}
                        </Text>
                        <Text
                          style={[
                            styles.optionText,
                            active && styles.optionTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.dateRow}>
                <TextInput
                  value={editDraft.date}
                  onChangeText={(v) => updateEditDraft('date', v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.dateInput]}
                />
                <TextInput
                  value={editDraft.time}
                  onChangeText={(v) => updateEditDraft('time', v)}
                  placeholder="HH:mm"
                  placeholderTextColor="#6f6a7d"
                  style={[styles.input, styles.timeInput]}
                />
              </View>

              <TextInput
                value={editDraft.note}
                onChangeText={(v) => updateEditDraft('note', v)}
                placeholder="Ghi chú tùy chọn"
                placeholderTextColor="#6f6a7d"
                style={[styles.input, styles.noteInput]}
                multiline
              />

              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancelBtn} onPress={closeEditModal}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalSaveBtn,
                    editMode === 'expense' && styles.addExpenseBtn,
                  ]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.addBtnText}>Lưu</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  navBtnDisabled: {
    opacity: 0.35,
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
  ledgerTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ledgerTabBtn: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
  },
  ledgerTabActive: {
    borderColor: '#f5c842',
    backgroundColor: '#211c0d',
  },
  ledgerTabText: {
    color: '#8585a3',
    fontSize: 13,
    fontWeight: '900',
  },
  ledgerTabTextActive: {
    color: '#ffffff',
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
  aiCard: {
    backgroundColor: '#071416',
    borderWidth: 1,
    borderColor: '#164e52',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  loanCard: {
    backgroundColor: '#100b16',
    borderWidth: 1,
    borderColor: '#4c1d55',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  budgetCard: {
    backgroundColor: '#171005',
    borderWidth: 1,
    borderColor: '#4a300b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  jarCard: {
    backgroundColor: '#05130e',
    borderWidth: 1,
    borderColor: '#14532d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2dd4bf',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  aiAvatarText: {
    color: '#67e8f9',
    fontSize: 13,
    fontWeight: '900',
  },
  loanAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e879f9',
    backgroundColor: 'rgba(232, 121, 249, 0.12)',
  },
  loanAvatarText: {
    color: '#f0abfc',
    fontSize: 12,
    fontWeight: '900',
  },
  budgetAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  budgetAvatarText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '900',
  },
  jarAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  jarAvatarText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '900',
  },
  aiHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  aiTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  aiSubtitle: {
    color: '#8db7ba',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  aiInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  assetBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#164e52',
    backgroundColor: '#071416',
    padding: 10,
    marginBottom: 12,
  },
  assetTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  assetTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  assetLabel: {
    color: '#cffafe',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  assetValue: {
    color: '#67e8f9',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  assetItemList: {
    gap: 6,
    marginBottom: 8,
  },
  assetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  assetItemLabel: {
    flex: 1,
    minWidth: 0,
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '700',
  },
  assetItemAmount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  assetInput: {
    minHeight: 64,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  assetStatusText: {
    color: '#67e8f9',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  assetSubmitBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2dd4bf',
    backgroundColor: '#67e8f9',
  },
  assetSubmitText: {
    color: '#071416',
    fontSize: 13,
    fontWeight: '900',
  },
  aiStatusText: {
    color: '#67e8f9',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  aiSubmitBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2dd4bf',
    backgroundColor: '#67e8f9',
  },
  aiSubmitText: {
    color: '#061516',
    fontSize: 13,
    fontWeight: '900',
  },
  loanTotalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  loanTotalTile: {
    flex: 1,
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b2144',
    backgroundColor: '#15101c',
    padding: 10,
    justifyContent: 'center',
  },
  loanStatusText: {
    color: '#f0abfc',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  loanSubmitBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e879f9',
    backgroundColor: '#f0abfc',
  },
  loanSubmitText: {
    color: '#100b16',
    fontSize: 13,
    fontWeight: '900',
  },
  budgetStatusText: {
    color: '#facc15',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  budgetSubmitBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#facc15',
  },
  budgetSubmitText: {
    color: '#171005',
    fontSize: 13,
    fontWeight: '900',
  },
  jarStatusText: {
    color: '#86efac',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontWeight: '700',
  },
  jarSubmitBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
    backgroundColor: '#86efac',
  },
  jarSubmitText: {
    color: '#05130e',
    fontSize: 13,
    fontWeight: '900',
  },
  jarSummaryBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#14532d',
    backgroundColor: '#0a1c14',
    padding: 10,
    marginTop: 12,
  },
  budgetList: {
    marginTop: 12,
    gap: 10,
  },
  budgetRow: {
    borderTopWidth: 1,
    borderTopColor: '#3b260b',
    paddingTop: 10,
  },
  jarRow: {
    borderTopWidth: 1,
    borderTopColor: '#124126',
    paddingTop: 10,
  },
  budgetTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  budgetTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  budgetNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  budgetProgressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#2a1b09',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#34d399',
  },
  budgetProgressOver: {
    backgroundColor: '#fb7185',
  },
  jarProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#22c55e',
  },
  jarIcon: {
    fontSize: 15,
    marginRight: 6,
    marginTop: 1,
  },
  budgetDeleteBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a300b',
    backgroundColor: '#1f1609',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  budgetDeleteText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '900',
  },
  jarDeleteBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#14532d',
    backgroundColor: '#0a1c14',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  jarDeleteText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '900',
  },
  loanList: {
    marginTop: 12,
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#2d1836',
    paddingTop: 10,
    paddingBottom: 2,
  },
  loanRowSettled: {
    opacity: 0.56,
  },
  loanBody: {
    flex: 1,
    minWidth: 0,
  },
  loanActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  loanSettleBtn: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4c1d55',
    backgroundColor: '#181020',
    paddingHorizontal: 8,
  },
  loanSettleText: {
    color: '#f0abfc',
    fontSize: 11,
    fontWeight: '900',
  },
  paymentList: {
    marginTop: 6,
    gap: 2,
  },
  paymentText: {
    color: '#b9a8c5',
    fontSize: 10,
    lineHeight: 15,
  },
  disabledBtn: {
    opacity: 0.72,
  },
  manualToggle: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a44',
    backgroundColor: '#101018',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  manualToggleText: {
    color: '#f5c842',
    fontSize: 13,
    fontWeight: '900',
  },
  manualToggleIcon: {
    color: '#f5c842',
    fontSize: 18,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a44',
    backgroundColor: '#080816',
    overflow: 'hidden',
  },
  modalHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1d1d36',
    paddingHorizontal: 14,
  },
  modalTitle: {
    flex: 1,
    minWidth: 0,
    color: '#f5c842',
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#101018',
  },
  modalCloseText: {
    color: '#fb7185',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalContent: {
    padding: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#454568',
    backgroundColor: '#101018',
  },
  modalCancelText: {
    color: '#c4c4dd',
    fontSize: 13,
    fontWeight: '900',
  },
  modalSaveBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
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
  categorySummaryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  selectedCategoryPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryText: {
    flex: 1,
    minWidth: 0,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryToggleText: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '900',
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
  txRowEditing: {
    borderBottomColor: '#f5c842',
    backgroundColor: 'rgba(245, 200, 66, 0.06)',
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
  txSettledText: {
    color: '#8585a3',
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
  txActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  editBtn: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a44',
    backgroundColor: '#101018',
    paddingHorizontal: 8,
  },
  editText: {
    color: '#f5c842',
    fontSize: 11,
    fontWeight: '900',
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
