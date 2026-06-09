import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDaysToKey, getTodayKey } from '../utils/rpg';
import {
  fetchAssetGoalsFromAI,
  fetchAssetSnapshotFromAI,
  fetchExpenseTransactionsFromAI,
  fetchBudgetRecordsFromAI,
  fetchLoanRecordsFromAI,
  fetchMoneyJarsFromAI,
} from '../utils/aiCoach';
import GiaoDichTab from './chiPhiTabs/GiaoDichTab';
import BaoCaoTab from './chiPhiTabs/BaoCaoTab';
import VayNoTab from './chiPhiTabs/VayNoTab';
import NganSachTab from './chiPhiTabs/NganSachTab';
import HuTienTab from './chiPhiTabs/HuTienTab';
import TaiSanTab from './chiPhiTabs/TaiSanTab';
import GhiTienVaoHu from './hopThoaiChiPhi/GhiTienVaoHu';
import SuaHuTien from './hopThoaiChiPhi/SuaHuTien';
import ChiTietTaiSan from './hopThoaiChiPhi/ChiTietTaiSan';
import SuaTaiSan from './hopThoaiChiPhi/SuaTaiSan';
import XacNhanDanhMucAi from './hopThoaiChiPhi/XacNhanDanhMucAi';
import SuaVayNo from './hopThoaiChiPhi/SuaVayNo';
import SuaNganSach from './hopThoaiChiPhi/SuaNganSach';
import SuaGiaoDich from './hopThoaiChiPhi/SuaGiaoDich';
import GiaoDichDinhKyTab from './chiPhiTabs/GiaoDichDinhKyTab';
import SuaGiaoDichDinhKy from './hopThoaiChiPhi/SuaGiaoDichDinhKy';
import LichSuHuTien from './hopThoaiChiPhi/LichSuHuTien';

const EXPENSE_IMAGES = {
  header: require('../../assets/images/expenses/expense_header_bg.png'),
  transactions: require('../../assets/images/expenses/expense_transactions.png'),
  report: require('../../assets/images/expenses/expense_report.png'),
  loans: require('../../assets/images/expenses/expense_loans.png'),
  budget: require('../../assets/images/expenses/expense_budget.png'),
  jars: require('../../assets/images/expenses/expense_jars.png'),
  assets: require('../../assets/images/expenses/expense_assets.png'),
};

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
  { id: 'loan', label: 'Vay nợ' },
];

const AI_CATEGORY_CONFIRM_THRESHOLD = 0.78;

const ESSENTIAL_JAR_CATEGORY_IDS = [
  'food',
  'breakfast',
  'lunch',
  'dinner',
  'groceries_market',
  'supermarket_food',
  'drinks',
  'transport',
  'fuel',
  'parking',
  'ride_hailing',
  'public_transport',
  'housing_rent',
  'electricity',
  'water_bill',
  'internet_bill',
  'gas_bill',
  'apartment_fee',
  'healthcare',
  'medical_checkup',
  'medicine',
  'unexpected_expense',
];

const LOAN_TYPES = [
  { id: 'lent', label: 'Người khác nợ mình' },
  { id: 'borrowed', label: 'Mình đang nợ' },
  { id: 'held', label: 'Người khác giữ/cầm hộ' },
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

function addMonthsToDateKey(dateKey, delta) {
  const d = parseDateKey(dateKey) ?? new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.max(0, Math.round(Number(delta) || 0)));
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return dateKeyFromDate(d);
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function monthsUntilDate(dateKey) {
  const target = parseDateKey(dateKey);
  if (!target) return 0;
  const today = startOfDay(new Date());
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth()) +
    (target.getDate() >= today.getDate() ? 1 : 0);
  return Math.max(0, months);
}

function monthsLeftLabel(months) {
  const safeMonths = Math.max(0, Math.round(Number(months) || 0));
  if (safeMonths <= 0) return 'Đến hạn';
  if (safeMonths < 12) return `Còn ${safeMonths} tháng`;
  const years = Math.floor(safeMonths / 12);
  const rest = safeMonths % 12;
  return rest > 0 ? `Còn ${years} năm ${rest} tháng` : `Còn ${years} năm`;
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

function isLegacyLoanRecord(loan) {
  if (loan?.dateUnknown) return true;
  const note = normalizeComparableText(loan?.note);
  return /\b(ngay xua|lau roi|truoc day|khong nho)\b/.test(note);
}

function getLoanAssetCashFlowAmount(loan) {
  if (!loan || typeof loan !== 'object' || loan.type === 'held') return 0;
  const principal = Math.abs(Number(loan.amount) || 0);
  let total = isLegacyLoanRecord(loan)
    ? 0
    : loan.type === 'borrowed'
      ? principal
      : -principal;

  for (const payment of Array.isArray(loan.payments) ? loan.payments : []) {
    const amount = Math.abs(Number(payment.amount) || 0);
    if (!amount) continue;
    total += loan.type === 'borrowed' ? -amount : amount;
  }

  return total;
}

function loanDateTimeIso(dateKey, fallbackMs = Date.now()) {
  const date = parseDateKey(dateKey);
  if (!date) return new Date(fallbackMs).toISOString();
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function buildLoanCashFlowTransactions(loans) {
  const rows = [];
  for (const loan of Array.isArray(loans) ? loans : []) {
    if (!loan || typeof loan !== 'object') continue;
    const amount = Math.abs(Number(loan.amount) || 0);
    if (!amount) continue;
    const borrowed = loan.type === 'borrowed';
    const held = loan.type === 'held';
    const person = normalizeText(loan.person, 'người khác');
    rows.push({
      id: `loan-flow-${loan.id}-principal`,
      description: borrowed
        ? `Vay ${person}`
        : held
          ? `Gửi ${person} giữ hộ`
          : `Cho ${person} vay`,
      amount: borrowed ? amount : -amount,
      category: borrowed ? 'income_other' : 'debt_payment',
      dateTime: loanDateTimeIso(loan.date, Number(loan.createdAt) || Date.now()),
      note: normalizeText(loan.note, 'Tự động từ sổ vay nợ'),
      createdAt: Number(loan.createdAt) || 0,
      source: 'loan',
      loanId: loan.id,
      dateUnknown: Boolean(loan.dateUnknown),
      readonly: true,
    });

    const payments = Array.isArray(loan.payments) ? loan.payments : [];
    for (const payment of payments) {
      const paymentAmount = Math.abs(Number(payment.amount) || 0);
      if (!paymentAmount) continue;
      rows.push({
        id: `loan-flow-${loan.id}-payment-${payment.id}`,
        description: borrowed
          ? `Trả nợ ${person}`
          : held
            ? `Lấy lại từ ${person}`
            : `${person} trả nợ`,
        amount: borrowed ? -paymentAmount : paymentAmount,
        category: borrowed ? 'debt_payment' : 'income_other',
        dateTime: loanDateTimeIso(
          payment.date,
          Number(payment.createdAt) || Number(loan.createdAt) || Date.now()
        ),
        note: normalizeText(payment.note, 'Tự động từ sổ vay nợ'),
        createdAt: Number(payment.createdAt) || Number(loan.createdAt) || 0,
        source: 'loan',
        loanId: loan.id,
        dateUnknown: false,
        readonly: true,
      });
    }
  }
  return rows;
}

function buildLoanEditDraft(loan) {
  const paymentDrafts = (Array.isArray(loan?.payments) ? loan.payments : []).map(
    (payment, index) => {
      const createdAt = Number(payment?.createdAt) || Date.now() + index;
      return {
        id: String(payment?.id ?? `${createdAt}-payment-${index}`),
        amount: String(Math.abs(Number(payment?.amount) || 0)),
        date: normalizeText(payment?.date, getTodayKey()),
        note: normalizeText(payment?.note),
        createdAt,
      };
    }
  );

  return {
    type:
      loan?.type === 'borrowed' ? 'borrowed' : loan?.type === 'held' ? 'held' : 'lent',
    person: normalizeText(loan?.person),
    amount: String(Math.abs(Number(loan?.amount) || 0)),
    date: normalizeText(loan?.date, getTodayKey()),
    dateUnknown: Boolean(loan?.dateUnknown),
    dueDate: normalizeText(loan?.dueDate),
    note: normalizeText(loan?.note),
    paymentAmount: '',
    paymentDate: getTodayKey(),
    paymentNote: '',
    paymentDrafts,
  };
}

function buildAssetEditDraft(item) {
  return {
    label: normalizeText(item?.label),
    amount: String(Math.abs(Number(item?.amount) || 0)),
    location: normalizeText(item?.location),
    note: normalizeText(item?.note),
  };
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

function normalizeComparableText(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
}

function getDefaultJarCategoryIds(jar) {
  const label = normalizeComparableText(jar?.label);
  const existing = Array.isArray(jar?.categoryIds)
    ? jar.categoryIds.map((id) => normalizeText(id)).filter(Boolean)
    : [];
  if (existing.length > 0) return Array.from(new Set(existing));
  const category = normalizeText(jar?.category);
  if (category) return [category];
  if (label.includes('thiet yeu')) return ESSENTIAL_JAR_CATEGORY_IDS;
  if (label.includes('nguoi yeu') || label.includes('date')) return ['dating'];
  return [];
}

function getDefaultJarTrackingMode(jar, categoryIds) {
  const label = normalizeComparableText(jar?.label);
  if (label.includes('thiet yeu')) return 'categories';
  if (jar?.trackingMode === 'manual') return 'manual';
  if (jar?.trackingMode === 'categories') return 'categories';
  if (
    label.includes('du phong') ||
    label.includes('dau tu') ||
    label.includes('tich luy')
  ) {
    return 'manual';
  }
  return categoryIds.length > 0 ? 'categories' : 'manual';
}

function buildBudgetEditDraft(budget) {
  return {
    limit: String(Math.max(0, Number(budget?.limit) || 0)),
    period: budget?.period === 'daily' || budget?.period === 'weekly' ? budget.period : 'monthly',
    category: normalizeText(budget?.category, 'food'),
    note: normalizeText(budget?.note),
  };
}

function buildJarEditDraft(jar) {
  const categoryIds = getDefaultJarCategoryIds(jar);
  return {
    label: normalizeText(jar?.label),
    percent: String(Math.max(0, Number(jar?.percent) || 0)),
    trackingMode: getDefaultJarTrackingMode(jar, categoryIds),
    categoryIds,
    priority:
      jar?.priority === 'critical' || jar?.priority === 'nice'
        ? jar.priority
        : 'important',
    note: normalizeText(jar?.note),
  };
}

function normalizeLoanPersonKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/\b(anh|a|chi|c|em|ban|nguoi|yeu|ny|no|minh|toi|vay|vat|muon|giu|ho|cam|tien)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function loanPersonMatches(a, b) {
  const left = normalizeLoanPersonKey(a);
  const right = normalizeLoanPersonKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function parseInlineMoneyAmount(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.abs(raw) : null;
  }

  const text = String(raw ?? '').trim().toLowerCase();
  if (!text) return null;

  const unitMatch = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(tỷ|ty|b|tr|triệu|m|k|nghìn|ngàn)/i
  );
  if (unitMatch) {
    const value = Number(unitMatch[1].replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return null;
    const unit = unitMatch[2].toLowerCase();
    if (unit === 'tỷ' || unit === 'ty' || unit === 'b') return value * 1000000000;
    if (unit === 'tr' || unit === 'triệu' || unit === 'm') return value * 1000000;
    return value * 1000;
  }

  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inferCurrentAssetSnapshotFromText(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const match = raw.match(
    /(?:hiện\s*có|đang\s*có|(?:tôi|mình|em)\s*có|tài\s*(?:hiện\s*có|hiện\s*tại)|tài\s*sản\s*(?:hiện\s*tại|hiện\s*có)?|tài\s*sản\s*ròng)\s*(?:là|khoảng|tầm|được|:)?\s*(-?\d+(?:[.,]\d+)?\s*(?:tỷ|ty|b|tr|triệu|m|k|nghìn|ngàn)?)/i
  );
  if (!match) return null;
  const total = parseInlineMoneyAmount(match[1]);
  if (!total || total <= 0) return null;
  return {
    total: Math.round(total),
    items: [
      {
        id: 'asset-current-inline',
        label: 'Tài sản hiện có',
        amount: Math.round(total),
      },
    ],
    note: 'Cập nhật từ câu mục tiêu tài sản.',
  };
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

function calcNextDate(startDate, frequency, lastCreatedDate) {
  const base = lastCreatedDate || startDate;
  const d = parseDateKey(base);
  if (!d) return startDate;
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  } else if (frequency === 'yearly') {
    const day = d.getDate();
    d.setDate(1);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  return dateKeyFromDate(d);
}

function advanceRecurringDate(baseDate, frequency, minAfterDate) {
  let nextDate = baseDate;
  let guard = 0;
  while (nextDate <= minAfterDate && guard < 400) {
    const advanced = calcNextDate(baseDate, frequency, nextDate);
    if (!advanced || advanced === nextDate) break;
    nextDate = advanced;
    guard += 1;
  }
  return nextDate;
}

function normalizeRecurringDueDate(startDate, frequency, minDate = getTodayKey()) {
  if (startDate >= minDate) return startDate;
  let nextDate = startDate;
  let guard = 0;
  while (nextDate < minDate && guard < 400) {
    const advanced = calcNextDate(startDate, frequency, nextDate);
    if (!advanced || advanced === nextDate) break;
    nextDate = advanced;
    guard += 1;
  }
  return nextDate;
}

function buildRecurringDraft(item) {
  return {
    description: normalizeText(item?.description),
    amount: String(item?.amount ?? ''),
    category: normalizeText(item?.category, 'food'),
    frequency: ['daily', 'weekly', 'monthly', 'yearly'].includes(item?.frequency)
      ? item.frequency
      : 'monthly',
    startDate: normalizeText(item?.startDate, getTodayKey()),
    monthsFromNow: '',
    autoCreate: Boolean(item?.autoCreate),
    note: normalizeText(item?.note),
  };
}

function FinanceHeader({
  visibleMonth,
  activeLedgerTab,
  monthLabel,
  reportData,
  handleNavigateHeader,
  canNavigateHeader,
}) {
  return (
    <View style={styles.financeHeaderContainer}>
      <View style={styles.monthNavRow}>
        <Pressable
          onPress={() => handleNavigateHeader(-1)}
          style={[styles.navBtnPill, !canNavigateHeader && styles.navBtnDisabled]}
          disabled={!canNavigateHeader}
        >
          <Text style={styles.navBtnPillText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.navMonthLabel}>
          {activeLedgerTab === 'transactions'
            ? monthLabel(visibleMonth)
            : activeLedgerTab === 'loans'
              ? 'Sổ vay nợ riêng'
              : activeLedgerTab === 'budgets'
                ? 'Theo dõi ngân sách'
                : activeLedgerTab === 'reports'
                  ? reportData.label
                  : activeLedgerTab === 'assets'
                    ? 'Tài sản cá nhân'
                    : 'Chiến lược chia hũ'}
        </Text>
        <Pressable
          onPress={() => handleNavigateHeader(1)}
          style={[styles.navBtnPill, !canNavigateHeader && styles.navBtnDisabled]}
          disabled={!canNavigateHeader}
        >
          <Text style={styles.navBtnPillText}>{'>'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryHeroCard({
  totals,
  formatCurrency,
  formatSignedAmount,
  EXPENSE_IMAGES,
}) {
  return (
    <ImageBackground
      source={EXPENSE_IMAGES.header}
      style={styles.heroCard}
      imageStyle={styles.heroCardPattern}
      resizeMode="cover"
    >
      <View style={styles.heroCardContent}>
        <View style={styles.heroCardHeader}>
          <Text style={styles.heroBalanceText}>
            {totals.balance >= 0 ? '+' : ''}
            {formatCurrency(totals.balance)}
          </Text>
          <Text style={styles.heroBalanceLabel}>Còn lại tháng này</Text>
        </View>

        <Image
          source={EXPENSE_IMAGES.transactions}
          style={styles.heroChestIcon}
          resizeMode="contain"
        />
      </View>

      <View style={styles.heroDivider} />

      <View style={styles.heroStatsGrid}>
        <View style={styles.heroStatCol}>
          <Text style={styles.heroStatLabel}>Thu</Text>
          <Text style={[styles.heroStatVal, styles.incomeTextFantasy]}>
            {formatCurrency(totals.income)}
          </Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatCol}>
          <Text style={styles.heroStatLabel}>Chi</Text>
          <Text style={[styles.heroStatVal, styles.expenseTextFantasy]}>
            {formatCurrency(Math.abs(totals.expense))}
          </Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStatCol}>
          <Text style={styles.heroStatLabel}>Vay nợ</Text>
          <Text
            style={[
              styles.heroStatVal,
              totals.loanNet >= 0 ? styles.incomeTextFantasy : styles.expenseTextFantasy,
            ]}
          >
            {formatSignedAmount(totals.loanNet)}
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

function TabSummaryCard({
  activeLedgerTab,
  totals,
  loanTotals,
  budgetRows,
  reportData,
  currentAssetSnapshot,
  activeRecurringRows,
  jarPercentTotal,
  formatCurrency,
  formatSignedAmount,
  getTodayKey,
}) {
  let title1 = '', value1 = '', title2 = '', value2 = '', title3 = '', value3 = '';

  if (activeLedgerTab === 'loans') {
    title1 = 'Nợ / giữ hộ mình';
    value1 = formatCurrency(loanTotals.lent + loanTotals.held);
    title2 = 'Mình đang nợ';
    value2 = formatCurrency(loanTotals.borrowed);
  } else if (activeLedgerTab === 'budgets') {
    title1 = 'Đang theo dõi';
    value1 = `${budgetRows.length} mục`;
    title2 = 'Vượt ngân sách';
    value2 = `${budgetRows.filter((b) => b.spent > b.limit).length} mục`;
  } else if (activeLedgerTab === 'reports') {
    title1 = 'Tổng chi';
    value1 = formatCurrency(reportData.expense);
    title2 = 'Số danh mục';
    value2 = `${reportData.categoryRows.length} mục`;
    title3 = reportData.averageLabel;
    value3 = formatCurrency(reportData.average);
  } else if (activeLedgerTab === 'assets') {
    title1 = 'Tổng tài sản';
    value1 = formatCurrency(currentAssetSnapshot.total);
    title2 = 'Ngoài app';
    value2 = formatCurrency(currentAssetSnapshot.externalTotal);
  } else if (activeLedgerTab === 'recurring') {
    title1 = 'Đang theo dõi';
    value1 = `${activeRecurringRows.length} khoản`;
    title2 = 'Đến hạn';
    value2 = `${
      activeRecurringRows.filter(
        (r) => r.status === 'active' && r.nextDate <= getTodayKey()
      ).length
    } khoản`;
  } else if (activeLedgerTab === 'jars') {
    title1 = 'Thu tháng này';
    value1 = formatCurrency(totals.income);
    title2 = 'Đã chia';
    value2 = `${Math.round(jarPercentTotal * 10) / 10}%`;
  }

  return (
    <View style={styles.tabSummaryCard}>
      <View style={styles.tabSummaryRow}>
        <View style={styles.tabSummaryCol}>
          <Text style={styles.tabSummaryLabel}>{title1}</Text>
          <Text style={[styles.tabSummaryVal, styles.incomeTextFantasy]}>{value1}</Text>
        </View>
        <View style={styles.tabSummaryDivider} />
        <View style={styles.tabSummaryCol}>
          <Text style={styles.tabSummaryLabel}>{title2}</Text>
          <Text style={[styles.tabSummaryVal, styles.expenseTextFantasy]}>{value2}</Text>
        </View>
        {title3 ? (
          <>
            <View style={styles.tabSummaryDivider} />
            <View style={styles.tabSummaryCol}>
              <Text style={styles.tabSummaryLabel}>{title3}</Text>
              <Text style={[styles.tabSummaryVal, styles.goldTextFantasy]}>{value3}</Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function FinanceTabs({ activeLedgerTab, setActiveLedgerTab }) {
  const tabsList = [
    { id: 'transactions', label: 'Giao dịch' },
    { id: 'reports', label: 'Báo cáo' },
    { id: 'loans', label: 'Vay nợ' },
    { id: 'budgets', label: 'Ngân sách' },
    { id: 'jars', label: 'Hũ tiền' },
    { id: 'assets', label: 'Tài sản' },
    { id: 'recurring', label: 'Định kỳ' },
  ];

  return (
    <View style={styles.financeTabsOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.financeTabsContainer}
      >
        {tabsList.map((t) => {
          const active = activeLedgerTab === t.id;
          return (
            <Pressable
              key={t.id}
              style={[
                styles.financeTabBtn,
                active && styles.financeTabBtnActive,
              ]}
              onPress={() => setActiveLedgerTab(t.id)}
            >
              <Text
                style={[
                  styles.financeTabText,
                  active && styles.financeTabTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ExpenseScreen({
  transactions,
  customCategories,
  loanRecords,
  budgetRecords,
  moneyJars,
  assetSnapshot,
  assetGoals,
  recurringTransactions,
  assetHistory,
  onTransactionsChange,
  onCategoriesChange,
  onLoanRecordsChange,
  onBudgetRecordsChange,
  onMoneyJarsChange,
  onAssetSnapshotChange,
  onAssetGoalsChange,
  onRecurringTransactionsChange,
  onAssetHistoryChange,
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
  const [pendingAiTransactions, setPendingAiTransactions] = useState([]);
  const [expandedAiCategoryIndex, setExpandedAiCategoryIndex] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [loanAiText, setLoanAiText] = useState('');
  const [loanAiBusy, setLoanAiBusy] = useState(false);
  const [loanAiStatus, setLoanAiStatus] = useState('');
  const [loanAiError, setLoanAiError] = useState('');
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [loanEditDraft, setLoanEditDraft] = useState(() => buildLoanEditDraft(null));
  const [loanEditError, setLoanEditError] = useState('');
  const [loanEditMode, setLoanEditMode] = useState('edit');
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [budgetEditDraft, setBudgetEditDraft] = useState({ limit: '', period: 'monthly', category: 'food', note: '' });
  const [budgetEditError, setBudgetEditError] = useState('');
  const [budgetEditCategoryOpen, setBudgetEditCategoryOpen] = useState(false);
  const [budgetAiText, setBudgetAiText] = useState('');
  const [budgetAiBusy, setBudgetAiBusy] = useState(false);
  const [budgetAiStatus, setBudgetAiStatus] = useState('');
  const [budgetAiError, setBudgetAiError] = useState('');
  const [jarAiText, setJarAiText] = useState('');
  const [jarAiBusy, setJarAiBusy] = useState(false);
  const [jarAiStatus, setJarAiStatus] = useState('');
  const [jarAiError, setJarAiError] = useState('');
  const [editingJarId, setEditingJarId] = useState(null);
  const [jarEditDraft, setJarEditDraft] = useState(() => buildJarEditDraft(null));
  const [jarEditError, setJarEditError] = useState('');
  const [jarCategoryOpen, setJarCategoryOpen] = useState(false);
  const [contributionJarId, setContributionJarId] = useState(null);
  const [jarContributionDraft, setJarContributionDraft] = useState({
    amount: '',
    note: '',
  });
  const [jarContributionError, setJarContributionError] = useState('');
  const [assetAiText, setAssetAiText] = useState('');
  const [assetAiBusy, setAssetAiBusy] = useState(false);
  const [assetAiStatus, setAssetAiStatus] = useState('');
  const [assetAiError, setAssetAiError] = useState('');
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [selectedAssetDetailId, setSelectedAssetDetailId] = useState(null);
  const [assetEditDraft, setAssetEditDraft] = useState(() => buildAssetEditDraft(null));
  const [assetEditError, setAssetEditError] = useState('');
  const [assetGoalAiText, setAssetGoalAiText] = useState('');
  const [assetGoalAiBusy, setAssetGoalAiBusy] = useState(false);
  const [assetGoalAiStatus, setAssetGoalAiStatus] = useState('');
  const [assetGoalAiError, setAssetGoalAiError] = useState('');
  const [reportMode, setReportMode] = useState('month');
  const [activeLedgerTab, setActiveLedgerTab] = useState('transactions');

  // --- Giao dịch định kỳ ---
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [recurringDraft, setRecurringDraft] = useState(() => buildRecurringDraft(null));
  const [recurringError, setRecurringError] = useState('');

  // --- Lịch sử hũ tiền ---
  const [jarHistoryJar, setJarHistoryJar] = useState(null);
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
    () =>
      (Array.isArray(transactions) ? transactions : []).filter(
        (tx) => tx?.source !== 'loan'
      ),
    [transactions]
  );
  const recentCategoryExamples = useMemo(() => {
    const seen = new Set();
    const examples = [];
    for (const tx of allTransactions) {
      if (tx?.source === 'loan') continue;
      if (!tx?.aiCategoryConfirmed && tx?.generatedBy === 'openai_expense_note_v1') {
        continue;
      }
      const description = normalizeText(tx?.description);
      const categoryId = normalizeText(tx?.category);
      if (!description || !categoryId) continue;
      const key = `${description.toLowerCase()}|${categoryId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push({
        description,
        categoryId,
        sourceText: normalizeText(tx?.aiSourceText, description),
      });
      if (examples.length >= 20) break;
    }
    return examples;
  }, [allTransactions]);
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
  const allAssetGoals = useMemo(
    () => (Array.isArray(assetGoals) ? assetGoals : []),
    [assetGoals]
  );
  const loanCashFlowTransactions = useMemo(
    () => buildLoanCashFlowTransactions(allLoanRecords),
    [allLoanRecords]
  );
  const ledgerTransactions = useMemo(
    () => [...allTransactions, ...loanCashFlowTransactions],
    [allTransactions, loanCashFlowTransactions]
  );
  const loanAssetBreakdown = useMemo(
    () =>
      allLoanRecords.reduce(
        (acc, loan) => {
          const amount = getLoanRemainingAmount(loan);
          if (amount <= 0 || loan.type === 'borrowed') return acc;
          if (loan.type === 'held') acc.held += amount;
          else acc.lent += amount;
          return acc;
        },
        { lent: 0, held: 0 }
      ),
    [allLoanRecords]
  );
  const loanAssetReceivables = loanAssetBreakdown.lent;
  const loanAssetCashFlowTotal = useMemo(
    () =>
      allLoanRecords.reduce(
        (sum, loan) => sum + getLoanAssetCashFlowAmount(loan),
        0
      ),
    [allLoanRecords]
  );
  const appTransactionAssetTotal = useMemo(
    () =>
      allTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) +
      loanAssetCashFlowTotal,
    [allTransactions, loanAssetCashFlowTotal]
  );
  const recordedAssetTotal = useMemo(
    () => appTransactionAssetTotal + loanAssetReceivables,
    [appTransactionAssetTotal, loanAssetReceivables]
  );
  const loanAssetItems = useMemo(
    () =>
      allLoanRecords
        .map((loan) => {
          const amount = getLoanRemainingAmount(loan);
          if (amount <= 0 || loan.type === 'borrowed') return null;
          const held = loan.type === 'held';
          const person = normalizeText(loan.person, 'người khác');
          return {
            id: `asset-loan-${loan.id}`,
            label: held ? `${person} giữ hộ mình` : `${person} nợ mình`,
            amount,
            detailType: 'loan_item',
            loanKind: held ? 'held' : 'lent',
            sourceText: held
              ? 'Khoản người khác đang giữ/cầm hộ mình, chỉ theo dõi vị trí tiền.'
              : 'Khoản người khác đang nợ mình.',
            note: [
              `Gốc ${formatCurrency(Number(loan.amount) || 0)}`,
              `đã thu ${formatCurrency(getLoanPaidAmount(loan))}`,
              loan.dateUnknown ? 'vay ngày xưa' : formatDateKeyLabel(loan.date),
              loan.dueDate ? `hạn ${formatDateKeyLabel(loan.dueDate)}` : '',
              normalizeText(loan.note),
            ]
              .filter(Boolean)
              .join(' · '),
          };
        })
        .filter(Boolean),
    [allLoanRecords]
  );
  const appAssetMonthRows = useMemo(() => {
    const byMonth = new Map();
    for (const tx of allTransactions) {
      const amount = Number(tx.amount) || 0;
      const monthKey = getMonthKey(getTransactionDate(tx));
      const row = byMonth.get(monthKey) ?? {
        monthKey,
        income: 0,
        expense: 0,
        balance: 0,
        count: 0,
      };
      if (amount > 0) row.income += amount;
      if (amount < 0) row.expense += Math.abs(amount);
      row.balance += amount;
      row.count += 1;
      byMonth.set(monthKey, row);
    }
    let cumulative = 0;
    return Array.from(byMonth.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((row) => {
        cumulative += row.balance;
        return { ...row, cumulative };
      })
      .reverse();
  }, [allTransactions]);
  const currentAssetSnapshot = useMemo(() => {
    const snapshot =
      assetSnapshot && typeof assetSnapshot === 'object' ? assetSnapshot : {};
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    const externalTotal = Math.max(0, Number(snapshot.total) || 0);
    const total = Math.max(0, recordedAssetTotal + externalTotal);
    const formulaRows = [
      {
        id: 'app-balance',
        label: 'Số dư trong app',
        value: appTransactionAssetTotal,
        note: 'Tính thu/chi thật và dòng tiền vay nợ có ngày cụ thể.',
      },
      {
        id: 'loan-lent',
        label: 'Tiền cho vay / chờ thu',
        value: loanAssetBreakdown.lent,
        note: 'Phần phải thu còn lại; khoản có ngày cụ thể đã bù trừ với số dư app.',
      },
      {
        id: 'loan-held',
        label: 'Tiền người khác giữ hộ',
        value: loanAssetBreakdown.held,
        note: 'Chỉ theo dõi nơi tiền đang ở, không cộng thêm lần 2 vào tổng.',
      },
      {
        id: 'external-assets',
        label: 'Tài sản ngoài app',
        value: externalTotal,
        note: 'Các tài sản bạn tự ghi thêm ngoài hệ thống thu/chi.',
      },
    ];
    const displayItems = [
      {
        id: 'asset-recorded-balance',
        label: 'Số dư trong app',
        amount: appTransactionAssetTotal,
        detailType: 'app_balance',
        sourceText: 'Tự tính từ thu chi và dòng tiền vay nợ có ngày cụ thể.',
      },
      ...loanAssetItems,
      ...items.map((item, index) => ({
        id: String(item?.id ?? `asset-${index}`),
        label: normalizeText(item?.label, 'Tài sản ngoài app'),
        amount: Math.max(0, Number(item?.amount) || 0),
        location: normalizeText(item?.location),
        note: normalizeText(item?.note),
        detailType: 'external_asset',
        external: true,
      })),
    ].filter((item) => item.amount !== 0 || item.label);
    return {
      total,
      recordedTotal: recordedAssetTotal,
      externalTotal,
      formulaRows,
      items: displayItems,
      note: normalizeText(snapshot.note),
      updatedAt: Number(snapshot.updatedAt) || 0,
    };
  }, [
    appTransactionAssetTotal,
    assetSnapshot,
    loanAssetBreakdown,
    loanAssetItems,
    recordedAssetTotal,
  ]);
  const selectedAssetDetail = useMemo(
    () =>
      currentAssetSnapshot.items.find(
        (item) => String(item.id) === String(selectedAssetDetailId)
      ) ?? null,
    [currentAssetSnapshot.items, selectedAssetDetailId]
  );

  const displayAssetHistory = useMemo(() => {
    const rows = Array.isArray(assetHistory) ? assetHistory : [];
    if (currentAssetSnapshot.total <= 0) return rows;

    const currentMonth = getMonthKey();
    return [
      ...rows.filter((entry) => entry?.monthKey !== currentMonth),
      {
        monthKey: currentMonth,
        total: currentAssetSnapshot.total,
        externalTotal: currentAssetSnapshot.externalTotal,
        appTotal: appTransactionAssetTotal,
        recordedAt: currentAssetSnapshot.updatedAt || Date.now(),
        preview: true,
      },
    ];
  }, [
    appTransactionAssetTotal,
    assetHistory,
    currentAssetSnapshot.externalTotal,
    currentAssetSnapshot.total,
    currentAssetSnapshot.updatedAt,
  ]);

  const assetGoalRows = useMemo(() => {
    const currentTotal = currentAssetSnapshot.total;
    return allAssetGoals
      .filter((goal) => goal.status !== 'disabled')
      .map((goal) => {
        const targetAmount = Math.max(0, Number(goal.targetAmount) || 0);
        const remaining = Math.max(0, targetAmount - currentTotal);
        const monthsLeft = monthsUntilDate(goal.targetDate);
        return {
          ...goal,
          targetAmount,
          remaining,
          monthsLeft,
          monthlyNeed:
            remaining > 0 && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : 0,
          progress:
            targetAmount > 0 ? Math.min(1.5, currentTotal / targetAmount) : 0,
          targetDateLabel: formatDateKeyLabel(goal.targetDate),
        };
      })
      .sort((a, b) => {
        const aDate = parseDateKey(a.targetDate)?.getTime() ?? 0;
        const bDate = parseDateKey(b.targetDate)?.getTime() ?? 0;
        return aDate - bDate;
      });
  }, [allAssetGoals, currentAssetSnapshot.total]);

  const monthTransactions = useMemo(
    () =>
      allTransactions.filter(
        (tx) => getMonthKey(getTransactionDate(tx)) === visibleMonth
      ),
    [allTransactions, visibleMonth]
  );
  const monthLedgerTransactions = useMemo(
    () =>
      ledgerTransactions.filter(
        (tx) =>
          !tx.dateUnknown && getMonthKey(getTransactionDate(tx)) === visibleMonth
      ),
    [ledgerTransactions, visibleMonth]
  );
  const totals = useMemo(
    () => {
      const base = monthTransactions.reduce(
        (acc, tx) => {
          const amount = Number(tx.amount) || 0;
          if (amount > 0) acc.income += amount;
          if (amount < 0) acc.expense += Math.abs(amount);
          acc.transactionBalance += amount;
          return acc;
        },
        { income: 0, expense: 0, transactionBalance: 0 }
      );
      const loanNet = monthLedgerTransactions.reduce((sum, tx) => {
        if (tx.source !== 'loan') return sum;
        return sum + (Number(tx.amount) || 0);
      }, 0);
      return {
        ...base,
        loanNet,
        balance: base.transactionBalance + loanNet,
      };
    },
    [monthLedgerTransactions, monthTransactions]
  );

  const visibleTransactions = useMemo(() => {
    const list = monthLedgerTransactions.filter((tx) => {
      const amount = Number(tx.amount) || 0;
      if (filter === 'income') return amount > 0 && tx.source !== 'loan';
      if (filter === 'expense') return amount < 0 && tx.source !== 'loan';
      if (filter === 'loan') return tx.source === 'loan';
      return true;
    });
    return [...list].sort(
      (a, b) => getTransactionDate(b).getTime() - getTransactionDate(a).getTime()
    );
  }, [filter, monthLedgerTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map();
    for (const tx of visibleTransactions) {
      const date = getTransactionDate(tx);
      const key = dateKeyFromDate(date);
      if (!groups.has(key)) groups.set(key, { items: [], total: 0 });
      const group = groups.get(key);
      group.items.push(tx);
      group.total += Number(tx.amount) || 0;
    }
    return Array.from(groups.entries()).map(([dateKey, group]) => [
      dateKey,
      group.items,
      group.total,
    ]);
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
          else if (loan.type === 'held') acc.held += amount;
          else acc.lent += amount;
          return acc;
        },
        { lent: 0, held: 0, borrowed: 0 }
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
        const categoryIds = getDefaultJarCategoryIds(jar);
        const trackingMode = getDefaultJarTrackingMode(jar, categoryIds);
        const categoryInfos =
          trackingMode === 'categories'
            ? categoryIds.map((id) => categoryById(id, allCategories))
            : [];
        const categorySet = new Set(categoryIds);
        const allocated = Math.round((monthlyIncome * (Number(jar.percent) || 0)) / 100);
        const spent = trackingMode === 'categories'
          ? monthTransactions.reduce((sum, tx) => {
              const amount = Number(tx.amount) || 0;
              if (amount >= 0 || !categorySet.has(tx.category)) return sum;
              return sum + Math.abs(amount);
            }, 0)
          : (Array.isArray(jar.contributions) ? jar.contributions : []).reduce(
              (sum, entry) =>
                getMonthKey(parseDateKey(entry?.date) ?? new Date()) === visibleMonth
                  ? sum + Math.abs(Number(entry?.amount) || 0)
                  : sum,
              0
            );
        const contributionRows =
          trackingMode === 'manual'
            ? (Array.isArray(jar.contributions) ? jar.contributions : [])
                .filter(
                  (entry) =>
                    getMonthKey(parseDateKey(entry?.date) ?? new Date()) === visibleMonth
                )
                .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
            : [];
        return {
          ...jar,
          categoryIds,
          categoryInfos,
          categoryInfo: categoryInfos[0] ?? null,
          trackingMode,
          contributionRows,
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
  }, [allMoneyJars, allCategories, monthTransactions, totals.income, visibleMonth]);

  const jarPercentTotal = useMemo(
    () =>
      activeJarRows.reduce(
        (sum, jar) => sum + Math.max(0, Number(jar.percent) || 0),
        0
      ),
    [activeJarRows]
  );

  // --- Giao dịch định kỳ ---
  const allRecurringTransactions = useMemo(
    () => (Array.isArray(recurringTransactions) ? recurringTransactions : []),
    [recurringTransactions]
  );

  const activeRecurringRows = useMemo(
    () => allRecurringTransactions.filter((item) => item.status !== 'disabled'),
    [allRecurringTransactions]
  );

  // Tự động tạo giao dịch định kỳ đến hạn khi mở app
  useEffect(() => {
    const today = getTodayKey();
    const dueItems = activeRecurringRows.filter(
      (item) =>
        item.status === 'active' &&
        item.autoCreate &&
        item.nextDate <= today &&
        item.lastCreatedDate !== today
    );
    if (dueItems.length === 0) return;

    const createdAt = Date.now();
    const newTransactions = [];
    const updatedRecurring = allRecurringTransactions.map((item) => {
      const isDue = dueItems.find((d) => d.id === item.id);
      if (!isDue) return item;
      const tx = {
        id: `${createdAt}-auto-${item.id}-${Math.random().toString(36).slice(2, 8)}`,
        description: item.description,
        amount: Math.round(Number(item.amount) || 0),
        category: item.category,
        dateTime: new Date().toISOString(),
        note: normalizeText(item.note, `Tự động từ định kỳ ${item.description}`),
        createdAt,
        generatedBy: 'recurring_auto_v1',
      };
      newTransactions.push(tx);
      return {
        ...item,
        lastCreatedDate: today,
        nextDate: advanceRecurringDate(
          item.nextDate || item.startDate,
          item.frequency,
          today
        ),
        updatedAt: createdAt,
      };
    });

    if (newTransactions.length > 0) {
      onTransactionsChange([...newTransactions, ...allTransactions]);
      onRecurringTransactionsChange?.(updatedRecurring);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ chạy 1 lần khi mount

  const reportData = useMemo(() => {
    const [yearRaw] = String(visibleMonth).split('-').map(Number);
    const year = yearRaw || new Date().getFullYear();
    const rowsInPeriod = allTransactions.filter((tx) => {
      const date = getTransactionDate(tx);
      if (reportMode === 'year') return date.getFullYear() === year;
      return getMonthKey(date) === visibleMonth;
    });

    const income = rowsInPeriod.reduce((sum, tx) => {
      const amount = Number(tx.amount) || 0;
      return amount > 0 ? sum + amount : sum;
    }, 0);
    const expenseRows = rowsInPeriod.filter((tx) => (Number(tx.amount) || 0) < 0);
    const expense = expenseRows.reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
      0
    );
    const byCategory = new Map();
    for (const tx of expenseRows) {
      const key = tx.category || 'other';
      const current = byCategory.get(key) ?? { amount: 0, count: 0, items: [] };
      current.amount += Math.abs(Number(tx.amount) || 0);
      current.count += 1;
      current.items.push(tx);
      byCategory.set(key, current);
    }
    const categoryRows = Array.from(byCategory.entries())
      .map(([category, value]) => ({
        category,
        categoryInfo: categoryById(category, allCategories),
        amount: value.amount,
        count: value.count,
        items: value.items.sort(
          (a, b) => getTransactionDate(b).getTime() - getTransactionDate(a).getTime()
        ),
        percent: expense > 0 ? value.amount / expense : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    const divisor =
      reportMode === 'year'
        ? 12
        : new Date(year, Number(visibleMonth.slice(5, 7)) || 1, 0).getDate();

    return {
      label: reportMode === 'year' ? `Năm ${year}` : monthLabel(visibleMonth),
      income,
      expense,
      balance: income - expense,
      count: expenseRows.length,
      categoryRows,
      average: divisor > 0 ? Math.round(expense / divisor) : 0,
      averageLabel: reportMode === 'year' ? 'TB / tháng' : 'TB / ngày',
    };
  }, [allTransactions, allCategories, reportMode, visibleMonth]);

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

  const closeLoanEditModal = () => {
    setEditingLoanId(null);
    setLoanEditMode('edit');
    setLoanEditError('');
    setLoanEditDraft(buildLoanEditDraft(null));
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

  const canNavigateHeader =
    activeLedgerTab === 'transactions' || activeLedgerTab === 'reports';
  const handleNavigateHeader = (delta) => {
    if (!canNavigateHeader) return;
    const monthDelta =
      activeLedgerTab === 'reports' && reportMode === 'year' ? delta * 12 : delta;
    setVisibleMonth((m) => addMonthsToKey(m, monthDelta));
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
        recentExamples: recentCategoryExamples,
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
          aiSourceText: text,
          aiConfidence: tx.confidence,
          aiCategoryConfirmed: false,
          candidateCategoryIds: tx.candidateCategoryIds,
        };
      });

      const needsConfirmation = nextTransactions.some(
        (tx) => Number(tx.aiConfidence) < AI_CATEGORY_CONFIRM_THRESHOLD
      );
      if (needsConfirmation) {
        setPendingAiTransactions(nextTransactions);
        setExpandedAiCategoryIndex(null);
        setAiStatus('AI chưa chắc danh mục. Chọn lại rồi xác nhận để AI học cho lần sau.');
      } else {
        const readyTransactions = nextTransactions.map(
          ({ candidateCategoryIds, ...tx }) => tx
        );
        onTransactionsChange([...readyTransactions, ...allTransactions]);
        setVisibleMonth(getMonthKey(getTransactionDate(nextTransactions[0])));
        setAiText('');
        setAiStatus(
          result.message ||
            `Đã ghi ${nextTransactions.length} giao dịch từ nội dung AI.`
        );
      }
    } catch (e) {
      setAiError(e?.message ?? 'AI chưa ghi được giao dịch. Thử lại sau.');
    } finally {
      setAiBusy(false);
    }
  };

  const closeAiCategoryConfirm = () => {
    setPendingAiTransactions([]);
    setExpandedAiCategoryIndex(null);
  };

  const updatePendingAiCategory = (index, categoryId) => {
    setPendingAiTransactions((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, category: categoryId, aiCategoryConfirmed: true }
          : row
      )
    );
    setExpandedAiCategoryIndex(null);
  };

  const handleConfirmAiCategories = () => {
    if (pendingAiTransactions.length === 0) return;
    const confirmed = pendingAiTransactions.map(({ candidateCategoryIds, ...tx }) => ({
      ...tx,
      aiCategoryConfirmed: true,
    }));
    onTransactionsChange([...confirmed, ...allTransactions]);
    setVisibleMonth(getMonthKey(getTransactionDate(confirmed[0])));
    setAiText('');
    setAiStatus(`Đã xác nhận và ghi ${confirmed.length} giao dịch. AI sẽ học từ lựa chọn này.`);
    closeAiCategoryConfirm();
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
              ? loan.type === 'held'
                ? 'held'
                : 'lent'
              : loan.paymentType === 'paid'
                ? 'borrowed'
                : loan.type;
          const candidates = nextLoans.filter((item) => {
            const samePerson = loanPersonMatches(item.person, loan.person);
            const sameType = item.type === expectedType;
            return samePerson && sameType && getLoanRemainingAmount(item) > 0;
          });
          const fallbackCandidates = nextLoans.filter((item) => {
            const samePerson = loanPersonMatches(item.person, loan.person);
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
            dateUnknown:
              Boolean(loan.dateUnknown) ||
              /(ngày xưa|lâu rồi|trước đây|không nhớ)/i.test(text),
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

  const handleEditBudget = (budget) => {
    setBudgetEditDraft(buildBudgetEditDraft(budget));
    setBudgetEditError('');
    setBudgetEditCategoryOpen(false);
    setEditingBudgetId(budget.id);
  };

  const closeBudgetEditModal = () => {
    setEditingBudgetId(null);
    setBudgetEditError('');
    setBudgetEditCategoryOpen(false);
  };

  const updateBudgetEditDraft = (key, value) => {
    setBudgetEditDraft((prev) => ({ ...prev, [key]: value }));
    setBudgetEditError('');
  };

  const handleSaveBudgetEdit = () => {
    if (!editingBudgetId) return;
    const limit = parseAmount(budgetEditDraft.limit);
    if (!limit || limit <= 0) {
      setBudgetEditError('Nhập số tiền giới hạn hợp lệ.');
      return;
    }
    const category = normalizeText(budgetEditDraft.category);
    if (!category) {
      setBudgetEditError('Chọn danh mục cho ngân sách.');
      return;
    }
    // Check duplicate: same period + category but different id
    const duplicate = allBudgetRecords.find(
      (b) =>
        b.id !== editingBudgetId &&
        b.status !== 'disabled' &&
        b.period === budgetEditDraft.period &&
        b.category === category
    );
    if (duplicate) {
      setBudgetEditError('Đã có ngân sách cho danh mục và chu kỳ này rồi.');
      return;
    }
    onBudgetRecordsChange?.(
      allBudgetRecords.map((b) =>
        b.id === editingBudgetId
          ? {
              ...b,
              limit,
              period: budgetEditDraft.period,
              category,
              note: normalizeText(budgetEditDraft.note),
              updatedAt: Date.now(),
            }
          : b
      )
    );
    closeBudgetEditModal();
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
            categoryIds: getDefaultJarCategoryIds(jar),
            trackingMode: getDefaultJarTrackingMode(jar, getDefaultJarCategoryIds(jar)),
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
                  categoryIds: jar.categoryIds,
                  trackingMode: jar.trackingMode,
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
            categoryIds: jar.categoryIds,
            trackingMode: jar.trackingMode,
            contributions: [],
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

  const closeJarEditModal = () => {
    setEditingJarId(null);
    setJarEditDraft(buildJarEditDraft(null));
    setJarEditError('');
    setJarCategoryOpen(false);
  };

  const handleEditJar = (jar) => {
    setEditingJarId(jar.id);
    setJarEditDraft(buildJarEditDraft(jar));
    setJarEditError('');
    setJarCategoryOpen(false);
  };

  const updateJarEditDraft = (key, value) => {
    setJarEditError('');
    setJarEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleJarCategory = (categoryId) => {
    setJarEditError('');
    setJarEditDraft((prev) => {
      const current = Array.isArray(prev.categoryIds) ? prev.categoryIds : [];
      const exists = current.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? current.filter((id) => id !== categoryId)
          : [...current, categoryId],
      };
    });
  };

  const handleSaveJarEdit = () => {
    if (!editingJarId) return;
    const label = normalizeText(jarEditDraft.label);
    const percent = Number(jarEditDraft.percent);
    const trackingMode =
      jarEditDraft.trackingMode === 'categories' ? 'categories' : 'manual';
    const categoryIds = Array.isArray(jarEditDraft.categoryIds)
      ? jarEditDraft.categoryIds.filter(Boolean)
      : [];
    if (!label) {
      setJarEditError('Nhập tên hũ.');
      return;
    }
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      setJarEditError('Phần trăm hũ cần từ 1 đến 100.');
      return;
    }
    if (trackingMode === 'categories' && categoryIds.length === 0) {
      setJarEditError('Chọn ít nhất một danh mục để hũ tự tính.');
      return;
    }
    onMoneyJarsChange?.(
      allMoneyJars.map((jar) =>
        jar.id === editingJarId
          ? {
              ...jar,
              label,
              percent: Math.round(percent * 100) / 100,
              trackingMode,
              categoryIds: trackingMode === 'categories' ? categoryIds : [],
              category: trackingMode === 'categories' ? categoryIds[0] ?? '' : '',
              priority: jarEditDraft.priority,
              note: normalizeText(jarEditDraft.note),
              updatedAt: Date.now(),
            }
          : jar
      )
    );
    closeJarEditModal();
  };

  const closeJarContributionModal = () => {
    setContributionJarId(null);
    setJarContributionDraft({ amount: '', note: '' });
    setJarContributionError('');
  };

  const handleOpenJarContribution = (jar) => {
    setContributionJarId(jar.id);
    setJarContributionDraft({ amount: '', note: '' });
    setJarContributionError('');
  };

  const updateJarContributionDraft = (key, value) => {
    setJarContributionError('');
    setJarContributionDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveJarContribution = () => {
    if (!contributionJarId) return;
    const amount = parseAmount(jarContributionDraft.amount);
    const note = normalizeText(jarContributionDraft.note);
    if (amount == null || amount <= 0) {
      setJarContributionError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!note) {
      setJarContributionError('Nhập nội dung khoản đã chuyển/làm được.');
      return;
    }
    const now = Date.now();
    const currentMonth = getMonthKey(new Date());
    const date = visibleMonth === currentMonth ? getTodayKey() : `${visibleMonth}-01`;
    const entry = {
      id: `${now}-jar-contribution-${Math.random().toString(36).slice(2, 8)}`,
      amount: Math.round(Math.abs(amount)),
      date,
      note,
      createdAt: now,
    };
    onMoneyJarsChange?.(
      allMoneyJars.map((jar) =>
        jar.id === contributionJarId
          ? {
              ...jar,
              trackingMode: 'manual',
              contributions: [
                entry,
                ...(Array.isArray(jar.contributions) ? jar.contributions : []),
              ],
              updatedAt: now,
            }
          : jar
      )
    );
    closeJarContributionModal();
  };

  // --- Handlers: Giao dịch định kỳ ---
  const updateRecurringDraft = (key, value) => {
    setRecurringError('');
    setRecurringDraft((prev) => {
      if (key === 'monthsFromNow') {
        const raw = normalizeText(value).replace(/[^\d]/g, '');
        if (!raw) return { ...prev, monthsFromNow: '' };
        const months = Math.min(240, Math.max(0, Number(raw) || 0));
        return {
          ...prev,
          monthsFromNow: String(months),
          startDate: addMonthsToDateKey(getTodayKey(), months),
        };
      }
      if (key === 'startDate') {
        return { ...prev, startDate: value, monthsFromNow: '' };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleAddRecurring = () => {
    setEditingRecurringId(null);
    setRecurringDraft(buildRecurringDraft(null));
    setRecurringError('');
    setRecurringModalOpen(true);
  };

  const handleEditRecurring = (item) => {
    setEditingRecurringId(item.id);
    setRecurringDraft(buildRecurringDraft(item));
    setRecurringError('');
    setRecurringModalOpen(true);
  };

  const closeRecurringModal = () => {
    setRecurringModalOpen(false);
    setEditingRecurringId(null);
    setRecurringError('');
  };

  const handleSaveRecurring = () => {
    const description = normalizeText(recurringDraft.description);
    if (!description) {
      setRecurringError('Nhập mô tả giao dịch.');
      return;
    }
    const amount = parseAmount(recurringDraft.amount);
    if (amount == null || amount === 0) {
      setRecurringError('Nhập số tiền hợp lệ (âm là chi tiêu, dương là thu nhập).');
      return;
    }
    const monthOffsetText = normalizeText(recurringDraft.monthsFromNow);
    const monthOffset =
      monthOffsetText === '' ? null : Number.parseInt(monthOffsetText, 10);
    if (
      monthOffsetText !== '' &&
      (!Number.isFinite(monthOffset) || monthOffset < 0 || monthOffset > 240)
    ) {
      setRecurringError('Số tháng phải từ 0 đến 240.');
      return;
    }
    const startDate =
      monthOffset == null
        ? normalizeText(recurringDraft.startDate, getTodayKey())
        : addMonthsToDateKey(getTodayKey(), monthOffset);
    if (!parseDateKey(startDate)) {
      setRecurringError('Ngày bắt đầu không hợp lệ (YYYY-MM-DD).');
      return;
    }
    const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(recurringDraft.frequency)
      ? recurringDraft.frequency
      : 'monthly';
    const category = normalizeText(recurringDraft.category, 'other');
    const roundedAmount = Math.round(amount);
    const now = Date.now();
    if (editingRecurringId) {
      onRecurringTransactionsChange?.(
        allRecurringTransactions.map((item) =>
          item.id === editingRecurringId
            ? (() => {
                const scheduleChanged =
                  item.startDate !== startDate || item.frequency !== frequency;
                return {
                  ...item,
                  description,
                  amount: roundedAmount,
                  category,
                  frequency,
                  startDate,
                  nextDate: scheduleChanged
                    ? normalizeRecurringDueDate(startDate, frequency)
                    : item.nextDate || normalizeRecurringDueDate(startDate, frequency),
                  autoCreate: recurringDraft.autoCreate,
                  note: normalizeText(recurringDraft.note),
                  updatedAt: now,
                };
              })()
            : item
        )
      );
    } else {
      const newItem = {
        id: `${now}-recurring-${Math.random().toString(36).slice(2, 8)}`,
        description,
        amount: roundedAmount,
        category,
        frequency,
        startDate,
        nextDate: normalizeRecurringDueDate(startDate, frequency),
        autoCreate: recurringDraft.autoCreate,
        note: normalizeText(recurringDraft.note),
        status: 'active',
        lastCreatedDate: '',
        createdAt: now,
        updatedAt: now,
      };
      onRecurringTransactionsChange?.([newItem, ...allRecurringTransactions]);
    }
    closeRecurringModal();
  };

  const handlePauseRecurring = (id) => {
    onRecurringTransactionsChange?.(
      allRecurringTransactions.map((item) =>
        item.id === id ? { ...item, status: 'paused', updatedAt: Date.now() } : item
      )
    );
  };

  const handleResumeRecurring = (id) => {
    onRecurringTransactionsChange?.(
      allRecurringTransactions.map((item) =>
        item.id === id ? { ...item, status: 'active', updatedAt: Date.now() } : item
      )
    );
  };

  const handleDeleteRecurring = (id) => {
    Alert.alert(
      'Xóa giao dịch định kỳ?',
      'Khoản định kỳ này sẽ bị xóa vĩnh viễn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onRecurringTransactionsChange?.(
              allRecurringTransactions.filter((item) => item.id !== id)
            );
          },
        },
      ]
    );
  };

  const handleApplyRecurring = (item) => {
    const today = getTodayKey();
    const now = Date.now();
    const tx = {
      id: `${now}-manual-recurring-${Math.random().toString(36).slice(2, 8)}`,
      description: item.description,
      amount: Math.round(Number(item.amount) || 0),
      category: item.category,
      dateTime: new Date().toISOString(),
      note: normalizeText(item.note, `Ghi tay từ định kỳ`),
      createdAt: now,
      generatedBy: 'recurring_manual_v1',
    };
    onTransactionsChange([tx, ...allTransactions]);
    onRecurringTransactionsChange?.(
      allRecurringTransactions.map((r) =>
        r.id === item.id
          ? {
              ...r,
              lastCreatedDate: today,
              nextDate:
                (r.nextDate || r.startDate) <= today
                  ? advanceRecurringDate(r.nextDate || r.startDate, r.frequency, today)
                  : r.nextDate || normalizeRecurringDueDate(r.startDate, r.frequency),
              updatedAt: now,
            }
          : r
      )
    );
    setVisibleMonth(getMonthKey(new Date()));
  };

  // --- Handler: Lịch sử hũ tiền ---
  const handleViewJarHistory = (jar) => {
    setJarHistoryJar(jar);
  };

  const closeJarHistory = () => {
    setJarHistoryJar(null);
  };

  const handleAssetAiNote = async () => {
    const text = normalizeText(assetAiText);
    if (!text) {
      setAssetAiError('Nhập tài sản ngoài app, ví dụ: tiền mặt 5tr, tiết kiệm 15tr, đầu tư 20tr.');
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

      // Lưu vào lịch sử tháng này
      const currentMonth = getMonthKey();
      const nextAssetTotal = Math.max(
        0,
        recordedAssetTotal + Math.max(0, Number(result.snapshot.total) || 0)
      );
      const newHistoryEntry = {
        monthKey: currentMonth,
        total: nextAssetTotal,
        externalTotal: result.snapshot.total,
        appTotal: appTransactionAssetTotal,
        recordedAt: now,
      };
      const currentHistory = Array.isArray(assetHistory) ? assetHistory : [];
      const updatedHistory = [
        ...currentHistory.filter((e) => e.monthKey !== currentMonth),
        newHistoryEntry,
      ];
      onAssetHistoryChange?.(updatedHistory);

      setAssetAiText('');
      setAssetAiStatus(
        result.message || 'Đã cập nhật tài sản ngoài app.'
      );
    } catch (e) {
      setAssetAiError(e?.message ?? 'AI chưa cập nhật được tài sản ngoài app. Thử lại sau.');
    } finally {
      setAssetAiBusy(false);
    }
  };

  const closeAssetEditModal = () => {
    setEditingAssetId(null);
    setAssetEditDraft(buildAssetEditDraft(null));
    setAssetEditError('');
  };

  const closeAssetDetailModal = () => {
    setSelectedAssetDetailId(null);
  };

  const handleEditAsset = (item) => {
    setEditingAssetId(item.id);
    setAssetEditDraft(buildAssetEditDraft(item));
    setAssetEditError('');
  };

  const updateAssetEditDraft = (key, value) => {
    setAssetEditError('');
    setAssetEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAssetEdit = () => {
    if (!editingAssetId) return;
    const label = normalizeText(assetEditDraft.label);
    const amount = parseAmount(assetEditDraft.amount);
    if (!label) {
      setAssetEditError('Nhập tên tài sản.');
      return;
    }
    if (amount == null || amount <= 0) {
      setAssetEditError('Giá trị tài sản phải lớn hơn 0.');
      return;
    }
    const currentItems = Array.isArray(assetSnapshot?.items) ? assetSnapshot.items : [];
    const items = currentItems.map((item) =>
      String(item?.id) === String(editingAssetId)
        ? {
            ...item,
            label,
            amount: Math.round(Math.abs(amount)),
            location: normalizeText(assetEditDraft.location),
            note: normalizeText(assetEditDraft.note),
          }
        : item
    );
    onAssetSnapshotChange?.({
      ...(assetSnapshot && typeof assetSnapshot === 'object' ? assetSnapshot : {}),
      total: items.reduce((sum, item) => sum + Math.abs(Number(item?.amount) || 0), 0),
      items,
      updatedAt: Date.now(),
    });
    closeAssetEditModal();
  };

  const handleDeleteAsset = (id) => {
    Alert.alert(
      'Xóa tài sản ngoài app?',
      'Mục tài sản này sẽ bị xóa khỏi tổng tài sản ngoài app.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const currentItems = Array.isArray(assetSnapshot?.items)
              ? assetSnapshot.items
              : [];
            const items = currentItems.filter((item) => String(item?.id) !== String(id));
            onAssetSnapshotChange?.({
              ...(assetSnapshot && typeof assetSnapshot === 'object' ? assetSnapshot : {}),
              total: items.reduce(
                (sum, item) => sum + Math.abs(Number(item?.amount) || 0),
                0
              ),
              items,
              updatedAt: Date.now(),
            });
          },
        },
      ]
    );
  };

  const handleAssetGoalAiNote = async () => {
    const text = normalizeText(assetGoalAiText);
    if (!text) {
      setAssetGoalAiError('Nhập mục tiêu như: năm nay đạt 100tr, 5 năm nữa đạt 1 tỷ.');
      setAssetGoalAiStatus('');
      return;
    }

    setAssetGoalAiBusy(true);
    setAssetGoalAiError('');
    setAssetGoalAiStatus('');
    try {
      const result = await fetchAssetGoalsFromAI({
        text,
        currentTotal: currentAssetSnapshot.total,
        currentGoals: allAssetGoals
          .filter((goal) => goal.status !== 'disabled')
          .map((goal) => ({
            label: goal.label,
            targetAmount: goal.targetAmount,
            targetDate: goal.targetDate,
            horizonYears: goal.horizonYears,
          })),
      });

      const createdAt = Date.now();
      let nextGoals = [...allAssetGoals];
      let createdCount = 0;
      let updatedCount = 0;
      for (const goal of result.goals) {
        const labelKey = goal.label.trim().toLowerCase();
        const existing = nextGoals.find(
          (item) =>
            item.status !== 'disabled' &&
            String(item.label ?? '').trim().toLowerCase() === labelKey
        );
        if (existing) {
          nextGoals = nextGoals.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  targetAmount: goal.targetAmount,
                  targetDate: goal.targetDate,
                  horizonYears: goal.horizonYears,
                  note: normalizeText(goal.note),
                  updatedAt: Date.now(),
                  generatedBy: 'openai_asset_goal_v1',
                }
              : item
          );
          updatedCount += 1;
          continue;
        }

        nextGoals = [
          {
            id: `${createdAt}-asset-goal-${createdCount}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            label: goal.label,
            targetAmount: goal.targetAmount,
            targetDate: goal.targetDate,
            horizonYears: goal.horizonYears,
            note: normalizeText(goal.note),
            status: 'active',
            createdAt: createdAt + createdCount,
            updatedAt: createdAt + createdCount,
            generatedBy: 'openai_asset_goal_v1',
          },
          ...nextGoals,
        ];
        createdCount += 1;
      }

      onAssetGoalsChange?.(nextGoals);
      const inferredSnapshot =
        result.currentSnapshot?.total > 0
          ? result.currentSnapshot
          : inferCurrentAssetSnapshotFromText(text);
      if (inferredSnapshot?.total > 0) {
        const now = Date.now();
        const externalTotal = Math.max(
          0,
          inferredSnapshot.total - recordedAssetTotal
        );
        onAssetSnapshotChange?.({
          total: externalTotal,
          items:
            externalTotal > 0
              ? [
                  {
                    id: `${now}-asset-external`,
                    label: 'Tài sản ngoài app',
                    amount: externalTotal,
                  },
                ]
              : [],
          note: normalizeText(
            inferredSnapshot.note,
            'Cập nhật tài sản hiện có từ mục tiêu.'
          ),
          updatedAt: now,
          generatedBy: 'openai_asset_goal_current_v1',
        });
      }
      setAssetGoalAiText('');
      setAssetGoalAiStatus(
        result.message ||
          `Đã tạo ${createdCount} và cập nhật ${updatedCount} mục tiêu tài sản.`
      );
    } catch (e) {
      setAssetGoalAiError(
        e?.message ?? 'AI chưa thiết lập được mục tiêu tài sản. Thử lại sau.'
      );
    } finally {
      setAssetGoalAiBusy(false);
    }
  };

  const handleDisableAssetGoal = (id) => {
    Alert.alert(
      'Xóa mục tiêu tài sản?',
      'Mục tiêu này sẽ bị ẩn khỏi tab Tài sản.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            onAssetGoalsChange?.(
              allAssetGoals.map((goal) =>
                goal.id === id
                  ? { ...goal, status: 'disabled', updatedAt: Date.now() }
                  : goal
              )
            );
          },
        },
      ]
    );
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
                note:
                  loan.type === 'borrowed'
                    ? 'Trả hết'
                    : loan.type === 'held'
                      ? 'Lấy hết'
                      : 'Thu hết',
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

  const handleEditLoan = (loan, mode = 'edit') => {
    setEditingLoanId(loan.id);
    setLoanEditMode(mode === 'payment' ? 'payment' : 'edit');
    setLoanEditDraft(buildLoanEditDraft(loan));
    setLoanEditError('');
  };

  const updateLoanEditDraft = (key, value) => {
    setLoanEditError('');
    setLoanEditDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateLoanPaymentDraft = (paymentId, key, value) => {
    setLoanEditError('');
    setLoanEditDraft((prev) => ({
      ...prev,
      paymentDrafts: (Array.isArray(prev.paymentDrafts) ? prev.paymentDrafts : []).map(
        (payment) =>
          String(payment.id) === String(paymentId)
            ? { ...payment, [key]: value }
            : payment
      ),
    }));
  };

  const removeLoanPaymentDraft = (paymentId) => {
    setLoanEditError('');
    setLoanEditDraft((prev) => ({
      ...prev,
      paymentDrafts: (Array.isArray(prev.paymentDrafts) ? prev.paymentDrafts : []).filter(
        (payment) => String(payment.id) !== String(paymentId)
      ),
    }));
  };

  const handleSaveLoanEdit = () => {
    if (!editingLoanId) return;
    const currentLoan = allLoanRecords.find((loan) => loan.id === editingLoanId);
    if (!currentLoan) return;
    const person = normalizeText(loanEditDraft.person);
    const amount = parseAmount(loanEditDraft.amount);
    const date = parseDateKey(loanEditDraft.date);
    const dueDate = loanEditDraft.dueDate ? parseDateKey(loanEditDraft.dueDate) : null;
    const paymentAmountText = normalizeText(loanEditDraft.paymentAmount);
    const wantsPayment =
      loanEditMode === 'payment' ||
      Boolean(paymentAmountText) ||
      Boolean(normalizeText(loanEditDraft.paymentNote));
    const paymentAmount = wantsPayment ? parseAmount(paymentAmountText) : null;
    const paymentDate = wantsPayment ? parseDateKey(loanEditDraft.paymentDate) : null;

    if (!person) {
      setLoanEditError('Nhập tên người liên quan.');
      return;
    }
    if (amount == null || amount <= 0) {
      setLoanEditError('Số tiền phải lớn hơn 0.');
      return;
    }
    if (!loanEditDraft.dateUnknown && !date) {
      setLoanEditError('Ngày vay nợ cần đúng dạng YYYY-MM-DD.');
      return;
    }
    if (loanEditDraft.dueDate && !dueDate) {
      setLoanEditError('Hạn trả cần đúng dạng YYYY-MM-DD hoặc để trống.');
      return;
    }

    const roundedAmount = Math.round(Math.abs(amount));
    const normalizedPayments = [];
    const paymentDrafts = Array.isArray(loanEditDraft.paymentDrafts)
      ? loanEditDraft.paymentDrafts
      : [];
    for (const [index, payment] of paymentDrafts.entries()) {
      const draftAmount = parseAmount(payment.amount);
      const draftDate = parseDateKey(payment.date);
      if (draftAmount == null || Math.abs(draftAmount) <= 0) {
        setLoanEditError(`Số tiền đợt thu/trả #${index + 1} phải lớn hơn 0.`);
        return;
      }
      if (!draftDate) {
        setLoanEditError(`Ngày đợt thu/trả #${index + 1} cần đúng dạng YYYY-MM-DD.`);
        return;
      }
      normalizedPayments.push({
        id: String(payment.id || `${Date.now()}-payment-${index}`),
        amount: Math.round(Math.abs(draftAmount)),
        date: normalizeText(payment.date),
        note: normalizeText(payment.note),
        createdAt: Number(payment.createdAt) || Date.now() + index,
      });
    }
    const currentPaidAmount = normalizedPayments.reduce(
      (sum, payment) => sum + Math.abs(Number(payment.amount) || 0),
      0
    );
    if (currentPaidAmount > roundedAmount) {
      setLoanEditError(
        `Tổng các đợt thu/trả không được vượt quá ${formatCurrency(roundedAmount)}.`
      );
      return;
    }
    const remainingAmount = Math.max(0, roundedAmount - currentPaidAmount);
    let nextPayment = null;
    if (wantsPayment) {
      if (paymentAmount == null || Math.abs(paymentAmount) <= 0) {
        setLoanEditError('Nhập số tiền của đợt thu/trả nợ.');
        return;
      }
      if (!paymentDate) {
        setLoanEditError('Ngày thu/trả nợ cần đúng dạng YYYY-MM-DD.');
        return;
      }
      const roundedPaymentAmount = Math.round(Math.abs(paymentAmount));
      if (remainingAmount <= 0) {
        setLoanEditError('Khoản vay nợ này đã tất toán.');
        return;
      }
      if (roundedPaymentAmount > remainingAmount) {
        setLoanEditError(`Số tiền thu/trả không được vượt quá ${formatCurrency(remainingAmount)}.`);
        return;
      }
      const now = Date.now();
      nextPayment = {
        id: `${now}-payment-${Math.random().toString(36).slice(2, 8)}`,
        amount: roundedPaymentAmount,
        date: loanEditDraft.paymentDate,
        note: normalizeText(loanEditDraft.paymentNote),
        createdAt: now,
      };
    }

    const next = allLoanRecords.map((loan) => {
      if (loan.id !== editingLoanId) return loan;
      const payments = nextPayment
        ? [...normalizedPayments, nextPayment]
        : normalizedPayments;
      const paidAmount = payments.reduce(
        (sum, payment) => sum + Math.abs(Number(payment.amount) || 0),
        0
      );
      const settled = paidAmount >= roundedAmount;
      return {
        ...loan,
        type: loanEditDraft.type,
        person,
        amount: roundedAmount,
        date: loanEditDraft.dateUnknown ? loan.date || getTodayKey() : loanEditDraft.date,
        dateUnknown: Boolean(loanEditDraft.dateUnknown),
        dueDate: loanEditDraft.dueDate,
        note: normalizeText(loanEditDraft.note),
        payments,
        status: settled ? 'settled' : 'open',
        settledAt: settled ? loan.settledAt || nextPayment?.createdAt || Date.now() : null,
        updatedAt: Date.now(),
      };
    });
    onLoanRecordsChange?.(next);
    closeLoanEditModal();
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
            aiSourceText: normalizeText(tx.aiSourceText, description),
            aiCategoryConfirmed: true,
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

  const handleDuplicate = (tx) => {
    const payload = {
      description: tx.description,
      amount: tx.amount,
      category: tx.category,
      dateTime: new Date().toISOString(),
      note: tx.note || '',
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
    Alert.alert('Thành công', 'Đã nhân bản giao dịch.');
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
          {/* Top Header */}
          <FinanceHeader
            visibleMonth={visibleMonth}
            activeLedgerTab={activeLedgerTab}
            monthLabel={monthLabel}
            reportData={reportData}
            handleNavigateHeader={handleNavigateHeader}
            canNavigateHeader={canNavigateHeader}
          />

          {/* Overview Hero Card (only on transaction tab) */}
          {activeLedgerTab === 'transactions' ? (
            <SummaryHeroCard
              totals={totals}
              formatCurrency={formatCurrency}
              formatSignedAmount={formatSignedAmount}
              EXPENSE_IMAGES={EXPENSE_IMAGES}
            />
          ) : null}

          {/* Tab Specific Overview Card (for non-transaction tabs) */}
          {activeLedgerTab !== 'transactions' ? (
            <TabSummaryCard
              activeLedgerTab={activeLedgerTab}
              totals={totals}
              loanTotals={loanTotals}
              budgetRows={budgetRows}
              reportData={reportData}
              currentAssetSnapshot={currentAssetSnapshot}
              activeRecurringRows={activeRecurringRows}
              jarPercentTotal={jarPercentTotal}
              formatCurrency={formatCurrency}
              formatSignedAmount={formatSignedAmount}
              getTodayKey={getTodayKey}
            />
          ) : null}

          {/* Sub-navigation Ledger Tabs */}
          <FinanceTabs
            activeLedgerTab={activeLedgerTab}
            setActiveLedgerTab={setActiveLedgerTab}
          />

          {activeLedgerTab === 'transactions' ? (
        <GiaoDichTab
          aiBusy={aiBusy}
          aiError={aiError}
          aiStatus={aiStatus}
          aiText={aiText}
          allCategories={allCategories}
          allLoanRecords={allLoanRecords}
          amountPlaceholder={amountPlaceholder}
          canAdd={canAdd}
          categoryById={categoryById}
          categoryDraft={categoryDraft}
          categoryOpen={categoryOpen}
          draft={draft}
          editingId={editingId}
          entryCategories={entryCategories}
          entryPlaceholder={entryPlaceholder}
          entryTitle={entryTitle}
          error={error}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          filter={filter}
          formatSignedAmount={formatSignedAmount}
          getDayLabel={getDayLabel}
          getTransactionDate={getTransactionDate}
          groupedTransactions={groupedTransactions}
          handleAddCategory={handleAddCategory}
          handleAiNote={handleAiNote}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
          handleFilterChange={handleFilterChange}
          FILTERS={FILTERS}
          handleEdit={handleEdit}
          handleEditLoan={handleEditLoan}
          handleSubmit={handleSubmit}
          manualOpen={manualOpen}
          selectedEntryCategory={selectedEntryCategory}
          setActiveLedgerTab={setActiveLedgerTab}
          setAiError={setAiError}
          setAiStatus={setAiStatus}
          setAiText={setAiText}
          setCategoryDraft={setCategoryDraft}
          setCategoryOpen={setCategoryOpen}
          setError={setError}
          setManualOpen={setManualOpen}
          styles={styles}
          timeKeyFromDate={timeKeyFromDate}
          updateDraft={updateDraft}
        />
          ) : null}

          {activeLedgerTab === 'loans' ? (
        <VayNoTab
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          formatDateKeyLabel={formatDateKeyLabel}
          formatSignedAmount={formatSignedAmount}
          getLoanPaidAmount={getLoanPaidAmount}
          getLoanRemainingAmount={getLoanRemainingAmount}
          handleDeleteLoan={handleDeleteLoan}
          handleEditLoan={handleEditLoan}
          handleLoanAiNote={handleLoanAiNote}
          handleSettleLoan={handleSettleLoan}
          isLoanSettled={isLoanSettled}
          loanAiBusy={loanAiBusy}
          loanAiError={loanAiError}
          loanAiStatus={loanAiStatus}
          loanAiText={loanAiText}
          setLoanAiError={setLoanAiError}
          setLoanAiStatus={setLoanAiStatus}
          setLoanAiText={setLoanAiText}
          sortedLoanRecords={sortedLoanRecords}
          styles={styles}
        />
          ) : null}

          {activeLedgerTab === 'budgets' ? (
        <NganSachTab
          budgetAiBusy={budgetAiBusy}
          budgetAiError={budgetAiError}
          budgetAiStatus={budgetAiStatus}
          budgetAiText={budgetAiText}
          budgetRows={budgetRows}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          handleBudgetAiNote={handleBudgetAiNote}
          handleDisableBudget={handleDisableBudget}
          handleEditBudget={handleEditBudget}
          periodLabel={periodLabel}
          setBudgetAiError={setBudgetAiError}
          setBudgetAiStatus={setBudgetAiStatus}
          setBudgetAiText={setBudgetAiText}
          styles={styles}
        />
          ) : null}

          {activeLedgerTab === 'reports' ? (
        <BaoCaoTab
          dateKeyFromDate={dateKeyFromDate}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          formatDateKeyLabel={formatDateKeyLabel}
          formatSignedAmount={formatSignedAmount}
          getTransactionDate={getTransactionDate}
          reportData={reportData}
          reportMode={reportMode}
          setReportMode={setReportMode}
          styles={styles}
          timeKeyFromDate={timeKeyFromDate}
          setActiveLedgerTab={setActiveLedgerTab}
        />
          ) : null}

          {activeLedgerTab === 'assets' ? (
        <TaiSanTab
          assetAiBusy={assetAiBusy}
          assetAiError={assetAiError}
          assetAiStatus={assetAiStatus}
          assetAiText={assetAiText}
          assetGoalAiBusy={assetGoalAiBusy}
          assetGoalAiError={assetGoalAiError}
          assetGoalAiStatus={assetGoalAiStatus}
          assetGoalAiText={assetGoalAiText}
          assetGoalRows={assetGoalRows}
          assetHistory={displayAssetHistory}
          currentAssetSnapshot={currentAssetSnapshot}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          handleAssetAiNote={handleAssetAiNote}
          handleAssetGoalAiNote={handleAssetGoalAiNote}
          handleDeleteAsset={handleDeleteAsset}
          handleDisableAssetGoal={handleDisableAssetGoal}
          handleEditAsset={handleEditAsset}
          monthsLeftLabel={monthsLeftLabel}
          setAssetAiError={setAssetAiError}
          setAssetAiStatus={setAssetAiStatus}
          setAssetAiText={setAssetAiText}
          setAssetGoalAiError={setAssetGoalAiError}
          setAssetGoalAiStatus={setAssetGoalAiStatus}
          setAssetGoalAiText={setAssetGoalAiText}
          setSelectedAssetDetailId={setSelectedAssetDetailId}
          styles={styles}
        />
          ) : null}

          {activeLedgerTab === 'jars' ? (
        <HuTienTab
          activeJarRows={activeJarRows}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          handleDisableJar={handleDisableJar}
          handleEditJar={handleEditJar}
          handleJarAiNote={handleJarAiNote}
          handleOpenJarContribution={handleOpenJarContribution}
          handleViewJarHistory={handleViewJarHistory}
          jarAiBusy={jarAiBusy}
          jarAiError={jarAiError}
          jarAiStatus={jarAiStatus}
          jarAiText={jarAiText}
          jarPercentTotal={jarPercentTotal}
          setJarAiError={setJarAiError}
          setJarAiStatus={setJarAiStatus}
          setJarAiText={setJarAiText}
          styles={styles}
          totals={totals}
        />
          ) : null}

          {activeLedgerTab === 'recurring' ? (
        <GiaoDichDinhKyTab
          activeRecurringRows={activeRecurringRows}
          allCategories={allCategories}
          categoryById={categoryById}
          EXPENSE_IMAGES={EXPENSE_IMAGES}
          formatCurrency={formatCurrency}
          formatDateKeyLabel={formatDateKeyLabel}
          handleAddRecurring={handleAddRecurring}
          handleEditRecurring={handleEditRecurring}
          handlePauseRecurring={handlePauseRecurring}
          handleResumeRecurring={handleResumeRecurring}
          handleDeleteRecurring={handleDeleteRecurring}
          handleApplyRecurring={handleApplyRecurring}
          styles={styles}
        />
          ) : null}






        </ScrollView>
      </KeyboardAvoidingView>
      <GhiTienVaoHu
        closeJarContributionModal={closeJarContributionModal}
        contributionJarId={contributionJarId}
        handleSaveJarContribution={handleSaveJarContribution}
        jarContributionDraft={jarContributionDraft}
        jarContributionError={jarContributionError}
        monthLabel={monthLabel}
        styles={styles}
        updateJarContributionDraft={updateJarContributionDraft}
        visibleMonth={visibleMonth}
      />
      <SuaHuTien
        allCategories={allCategories}
        categoriesForMode={categoriesForMode}
        closeJarEditModal={closeJarEditModal}
        editingJarId={editingJarId}
        handleSaveJarEdit={handleSaveJarEdit}
        jarCategoryOpen={jarCategoryOpen}
        jarEditDraft={jarEditDraft}
        jarEditError={jarEditError}
        setJarCategoryOpen={setJarCategoryOpen}
        styles={styles}
        toggleJarCategory={toggleJarCategory}
        updateJarEditDraft={updateJarEditDraft}
      />
      <ChiTietTaiSan
        appAssetMonthRows={appAssetMonthRows}
        closeAssetDetailModal={closeAssetDetailModal}
        formatCurrency={formatCurrency}
        formatSignedAmount={formatSignedAmount}
        monthLabel={monthLabel}
        selectedAssetDetail={selectedAssetDetail}
        styles={styles}
      />
      <SuaTaiSan
        assetEditDraft={assetEditDraft}
        assetEditError={assetEditError}
        closeAssetEditModal={closeAssetEditModal}
        editingAssetId={editingAssetId}
        handleSaveAssetEdit={handleSaveAssetEdit}
        styles={styles}
        updateAssetEditDraft={updateAssetEditDraft}
      />
      <XacNhanDanhMucAi
        allCategories={allCategories}
        categoriesForMode={categoriesForMode}
        categoryById={categoryById}
        closeAiCategoryConfirm={closeAiCategoryConfirm}
        expandedAiCategoryIndex={expandedAiCategoryIndex}
        formatSignedAmount={formatSignedAmount}
        handleConfirmAiCategories={handleConfirmAiCategories}
        pendingAiTransactions={pendingAiTransactions}
        setExpandedAiCategoryIndex={setExpandedAiCategoryIndex}
        styles={styles}
        updatePendingAiCategory={updatePendingAiCategory}
      />
      <SuaVayNo
        closeLoanEditModal={closeLoanEditModal}
        editingLoanId={editingLoanId}
        handleSaveLoanEdit={handleSaveLoanEdit}
        LOAN_TYPES={LOAN_TYPES}
        loanEditDraft={loanEditDraft}
        loanEditError={loanEditError}
        loanEditMode={loanEditMode}
        removeLoanPaymentDraft={removeLoanPaymentDraft}
        styles={styles}
        updateLoanEditDraft={updateLoanEditDraft}
        updateLoanPaymentDraft={updateLoanPaymentDraft}
      />
      <SuaNganSach
        allCategories={allCategories}
        budgetEditCategoryOpen={budgetEditCategoryOpen}
        budgetEditDraft={budgetEditDraft}
        budgetEditError={budgetEditError}
        categoriesForMode={categoriesForMode}
        categoryById={categoryById}
        closeBudgetEditModal={closeBudgetEditModal}
        editingBudgetId={editingBudgetId}
        handleSaveBudgetEdit={handleSaveBudgetEdit}
        setBudgetEditCategoryOpen={setBudgetEditCategoryOpen}
        styles={styles}
        updateBudgetEditDraft={updateBudgetEditDraft}
      />
      <SuaGiaoDich
        closeEditModal={closeEditModal}
        editCategories={editCategories}
        editCategoryOpen={editCategoryOpen}
        editDraft={editDraft}
        editError={editError}
        editMode={editMode}
        editTitle={editTitle}
        FILTERS={FILTERS}
        handleEditModeChange={handleEditModeChange}
        handleSaveEdit={handleSaveEdit}
        isEditing={isEditing}
        selectedEditCategory={selectedEditCategory}
        setEditCategoryOpen={setEditCategoryOpen}
        styles={styles}
        updateEditDraft={updateEditDraft}
      />
      <SuaGiaoDichDinhKy
        visible={recurringModalOpen}
        draft={recurringDraft}
        error={recurringError}
        editingId={editingRecurringId}
        allCategories={allCategories}
        categoryById={categoryById}
        categoriesForMode={categoriesForMode}
        onClose={closeRecurringModal}
        onSave={handleSaveRecurring}
        onUpdateDraft={updateRecurringDraft}
        styles={styles}
      />
      <LichSuHuTien
        jar={jarHistoryJar}
        formatCurrency={formatCurrency}
        formatDateKeyLabel={formatDateKeyLabel}
        styles={styles}
        visible={jarHistoryJar != null}
        onClose={closeJarHistory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0E0B1F',
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
    overflow: 'hidden',
  },
  expenseHeaderBgImage: {
    borderRadius: 12,
    opacity: 0.22,
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  totalTile: {
    flex: 1,
    minWidth: 120,
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  ledgerTabBtn: {
    flex: 1,
    minWidth: 92,
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
  timeModeRow: {
    marginBottom: 8,
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
  reportCard: {
    backgroundColor: '#0e1118',
    borderWidth: 1,
    borderColor: '#334155',
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
  assetCard: {
    backgroundColor: '#071416',
    borderWidth: 1,
    borderColor: '#164e52',
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
  expenseSectionIcon: {
    width: 36,
    height: 36,
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
  reportAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  reportAvatarText: {
    color: '#7dd3fc',
    fontSize: 16,
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
  assetAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2dd4bf',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  assetAvatarText: {
    color: '#67e8f9',
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
  assetFormulaBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#164e52',
    backgroundColor: '#061d20',
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  assetFormulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  assetFormulaLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  assetFormulaNote: {
    color: '#8db7ba',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  assetFormulaValue: {
    flexShrink: 0,
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  assetFormulaTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#164e52',
    paddingTop: 8,
    marginTop: 2,
  },
  assetFormulaTotalLabel: {
    color: '#cffafe',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  assetFormulaTotalValue: {
    color: '#67e8f9',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  assetItemList: {
    gap: 8,
    marginBottom: 8,
  },
  assetDetailHeading: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  assetItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#164e52',
    backgroundColor: '#0a1c1f',
    padding: 10,
  },
  assetItemTapArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  assetItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  assetItemLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  assetItemSource: {
    color: '#8db7ba',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  assetItemNote: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  assetItemHint: {
    color: '#67e8f9',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  assetItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  assetItemAmount: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '900',
  },
  assetItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  assetDetailHero: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#164e52',
    backgroundColor: '#061d20',
    padding: 12,
    marginBottom: 12,
  },
  assetDetailAmount: {
    color: '#67e8f9',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  assetDetailSection: {
    gap: 8,
    marginBottom: 12,
  },
  assetDetailInfoRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    padding: 10,
  },
  assetDetailInfoLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  assetDetailInfoValue: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  assetMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    padding: 10,
  },
  assetMonthTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  assetMonthMeta: {
    color: '#a0a0c0',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  assetMonthAmount: {
    flexShrink: 0,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
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
  assetGoalSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#164e52',
  },
  assetGoalHeader: {
    marginBottom: 2,
  },
  assetGoalList: {
    gap: 10,
    marginTop: 12,
  },
  assetGoalRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#164e52',
    backgroundColor: '#0a1c1f',
    padding: 10,
  },
  assetGoalTarget: {
    color: '#67e8f9',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  assetGoalProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#67e8f9',
  },
  assetGoalReachedFill: {
    backgroundColor: '#34d399',
  },
  assetGoalDeleteBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#164e52',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  assetGoalDeleteText: {
    color: '#67e8f9',
    fontSize: 11,
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
  reportSummaryBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    padding: 10,
    marginTop: 12,
  },
  reportBigValue: {
    color: '#fb7185',
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  reportRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#273244',
    backgroundColor: '#101622',
    padding: 10,
  },
  reportProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
  reportItemList: {
    borderTopWidth: 1,
    borderTopColor: '#273244',
    marginTop: 10,
    paddingTop: 8,
    gap: 8,
  },
  reportItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportItemTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportItemTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  reportItemAmount: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
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
  jarContributionList: {
    marginTop: 6,
    gap: 2,
  },
  jarActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  },
  budgetDeleteText: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '900',
  },
  budgetActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  budgetEditBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#211c0d',
    paddingHorizontal: 14,
  },
  budgetEditText: {
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
    maxWidth: 120,
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
  loanTypeBtnActive: {
    borderColor: '#e879f9',
    backgroundColor: '#25112b',
  },
  disabledInput: {
    opacity: 0.42,
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
  loanPaymentSection: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d2442',
    backgroundColor: '#0c0c1a',
    padding: 10,
    marginBottom: 12,
  },
  loanPaymentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  loanPaymentTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  loanPaymentHint: {
    color: '#8f86a8',
    fontSize: 10,
    lineHeight: 14,
    marginTop: -4,
  },
  loanPaymentCount: {
    color: '#67e8f9',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.25)',
    backgroundColor: 'rgba(8, 145, 178, 0.12)',
    overflow: 'hidden',
  },
  loanPaymentCardList: {
    gap: 10,
  },
  loanPaymentEditCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a2a50',
    backgroundColor: '#111122',
    padding: 10,
  },
  loanPaymentCardHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  loanPaymentCardTitle: {
    color: '#f5c842',
    fontSize: 12,
    fontWeight: '900',
  },
  loanPaymentDeleteBtn: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    backgroundColor: 'rgba(127, 29, 29, 0.18)',
    paddingHorizontal: 10,
  },
  loanPaymentDeleteText: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: '900',
  },
  loanPaymentNoteInput: {
    minHeight: 62,
    marginBottom: 0,
    textAlignVertical: 'top',
  },
  loanPaymentEmptyCard: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    paddingHorizontal: 10,
  },
  loanPaymentEmptyText: {
    color: '#8f86a8',
    fontSize: 11,
    fontWeight: '700',
  },
  loanNewPaymentBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    backgroundColor: 'rgba(6, 78, 59, 0.12)',
    padding: 10,
    marginBottom: 12,
  },
  loanNewPaymentTitle: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
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
  aiConfirmTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
  },
  aiConfirmSubtitle: {
    color: '#9ca3af',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  aiConfirmRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252542',
    backgroundColor: '#101018',
    padding: 10,
    marginBottom: 12,
  },
  aiConfirmMeta: {
    color: '#a0a0c0',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  aiShowAllBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a44',
    paddingHorizontal: 10,
  },
  aiShowAllText: {
    color: '#f5c842',
    fontSize: 11,
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
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  dayTitle: {
    flex: 1,
    minWidth: 0,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  dayTotalText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
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

  // --- Giao dịch định kỳ ---
  recurringCard: {
    backgroundColor: '#0b1020',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  recurringAvatar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  recurringRow: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 12,
    marginBottom: 10,
  },
  recurringRowPaused: {
    opacity: 0.5,
  },

  // --- Lịch sử hũ tiền ---
  jarViewAllText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  jarHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2a1a',
  },
  jarHistoryCopy: {
    flex: 1,
    marginRight: 8,
  },

  // --- Lịch sử tài sản ---
  assetHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  assetHistoryLeft: {
    flex: 1,
  },
  assetHistoryRight: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  assetHistoryBarTrack: {
    height: 6,
    backgroundColor: '#1a2a1a',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  assetHistoryBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },

  // -----------------------------------------
  // REDESIGNED COMPONENTS STYLES
  // -----------------------------------------
  financeHeaderContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerMainTitle: {
    fontSize: 22,
    color: '#F6C75A',
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bellIconContainer: {
    position: 'relative',
    padding: 6,
  },
  bellIcon: {
    fontSize: 22,
    color: '#F6C75A',
  },
  bellRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FB7185',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navBtnPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#17122E',
    borderWidth: 1.5,
    borderColor: '#F6C75A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  navBtnPillText: {
    color: '#F6C75A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navMonthLabel: {
    fontSize: 16,
    color: '#F8F3E8',
    fontWeight: 'bold',
  },
  // Hero Card Styles
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    backgroundColor: '#17122E',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCardPattern: {
    opacity: 0.12,
    tintColor: '#8B5CF6',
  },
  heroCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  heroCardHeader: {
    flex: 1,
    justifyContent: 'center',
  },
  heroBalanceText: {
    fontSize: 28,
    color: '#F6C75A',
    fontWeight: 'bold',
    textShadowColor: 'rgba(246, 199, 90, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  heroBalanceLabel: {
    fontSize: 12,
    color: '#A8A0C2',
    fontWeight: '600',
  },
  heroChestIcon: {
    width: 65,
    height: 65,
    alignSelf: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(246, 199, 90, 0.25)',
    marginHorizontal: 20,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(14, 11, 31, 0.5)',
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#A8A0C2',
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroStatVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(168, 160, 194, 0.2)',
  },
  incomeTextFantasy: {
    color: '#34D399',
  },
  expenseTextFantasy: {
    color: '#FB7185',
  },
  goldTextFantasy: {
    color: '#F6C75A',
  },
  // Tab Summary Card
  tabSummaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(246, 199, 90, 0.35)',
    backgroundColor: '#17122E',
    marginBottom: 16,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  tabSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabSummaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  tabSummaryLabel: {
    fontSize: 10,
    color: '#A8A0C2',
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tabSummaryVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  tabSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(168, 160, 194, 0.2)',
  },
  // Finance Tabs Styles
  financeTabsOuter: {
    marginBottom: 16,
  },
  financeTabsContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  financeTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#17122E',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    marginRight: 6,
  },
  financeTabBtnActive: {
    backgroundColor: '#F6C75A',
    borderColor: '#FFD66B',
    shadowColor: '#F6C75A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  financeTabText: {
    color: '#A8A0C2',
    fontSize: 13,
    fontWeight: 'bold',
  },
  financeTabTextActive: {
    color: '#0E0B1F',
    fontWeight: '800',
  },
});
