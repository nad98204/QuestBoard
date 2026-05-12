export const STORAGE_KEY = '@questboard/state_v1';

export const WORK_TASK_XP = 20;
export const GOOD_HABIT_XP = 15;
export const EXERCISE_FULL_XP = 45;
export const BAD_HABIT_SUCCESS_XP = 12;
export const OVERCOME_XP = { easy: 60, normal: 100, hard: 150 };

export const HP_HEAL_ON_COMPLETE = 3;
export const HP_DAMAGE_BAD_HABIT = 18;
export const DEATH_XP_PENALTY = 0.2;
export const DEATH_DEBUFF_HOURS = 24;
export const DEATH_DEBUFF_XP_MULT = 0.8;
export const REVIVAL_HP = 30;

export const STATS = {
  strength: {
    id: 'strength',
    icon: '💪',
    name: 'strength',
    label: 'Sức mạnh',
    effect: 'Tăng khi hoàn thành hít đất/gập bụng. Mỗi level tăng chỉ tiêu hít đất +2.',
  },
  endurance: {
    id: 'endurance',
    icon: '🏃',
    name: 'endurance',
    label: 'Thể lực',
    effect: 'Tăng khi hoàn thành chạy bộ. Mỗi level tăng chỉ tiêu chạy +0.1km.',
  },
  spirit: {
    id: 'spirit',
    icon: '🧘',
    name: 'spirit',
    label: 'Tinh thần',
    effect: 'Tăng khi thiền và giữ nhịp phục hồi tinh thần.',
  },
  discipline: {
    id: 'discipline',
    icon: '🛡️',
    name: 'discipline',
    label: 'Kỷ luật',
    effect: 'Tăng khi tránh thói xấu thành công.',
  },
  wisdom: {
    id: 'wisdom',
    icon: '🧠',
    name: 'wisdom',
    label: 'Trí tuệ',
    effect: 'Tăng khi đọc sách và hoàn thành quest vượt bản thân.',
  },
};

export const STAT_MILESTONES = {
  strength: {
    10: {
      type: 'fitness_boost',
      desc: '💪 Sức mạnh Lv.10: tốc độ tăng chỉ tiêu push/sit x2',
    },
  },
  endurance: {
    10: {
      type: 'fitness_boost',
      desc: '🏃 Thể lực Lv.10: tốc độ tăng chỉ tiêu chạy x2',
    },
  },
  spirit: {
    5: {
      type: 'hp_shield',
      desc: '🧘 Tinh thần Lv.5: damage từ bad habit 18 → 14',
    },
  },
  discipline: {
    5: {
      type: 'xp_boost',
      desc: '🛡️ Kỷ luật Lv.5: XP bad habit ok tăng 12 → 16',
    },
  },
  wisdom: {
    5: {
      type: 'xp_boost',
      desc: '🧠 Trí tuệ Lv.5: XP overcome quest +10%',
    },
  },
};

export const GOOD_HABITS = [
  { id: 'sleep', label: 'Ngủ đúng giờ', icon: '🌙' },
  { id: 'water', label: 'Uống đủ nước', icon: '💧' },
  { id: 'meditate', label: 'Thiền', icon: '🧘' },
  { id: 'read', label: 'Đọc sách', icon: '📖' },
];

export const BAD_HABITS = [
  { id: 'no_social', label: 'Không lạm dụng MXH', icon: '📵' },
  { id: 'no_junk', label: 'Không junk food', icon: '🍟' },
  { id: 'no_delay', label: 'Không trì hoãn', icon: '⏳' },
];

export const OVERCOME_POOL = [
  { id: 'oc1', title: 'Tắm nước lạnh 2 phút', tier: 'easy' },
  { id: 'oc2', title: 'Học kỹ năng mới 15 phút', tier: 'normal' },
  { id: 'oc3', title: 'Deep work 2h (không điện thoại)', tier: 'hard' },
  { id: 'oc4', title: 'Dọn góc làm việc / phòng', tier: 'easy' },
  { id: 'oc5', title: 'Viết nhật ký 10 phút', tier: 'easy' },
  { id: 'oc6', title: 'Gọi cho người thân 15 phút', tier: 'normal' },
];

export const DIFFICULTY_DAILY_MULT = 1.0001;

export const PENALTY_THRESHOLD = 0.5;
export const PENALTY_HP_COST = 20;
export const PENALTY_QUESTS = [
  "Hoàn thành 30 hít đất liên tục",
  "Chạy bộ 2km không nghỉ", 
  "Thiền 15 phút không gián đoạn",
  "Không dùng điện thoại 2 giờ liên tục",
  "Đọc sách 30 trang trong ngày",
  "Viết nhật ký phản tư 1 trang",
  "Thức dậy và tập thể dục trước 6 giờ sáng"
];
