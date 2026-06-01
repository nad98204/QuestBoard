import { MANA_BASE_MAX } from './constants';
import { normalizeStats } from './rpg';

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nonNegativeInt(value) {
  return Math.max(0, Math.floor(finiteNumber(value, 0)));
}

function titleFromId(id) {
  return String(id ?? '')
    .replace(/^item_/, '')
    .replace(/^boss_/, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeStringList(value, limit = 50) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(-Math.max(0, nonNegativeInt(limit)));
}

const ITEM_CATALOG = {
  item_large_hp_potion: {
    name: 'Bình Máu Lớn',
    rarity: 'Rare',
    iconKey: 'item_large_hp_potion',
    scope: 'Ngoài boss',
    useType: 'restore_hp',
    description: 'Hồi 25 HP.',
    useStatus: 'Sẵn sàng',
  },
  item_large_mana_potion: {
    name: 'Bình Mana Lớn',
    rarity: 'Rare',
    iconKey: 'item_large_mana_potion',
    scope: 'Ngoài boss',
    useType: 'restore_mp',
    description: 'Hồi 35 MP.',
    useStatus: 'Sẵn sàng',
  },
  item_life_shield: {
    name: 'Khiên Sinh Mệnh',
    rarity: 'Rare',
    iconKey: 'item_life_shield',
    scope: 'Ngoài boss',
    useType: 'prevent_hp_loss',
    description: 'Chặn mất HP 1 lần.',
    useStatus: 'Sẵn sàng',
  },
  item_streak_freeze: {
    name: 'Bình Đóng Băng Chuỗi',
    rarity: 'Epic',
    iconKey: 'item_streak_freeze',
    scope: 'Ngoài boss',
    useType: 'protect_streak',
    description: 'Nghỉ 1 ngày không mất chuỗi.',
    useStatus: 'Cực hiếm',
  },
  item_rest_permit: {
    name: 'Giấy Nghỉ Phép',
    rarity: 'Legendary',
    iconKey: 'item_rest_permit',
    scope: 'Ngoài boss',
    useType: 'valid_rest_day',
    description: 'Một ngày nghỉ hợp lệ, không phạt HP/chuỗi.',
    useStatus: 'Cực hiếm',
  },
  item_death_pardon: {
    name: 'Lệnh Miễn Tử',
    rarity: 'Mythic',
    iconKey: 'item_death_pardon',
    scope: 'Ngoài boss',
    useType: 'death_pardon',
    description: 'Một lần chết không mất chuỗi hoặc dính debuff.',
    useStatus: 'Cực hiếm',
  },
  item_lucky_charm: {
    name: 'Bùa May Mắn Nhỏ',
    rarity: 'Epic',
    iconKey: 'item_lucky_charm',
    scope: 'Trong boss',
    useType: 'loot_boost',
    description: 'Tăng nhẹ tỉ lệ đồ hiếm trong 1 trận sau.',
    useStatus: 'Dùng trong boss',
  },
  item_extend_order: {
    name: 'Lệnh Gia Hạn',
    rarity: 'Epic',
    iconKey: 'item_extend_order',
    scope: 'Trong boss',
    useType: 'extend_boss_task',
    description: 'Gia hạn 1 nhiệm vụ boss.',
    useStatus: 'Dùng trong boss',
  },
  item_world_core: {
    name: 'Lõi Boss Thế Giới',
    rarity: 'Mythic',
    iconKey: 'item_world_core',
    scope: 'Nguyên liệu',
    useType: 'crafting_material',
    description: 'Nguyên liệu cực hiếm cho hệ boss sau này.',
    useStatus: 'Chưa mở khóa',
  },
};

function getItemDefinition(itemId) {
  return ITEM_CATALOG[itemId] ?? {
    name: titleFromId(itemId),
    rarity: 'Không rõ',
    iconKey: itemId,
    scope: 'Không rõ',
    useType: 'unknown',
    description: '',
    useStatus: 'Chưa rõ',
  };
}

function parseRate(rate) {
  if (typeof rate === 'number') return Math.max(0, rate);
  const raw = String(rate ?? '').replace('%', '').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function addInventoryItem(inventory, item, quantity = 1) {
  const itemId = String(item.itemId ?? item.id ?? '').trim();
  if (!itemId) {
    return inventory && typeof inventory === 'object'
      ? inventory
      : { items: {}, activeEffects: [] };
  }
  const base =
    inventory && typeof inventory === 'object' && !Array.isArray(inventory)
      ? inventory
      : {};
  const items =
    base.items && typeof base.items === 'object' && !Array.isArray(base.items)
      ? base.items
      : {};
  const current = items[itemId] ?? {};
  const definition = getItemDefinition(itemId);
  const nextQuantity =
    nonNegativeInt(current.quantity) + Math.max(1, nonNegativeInt(quantity));
  const now = Date.now();

  return {
    ...base,
    items: {
      ...items,
      [itemId]: {
        ...current,
        itemId,
        name: item.name ?? current.name ?? definition.name,
        rarity: item.rarity ?? current.rarity ?? definition.rarity,
        iconKey: item.iconKey ?? current.iconKey ?? definition.iconKey,
        scope: item.scope ?? current.scope ?? definition.scope,
        useType: item.useType ?? current.useType ?? definition.useType,
        useStatus: item.useStatus ?? current.useStatus ?? definition.useStatus,
        description:
          item.description ?? current.description ?? definition.description,
        quantity: nextQuantity,
        totalObtained:
          nonNegativeInt(current.totalObtained) +
          Math.max(1, nonNegativeInt(quantity)),
        firstObtainedAt:
          typeof current.firstObtainedAt === 'number'
            ? current.firstObtainedAt
            : now,
        updatedAt: now,
        lastUsedAt:
          typeof current.lastUsedAt === 'number' ? current.lastUsedAt : null,
      },
    },
    activeEffects: Array.isArray(base.activeEffects)
      ? base.activeEffects
      : [],
  };
}

function getManaMaxForProfile(profile) {
  const stats = normalizeStats(profile?.stats);
  const levelBonus = Math.floor(Math.max(0, (profile?.level ?? 1) - 1) / 5) * 5;
  return (
    MANA_BASE_MAX +
    levelBonus +
    nonNegativeInt(stats.spirit.level) * 3 +
    nonNegativeInt(stats.wisdom.level) * 2
  );
}

function normalizeInventoryObject(inventory) {
  return inventory && typeof inventory === 'object' && !Array.isArray(inventory)
    ? {
        items:
          inventory.items &&
          typeof inventory.items === 'object' &&
          !Array.isArray(inventory.items)
            ? inventory.items
            : {},
        activeEffects: Array.isArray(inventory.activeEffects)
          ? inventory.activeEffects.filter(
              (effect) => effect && typeof effect === 'object'
            )
          : [],
      }
    : { items: {}, activeEffects: [] };
}

function consumeInventoryItem(inventory, itemId, now = Date.now()) {
  const base = normalizeInventoryObject(inventory);
  const current = base.items[itemId];
  const quantity = nonNegativeInt(current?.quantity);
  if (!current || quantity <= 0) {
    return { inventory: base, item: null, consumed: false };
  }

  const nextItems = { ...base.items };
  if (quantity <= 1) {
    delete nextItems[itemId];
  } else {
    nextItems[itemId] = {
      ...current,
      quantity: quantity - 1,
      lastUsedAt: now,
      updatedAt: now,
    };
  }

  return {
    inventory: {
      ...base,
      items: nextItems,
    },
    item: current,
    consumed: true,
  };
}

function addActiveInventoryEffect(inventory, item, now = Date.now()) {
  const base = normalizeInventoryObject(inventory);
  const definition = getItemDefinition(item.itemId);
  const useType = String(item.useType ?? definition.useType);
  const duplicate = base.activeEffects.some(
    (effect) => effect?.useType === useType && effect?.status === 'active'
  );
  if (duplicate) {
    return {
      inventory: base,
      added: false,
      reason: 'Hiệu ứng này đang bật, không thể dùng trùng.',
    };
  }

  return {
    inventory: {
      ...base,
      activeEffects: [
        ...base.activeEffects,
        {
          id: `effect_${item.itemId}_${now}`,
          itemId: item.itemId,
          name: item.name ?? definition.name,
          useType,
          rarity: item.rarity ?? definition.rarity,
          status: 'active',
          createdAt: now,
          consumedAt: null,
        },
      ],
    },
    added: true,
    reason: '',
  };
}

export function consumeInventoryEffect(inventory, useTypes, now = Date.now()) {
  const base = normalizeInventoryObject(inventory);
  const types = Array.isArray(useTypes) ? useTypes : [useTypes];
  const normalizedTypes = types.map((type) => String(type ?? '')).filter(Boolean);
  if (normalizedTypes.length === 0) {
    return { inventory: base, effect: null };
  }

  const index = base.activeEffects.findIndex(
    (effect) =>
      effect?.status === 'active' && normalizedTypes.includes(effect.useType)
  );
  if (index < 0) {
    return { inventory: base, effect: null };
  }

  const effect = base.activeEffects[index];
  const activeEffects = base.activeEffects.map((row, rowIndex) =>
    rowIndex === index
      ? {
          ...row,
          status: 'consumed',
          consumedAt: now,
        }
      : row
  );

  return {
    inventory: {
      ...base,
      activeEffects,
    },
    effect,
  };
}

export function useInventoryItem(state, itemId, now = Date.now()) {
  const itemKey = String(itemId ?? '').trim();
  const inventory = normalizeInventoryObject(state?.inventory);
  const current = inventory.items[itemKey];
  const quantity = nonNegativeInt(current?.quantity);
  if (!itemKey || !current || quantity <= 0) {
    return {
      state,
      success: false,
      message: 'Không có vật phẩm này trong túi đồ.',
    };
  }

  const definition = getItemDefinition(itemKey);
  const item = {
    ...definition,
    ...current,
    itemId: itemKey,
    quantity,
  };
  const profile = state?.profile ?? {};
  const useType = String(item.useType ?? definition.useType);

  if (useType === 'restore_hp') {
    const maxHp = Math.max(1, nonNegativeInt(profile.maxHp ?? 100));
    const before = nonNegativeInt(profile.hp);
    const after = Math.min(maxHp, before + 25);
    if (after <= before) {
      return {
        state,
        success: false,
        message: 'HP đang đầy, không cần dùng bình máu.',
      };
    }
    const consumed = consumeInventoryItem(inventory, itemKey, now);
    return {
      state: {
        ...state,
        profile: { ...profile, hp: after },
        inventory: consumed.inventory,
      },
      success: true,
      message: `Đã dùng ${item.name}: +${after - before} HP.`,
    };
  }

  if (useType === 'restore_mp') {
    const maxMana = getManaMaxForProfile(profile);
    const before = nonNegativeInt(profile.mana);
    const after = Math.min(maxMana, before + 35);
    if (after <= before) {
      return {
        state,
        success: false,
        message: 'MP đang đầy, không cần dùng bình mana.',
      };
    }
    const consumed = consumeInventoryItem(inventory, itemKey, now);
    return {
      state: {
        ...state,
        profile: { ...profile, mana: after },
        inventory: consumed.inventory,
      },
      success: true,
      message: `Đã dùng ${item.name}: +${after - before} MP.`,
    };
  }

  if (useType === 'extend_boss_task') {
    const bossState = state?.boss && typeof state.boss === 'object'
      ? state.boss
      : null;
    const currentBoss =
      bossState?.currentBoss && typeof bossState.currentBoss === 'object'
        ? bossState.currentBoss
        : null;
    const status = String(currentBoss?.status ?? '');
    const endsAt = Number(currentBoss?.endsAt);
    if (
      !currentBoss ||
      ['defeated', 'expired'].includes(status) ||
      !Number.isFinite(endsAt)
    ) {
      return {
        state,
        success: false,
        message: 'Chỉ có thể gia hạn khi boss đang hoạt động.',
      };
    }

    const extensionMs = 2 * 60 * 60 * 1000;
    const nextEndsAt = Math.max(now, endsAt) + extensionMs;
    const consumed = consumeInventoryItem(inventory, itemKey, now);
    return {
      state: {
        ...state,
        boss: {
          ...bossState,
          currentBoss: {
            ...currentBoss,
            endsAt: nextEndsAt,
            extendedAt: now,
            extensionItemId: itemKey,
          },
        },
        inventory: consumed.inventory,
      },
      success: true,
      message: `Đã dùng ${item.name}: boss được gia hạn 2 giờ.`,
    };
  }

  if (
    [
      'prevent_hp_loss',
      'protect_streak',
      'valid_rest_day',
      'death_pardon',
      'loot_boost',
    ].includes(useType)
  ) {
    const withEffect = addActiveInventoryEffect(inventory, item, now);
    if (!withEffect.added) {
      return {
        state,
        success: false,
        message: withEffect.reason,
      };
    }
    const consumed = consumeInventoryItem(withEffect.inventory, itemKey, now);
    return {
      state: {
        ...state,
        inventory: consumed.inventory,
      },
      success: true,
      message: `Đã kích hoạt ${item.name}.`,
    };
  }

  return {
    state,
    success: false,
    message: 'Vật phẩm này chưa có công dụng trong bản hiện tại.',
  };
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.round(randomFloat(min, max));
}

function pickOne(list, fallback = null) {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  return list[Math.floor(Math.random() * list.length)] ?? fallback;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const DISCIPLINE_PROTECTION_ITEM_IDS = new Set([
  'item_streak_freeze',
  'item_rest_permit',
  'item_death_pardon',
]);

const DROP_RATE_CAPS_BY_TIER = {
  item_large_mana_potion: [0, 12, 13, 14, 15, 16],
  item_large_hp_potion: [0, 10, 11, 12, 13, 14],
  item_life_shield: [0, 8, 9, 10, 11, 12],
  item_extend_order: [0, 0, 2, 2.4, 2.8, 3.2],
  item_lucky_charm: [0, 0, 0, 0.7, 1, 1.3],
  item_streak_freeze: [0, 0, 0.35, 0.55, 0.75, 1],
  item_rest_permit: [0, 0, 0, 0, 0.12, 0.25],
  item_death_pardon: [0, 0, 0, 0, 0.03, 0.08],
  item_world_core: [0, 0, 0, 0, 0, 0.05],
};

function getDropRateCap(itemId, lootTier) {
  const tier = clampNumber(nonNegativeInt(lootTier), 1, 5);
  const caps = DROP_RATE_CAPS_BY_TIER[itemId];
  if (!caps) return 8;
  return caps[tier] ?? 0;
}

function formatDropRate(rate) {
  const n = Math.max(0, Number(rate) || 0);
  if (n <= 0) return '0%';
  if (n < 0.1) return `${Math.round(n * 100) / 100}%`;
  if (n < 1) return `${Math.round(n * 10) / 10}%`;
  return `${Math.round(n)}%`;
}

function clampLootEntryRate(entry, lootTier) {
  const itemId = String(entry?.itemId ?? entry?.id ?? '').trim();
  const cap = getDropRateCap(itemId, lootTier);
  const rawRate = parseRate(entry?.rate ?? entry?.dropRate);
  return formatDropRate(Math.min(rawRate, cap));
}

export function calculatePlayerPower(profile) {
  const stats = normalizeStats(profile?.stats);
  const totalStatLevel = Object.values(stats).reduce(
    (sum, stat) => sum + nonNegativeInt(stat.level),
    0
  );

  const sources = [
    {
      id: 'level',
      label: 'Level nhân vật',
      value: nonNegativeInt(profile?.level || 1),
      multiplier: 100,
    },
    {
      id: 'hp',
      label: 'HP hiện tại',
      value: nonNegativeInt(profile?.hp),
      multiplier: 4,
    },
    {
      id: 'mana',
      label: 'MP hiện tại',
      value: nonNegativeInt(profile?.mana),
      multiplier: 3,
    },
    {
      id: 'stats',
      label: 'Tong level 5 chi so',
      value: totalStatLevel,
      multiplier: 80,
    },
    {
      id: 'streak',
      label: 'Chuỗi',
      value: nonNegativeInt(profile?.streak),
      multiplier: 35,
    },
    {
      id: 'quests',
      label: 'Tổng nhiệm vụ đã hoàn thành',
      value: nonNegativeInt(profile?.lifetimeQuestsCompleted),
      multiplier: 2,
    },
    {
      id: 'exercise',
      label: 'Ngày thể dục hoàn hảo',
      value: nonNegativeInt(profile?.lifetimeExercisePerfectDays),
      multiplier: 25,
    },
    {
      id: 'overcome',
      label: 'Quest vượt bản thân đã xong',
      value: nonNegativeInt(profile?.lifetimeOvercomeCompleted),
      multiplier: 20,
    },
  ].map((source) => ({
    ...source,
    points: source.value * source.multiplier,
  }));

  return {
    total: sources.reduce((sum, source) => sum + source.points, 0),
    sources,
    totalStatLevel,
  };
}

export function getPowerRank(power) {
  const value = nonNegativeInt(power);
  if (value >= 300000) return 'Siêu việt';
  if (value >= 150000) return 'Chúa tể';
  if (value >= 80000) return 'Thần thoại';
  if (value >= 40000) return 'Bất tử';
  if (value >= 20000) return 'Huyền thoại';
  if (value >= 10000) return 'Anh hùng';
  if (value >= 6000) return 'Hiệp sĩ';
  if (value >= 3000) return 'Dũng sĩ';
  if (value >= 1000) return 'Chiến binh';
  return 'Tập sự';
}

export function formatPower(value) {
  return nonNegativeInt(value).toLocaleString('vi-VN');
}

export function createMockBossEvent(
  now = Date.now(),
  durationMs = 3 * 60 * 60 * 1000 + 24 * 60 * 1000
) {
  return {
    id: 'mock_weekly_event',
    eventType: 'weekly',
    status: 'countdown',
    revealAt: now + Math.max(0, nonNegativeInt(durationMs)),
    title: 'Boss Tuần sắp xuất hiện',
    hiddenLabel: '???',
  };
}

function createDateAt(base, hour, minute = 0, dayOffset = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysUntilWeekday(from, targetDay) {
  const current = from.getDay();
  return (targetDay - current + 7) % 7;
}

export function createNextLocalBossEvent(now = Date.now()) {
  const base = new Date(now);
  const candidates = [];

  [
    {
      eventType: 'work',
      title: 'Boss Công Việc sắp xuất hiện',
      hour: 10,
      minute: 0,
    },
    {
      eventType: 'fitness',
      title: 'Boss Thể Dục sắp xuất hiện',
      hour: 16,
      minute: 30,
    },
    {
      eventType: 'discipline',
      title: 'Boss Kỷ Luật sắp xuất hiện',
      hour: 20,
      minute: 0,
    },
  ].forEach((slot) => {
    for (let dayOffset = 0; dayOffset <= 1; dayOffset += 1) {
      const at = createDateAt(base, slot.hour, slot.minute, dayOffset);
      if (at.getTime() > now + 5 * 60 * 1000) {
        candidates.push({
          ...slot,
          revealAt: at.getTime(),
        });
        break;
      }
    }
  });

  const saturdayOffset = daysUntilWeekday(base, 6);
  const weeklyAt = createDateAt(base, 10, 0, saturdayOffset);
  if (weeklyAt.getTime() <= now + 5 * 60 * 1000) {
    weeklyAt.setDate(weeklyAt.getDate() + 7);
  }
  candidates.push({
    eventType: 'weekly',
    title: 'Boss Tuần sắp xuất hiện',
    revealAt: weeklyAt.getTime(),
  });

  const next = candidates.sort((a, b) => a.revealAt - b.revealAt)[0];

  return {
    id: `local_${next.eventType}_${next.revealAt}`,
    eventType: next.eventType,
    status: 'countdown',
    startsAt: now,
    revealAt: next.revealAt,
    title: next.title,
    hiddenLabel: '???',
    source: 'local_scheduler_v1',
  };
}

export function createScheduledBossState(now = Date.now()) {
  return {
    currentEvent: createNextLocalBossEvent(now),
    currentBoss: null,
    tasks: [],
    rules: null,
    lootTable: null,
    taskGenerator: null,
    results: [],
    lastSeenBossTemplateIds: [],
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    notifiedHunterRank: '',
    lastHunterRankUnlockedAt: 0,
  };
}

export function finishCurrentBossAndScheduleNext(bossState, now = Date.now()) {
  const base =
    bossState && typeof bossState === 'object' && !Array.isArray(bossState)
      ? bossState
      : {};
  const boss =
    base.currentBoss && typeof base.currentBoss === 'object'
      ? base.currentBoss
      : null;
  const previousIds = Array.isArray(base.lastSeenBossTemplateIds)
    ? base.lastSeenBossTemplateIds
        .map((id) => String(id ?? '').trim())
        .filter(Boolean)
    : [];
  const bossTemplateId = String(boss?.templateId ?? boss?.imageKey ?? '').trim();
  const lastSeenBossTemplateIds = bossTemplateId
    ? [...previousIds.filter((id) => id !== bossTemplateId), bossTemplateId].slice(-20)
    : previousIds.slice(-20);

  return {
    currentEvent: createNextLocalBossEvent(now),
    currentBoss: null,
    tasks: [],
    rules: null,
    lootTable: null,
    taskGenerator: null,
    results: Array.isArray(base.results)
      ? base.results.filter((result) => result && typeof result === 'object')
      : [],
    lastSeenBossTemplateIds,
    unlockedAchievementIds: normalizeStringList(base.unlockedAchievementIds),
    lastUnlockedAchievementIds: normalizeStringList(base.lastUnlockedAchievementIds, 10),
    lastAchievementUnlockedAt: nonNegativeInt(base.lastAchievementUnlockedAt),
    notifiedHunterRank: String(base.notifiedHunterRank ?? ''),
    lastHunterRankUnlockedAt: nonNegativeInt(base.lastHunterRankUnlockedAt),
  };
}

const BOSS_TEMPLATE_BY_EVENT_TYPE = {
  work: {
    id: 'boss_procrastination_ghost',
    name: 'Bóng Ma Trì Hoãn',
    typeLabel: 'Boss Công Việc',
    themeLabel: 'Trì hoãn công việc',
    difficulty: 'Khó',
    powerRange: [1.08, 1.22],
    requiredRange: [0.62, 0.72],
    hpRange: [3.0, 3.6],
    durationHoursRange: [8, 12],
    lootTier: 1,
    variants: [
      'Bóng Ma Trì Hoãn',
      'Kẻ Ăn Cắp Hạn Chót',
      'Pháp Sư Sao Lãng',
    ],
    skillName: 'Hồi Máu Trì Hoãn',
    skillDescription: 'Trễ hạn sẽ làm boss hồi máu trong bản thật.',
  },
  fitness: {
    id: 'boss_lazy_demon',
    name: 'Quỷ Lười Biếng',
    typeLabel: 'Boss Thể Dục',
    themeLabel: 'Vượt lười vận động',
    difficulty: 'Khó',
    powerRange: [1.12, 1.28],
    requiredRange: [0.62, 0.75],
    hpRange: [3.2, 3.9],
    durationHoursRange: [4, 7],
    lootTier: 1,
    variants: [
      'Quỷ Lười Biếng',
      'Cuồng Thú Thân Xác',
      'Kẻ Nuốt Sức Bền',
    ],
    skillName: 'Thân Xác Nặng Nề',
    skillDescription: 'Nhiệm vụ quá dễ sẽ gây ít sát thương hơn trong bản thật.',
  },
  discipline: {
    id: 'boss_chain_breaker',
    name: 'Kẻ Phá Chuỗi',
    typeLabel: 'Boss Kỷ Luật',
    themeLabel: 'Bảo vệ chuỗi',
    difficulty: 'Rất khó',
    powerRange: [1.22, 1.42],
    requiredRange: [0.68, 0.82],
    hpRange: [3.7, 4.5],
    durationHoursRange: [3, 5],
    lootTier: 2,
    variants: [
      'Kẻ Phá Chuỗi',
      'Quản Giám Ngục Thói Quen',
      'Sát Thủ Kỷ Luật',
    ],
    skillName: 'Xích Gãy',
    skillDescription: 'Fail nhiem vu ky luat se tang giap boss trong ban that.',
  },
  weekly: {
    id: 'boss_weekend_gate_knight',
    name: 'Kỵ Sĩ Cuối Tuần',
    typeLabel: 'Boss Tuần',
    themeLabel: 'Kỷ luật tổng hợp',
    difficulty: 'Rất khó',
    powerRange: [1.25, 1.55],
    requiredRange: [0.65, 0.82],
    hpRange: [4.0, 5.4],
    durationHoursRange: [18, 28],
    lootTier: 3,
    variants: [
      'Kỵ Sĩ Cuối Tuần',
      'Người Gác Cổng Thứ Bảy',
      'Lãnh Chúa Ngày Nghỉ',
    ],
    skillName: 'Giáp Cuối Tuần',
    skillDescription:
      'Can hoan thanh it nhat 2 nhom nhiem vu khac nhau de pha giap.',
  },
  elite: {
    id: 'boss_elite_shadow_hunter',
    name: 'Thợ Săn Bóng Tối',
    typeLabel: 'Boss Tinh Anh',
    themeLabel: 'Thử thách giới hạn',
    difficulty: 'Ác mộng',
    powerRange: [1.55, 1.9],
    requiredRange: [0.78, 0.95],
    hpRange: [5.0, 6.5],
    durationHoursRange: [4, 8],
    lootTier: 4,
    variants: [
      'Thợ Săn Bóng Tối',
      'Kiếm Sĩ Hoàng Hôn',
      'Kẻ Truy Sát Mạnh Nhất',
    ],
    skillName: 'Săn Mồi Yếu Điểm',
    skillDescription: 'Nhiệm vụ bỏ dở sẽ làm các nhiệm vụ sau khó hơn.',
  },
  world: {
    id: 'boss_world_abyss_king',
    name: 'Vương Giả Vực Sâu',
    typeLabel: 'Boss Thế Giới',
    themeLabel: 'Đột phá thực lực',
    difficulty: 'Thế giới',
    powerRange: [2.2, 3.2],
    requiredRange: [0.9, 1.12],
    hpRange: [7.5, 10],
    durationHoursRange: [12, 24],
    lootTier: 5,
    variants: [
      'Vương Giả Vực Sâu',
      'Long Đế Bóng Tối',
      'Quân Vương Cổng Đoạn',
    ],
    skillName: 'Áp Lực Thế Giới',
    skillDescription: 'Chỉ người đủ lực chiến mới được tham chiến.',
  },
};

function getBossTemplateForEvent(eventType = 'weekly') {
  return BOSS_TEMPLATE_BY_EVENT_TYPE[eventType] ?? BOSS_TEMPLATE_BY_EVENT_TYPE.weekly;
}

function getGeneratedBossTier(eventType, bossPower, playerPower) {
  if (eventType === 'world') return 'World';
  if (eventType === 'elite') return 'Elite';
  const ratio = bossPower / Math.max(1, playerPower);
  if (ratio >= 1.45) return 'Nightmare';
  if (ratio >= 1.25) return 'Hard';
  return 'Standard';
}

function createGeneratedStatLine(bossPower, template) {
  const budget = Math.max(100, Math.round(bossPower / 12));
  const attackBias = template.eventType === 'fitness' ? 1.15 : 1;
  const defenseBias = template.eventType === 'discipline' ? 1.18 : 1;
  const focusBias = template.eventType === 'work' ? 1.2 : 1;
  return {
    attack: Math.round(budget * randomFloat(0.9, 1.18) * attackBias),
    defense: Math.round(budget * randomFloat(0.82, 1.12) * defenseBias),
    speed: Math.round(budget * randomFloat(0.72, 1.08)),
    focus: Math.round(budget * randomFloat(0.86, 1.22) * focusBias),
  };
}

export function createMockRevealedBoss(
  playerPower,
  eventType = 'weekly',
  now = Date.now()
) {
  const template = getBossTemplateForEvent(eventType);
  const eventTemplate = { ...template, eventType };
  const basePower = Math.max(1000, nonNegativeInt(playerPower));
  const [powerMin, powerMax] = template.powerRange ?? [1.2, 1.35];
  const [requiredMin, requiredMax] = template.requiredRange ?? [0.65, 0.8];
  const [hpMin, hpMax] = template.hpRange ?? [3.5, 4.5];
  const [durationMin, durationMax] = template.durationHoursRange ?? [12, 24];
  const bossPower = Math.round(basePower * randomFloat(powerMin, powerMax));
  const requiredPower = Math.round(bossPower * randomFloat(requiredMin, requiredMax));
  const recommendedPower = bossPower;
  const maxHp = Math.round(bossPower * randomFloat(hpMin, hpMax));
  const currentHp = maxHp;
  const level = Math.max(1, Math.round(Math.sqrt(bossPower) / 2));
  const durationHours = randomFloat(durationMin, durationMax);
  const generatedName = pickOne(template.variants, template.name);
  const generatedTier = getGeneratedBossTier(eventType, bossPower, basePower);

  return {
    id: `boss_${template.id}_${now}_${randomInt(100, 999)}`,
    templateId: template.id,
    name: generatedName,
    typeLabel: template.typeLabel,
    themeLabel: template.themeLabel,
    imageKey: template.id,
      generatedBy: 'local_boss_generator_v1',
    generatedTier,
    level,
    lootTier: template.lootTier ?? 1,
    statLine: createGeneratedStatLine(bossPower, eventTemplate),
    playerPowerAtReveal: basePower,
    bossPower,
    requiredPower,
    recommendedPower,
    maxHp,
    currentHp,
    difficulty: template.difficulty,
    endsAt: now + Math.round(durationHours * 60 * 60 * 1000),
    specialSkill: {
      name: template.skillName,
      description: template.skillDescription,
    },
  };
}

function createPlayableMockBossState(playerPower, eventType = 'weekly') {
  const now = Date.now();
  const boss = {
    ...createMockRevealedBoss(playerPower, eventType, now),
    status: 'active',
    revealedAt: now,
  };
  boss.currentHp = boss.maxHp;
  return {
    currentEvent: null,
    currentBoss: boss,
    tasks: createMockBossTasks(boss),
    rules: createMockBossRules(boss),
    lootTable: createMockLootTable(boss),
    taskGenerator: null,
    results: [],
    lastSeenBossTemplateIds: [boss.templateId],
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    notifiedHunterRank: '',
    lastHunterRankUnlockedAt: 0,
  };
}

export function createTestCountdownBossState(
  now = Date.now(),
  durationMs = 3 * 60 * 60 * 1000 + 24 * 60 * 1000
) {
  return {
    currentEvent: createMockBossEvent(now, durationMs),
    currentBoss: null,
    tasks: [],
    rules: null,
    lootTable: null,
    taskGenerator: null,
    results: [],
    lastSeenBossTemplateIds: [],
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    notifiedHunterRank: '',
    lastHunterRankUnlockedAt: 0,
  };
}

export function createTestRevealedBossState(playerPower, eventType = 'weekly') {
  return createPlayableMockBossState(playerPower, eventType);
}

export function createEmptyBossState() {
  return {
    currentEvent: null,
    currentBoss: null,
    tasks: [],
    rules: null,
    lootTable: null,
    taskGenerator: null,
    results: [],
    lastSeenBossTemplateIds: [],
    unlockedAchievementIds: [],
    lastUnlockedAchievementIds: [],
    notifiedHunterRank: '',
    lastHunterRankUnlockedAt: 0,
  };
}

function ensurePlayableBossState(bossState, playerPower) {
  if (bossState?.currentBoss) {
    return {
      currentEvent: bossState.currentEvent ?? null,
      currentBoss: bossState.currentBoss,
      tasks:
        Array.isArray(bossState.tasks) && bossState.tasks.length > 0
          ? bossState.tasks
          : createMockBossTasks(bossState.currentBoss),
      rules: bossState.rules ?? createMockBossRules(bossState.currentBoss),
      lootTable: bossState.lootTable ?? createMockLootTable(),
      taskGenerator:
        bossState.taskGenerator && typeof bossState.taskGenerator === 'object'
          ? bossState.taskGenerator
          : null,
      results: Array.isArray(bossState.results) ? bossState.results : [],
      lastSeenBossTemplateIds: Array.isArray(bossState.lastSeenBossTemplateIds)
        ? bossState.lastSeenBossTemplateIds
        : [],
      unlockedAchievementIds: normalizeStringList(
        bossState.unlockedAchievementIds
      ),
      lastUnlockedAchievementIds: normalizeStringList(
        bossState.lastUnlockedAchievementIds,
        10
      ),
      lastAchievementUnlockedAt: nonNegativeInt(
        bossState.lastAchievementUnlockedAt
      ),
      notifiedHunterRank: String(bossState.notifiedHunterRank ?? ''),
      lastHunterRankUnlockedAt: nonNegativeInt(
        bossState.lastHunterRankUnlockedAt
      ),
    };
  }
  return createPlayableMockBossState(playerPower);
}

export function acceptBossTask(bossState, taskId, playerPower, now = Date.now()) {
  const base = ensurePlayableBossState(bossState, playerPower);
  if (['defeated', 'expired'].includes(String(base.currentBoss?.status))) {
    return base;
  }
  const bossForTime = normalizeBossForDisplay(base.currentBoss, playerPower);
  if (bossForTime.endsAt <= now) {
    return expireCurrentBoss(base, playerPower, now);
  }
  if (!hasBossParticipationAccess(base, playerPower)) {
    return base;
  }
  const checked = applyBossTaskDeadlines(base, playerPower, now);
  return {
    ...checked,
    tasks: checked.tasks.map((task) => {
      if (task.id !== taskId || task.status !== 'Available') return task;
      return {
        ...task,
        status: 'Accepted',
        acceptedAt: now,
      };
    }),
  };
}

export function completeBossTask(
  bossState,
  taskId,
  playerPower,
  now = Date.now(),
  proofResult = null
) {
  const base = ensurePlayableBossState(bossState, playerPower);
  if (['defeated', 'expired'].includes(String(base.currentBoss?.status))) {
    return base;
  }
  const bossForTime = normalizeBossForDisplay(base.currentBoss, playerPower);
  if (bossForTime.endsAt <= now) {
    return expireCurrentBoss(base, playerPower, now);
  }
  if (!hasBossParticipationAccess(base, playerPower)) {
    return base;
  }
  const checked = applyBossTaskDeadlines(base, playerPower, now);
  const task = checked.tasks.find((row) => row.id === taskId);
  if (
    !task ||
    task.status === 'Completed' ||
    task.status === 'Locked' ||
    task.status === 'Failed'
  ) {
    return checked;
  }

  const currentBoss = normalizeBossForDisplay(checked.currentBoss, playerPower);
  const damage = nonNegativeInt(task.damage);
  const nextHp = Math.max(0, currentBoss.currentHp - damage);
  const defeated = nextHp <= 0;

  return {
    ...checked,
    currentBoss: {
      ...checked.currentBoss,
      currentHp: nextHp,
      status: defeated ? 'defeated' : checked.currentBoss.status ?? 'active',
      defeatedAt: defeated ? now : checked.currentBoss.defeatedAt,
    },
    tasks: checked.tasks.map((row) => {
      if (row.id !== taskId) return row;
      return {
        ...row,
        status: 'Completed',
        completedAt: now,
        submittedProof:
          proofResult?.proofText ?? row.submittedProof ?? '',
        proofScore:
          proofResult && proofResult.score != null
            ? nonNegativeInt(proofResult.score)
            : row.proofScore,
        proofFeedback:
          proofResult?.feedback ?? row.proofFeedback ?? '',
        proofCheckedBy:
          proofResult?.checkedBy ?? row.proofCheckedBy ?? '',
        proofCheckedAt:
          proofResult ? now : row.proofCheckedAt ?? null,
      };
    }),
  };
}

function rollOneLootEntry(entries) {
  const weighted = entries
    .map((entry) => ({
      ...entry,
      chance: parseRate(entry.rate ?? entry.dropRate),
    }))
    .filter((entry) => entry.chance > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.chance, 0);
  if (total <= 0) return null;

  let cursor = Math.random() * 100;
  if (cursor >= Math.min(100, total)) return null;

  for (const entry of weighted) {
    cursor -= entry.chance;
    if (cursor <= 0) return entry;
  }
  return weighted[weighted.length - 1] ?? null;
}

function applyLootDropLimits(received) {
  const rows = Array.isArray(received) ? received : [];
  const limitedItemIds = new Set([
    'item_streak_freeze',
    'item_rest_permit',
    'item_death_pardon',
    'item_lucky_charm',
    'item_world_core',
  ]);
  const seen = new Set();
  return rows.filter((item) => {
    const itemId = String(item?.itemId ?? item?.id ?? '').trim();
    if (!limitedItemIds.has(itemId)) return true;
    if (seen.has(itemId)) return false;
    seen.add(itemId);
    return true;
  });
}

export function rollBossLoot(lootTable, rollCount) {
  const displayLoot = normalizeLootTableForDisplay(lootTable);
  const rolls = Math.max(0, nonNegativeInt(rollCount));
  const received = [];
  for (let i = 0; i < rolls; i += 1) {
    const entry = rollOneLootEntry(displayLoot.entries);
    if (!entry) continue;
    received.push({
      itemId: entry.id,
      name: entry.name,
      rarity: entry.rarity,
      iconKey: entry.iconKey,
      scope: entry.scope,
      useType: entry.useType,
      description: entry.description,
      quantity: 1,
    });
  }
  return applyLootDropLimits(received);
}

function createBossResultSnapshot(boss) {
  const normalizedBoss = boss && typeof boss === 'object' ? boss : {};
  return {
    bossName: String(normalizedBoss.name ?? titleFromId(normalizedBoss.id)),
    bossTypeLabel: String(normalizedBoss.typeLabel ?? 'Boss'),
    bossThemeLabel: String(normalizedBoss.themeLabel ?? 'Không rõ'),
    bossDifficulty: String(normalizedBoss.difficulty ?? 'Không rõ'),
    bossPower: nonNegativeInt(normalizedBoss.bossPower),
    bossLevel: Math.max(1, nonNegativeInt(normalizedBoss.level)),
    bossTier: String(normalizedBoss.generatedTier ?? 'Standard'),
    lootTier: Math.max(1, nonNegativeInt(normalizedBoss.lootTier)),
    imageKey: normalizedBoss.imageKey ?? normalizedBoss.templateId ?? normalizedBoss.id,
  };
}

export function completeBossTaskAndRollRewards(
  bossState,
  inventory,
  taskId,
  playerPower,
  now = Date.now(),
  proofResult = null
) {
  const before = ensurePlayableBossState(bossState, playerPower);
  const after = completeBossTask(
    before,
    taskId,
    playerPower,
    now,
    proofResult
  );
  const boss = normalizeBossForDisplay(after.currentBoss, playerPower);
  const justDefeated =
    boss.currentHp <= 0 && before.currentBoss?.status !== 'defeated';

  if (!justDefeated) {
    return {
      boss: after,
      inventory:
        inventory && typeof inventory === 'object'
          ? inventory
          : { items: {}, activeEffects: [] },
    };
  }

  const completedTasks = after.tasks.filter(
    (task) => task.status === 'Completed'
  );
  const finisherDone = completedTasks.some(
    (task) =>
      String(task.difficulty).toLowerCase() === 'kết liễu' ||
      String(task.title).toLowerCase().includes('kết liễu')
  );
  const lootTable = after.lootTable ?? createMockLootTable();
  const baseRolls = Math.max(1, nonNegativeInt(lootTable.maxRolls || 3));
  const boost = consumeInventoryEffect(inventory, 'loot_boost', now);
  const bonusRolls = boost.effect ? 1 : 0;
  const rollsEarned = baseRolls + 1 + (finisherDone ? 1 : 0) + bonusRolls;
  const lootReceived = rollBossLoot(lootTable, rollsEarned);
  const nextInventory = lootReceived.reduce(
    (acc, item) => addInventoryItem(acc, item, item.quantity),
    boost.inventory
  );
  const damageDealt = Math.max(0, boss.maxHp - boss.currentHp);
  const result = {
    id: `result_${boss.id}_${now}`,
    bossInstanceId: boss.id,
    outcome: 'defeated',
    damageDealt,
    damagePercent: boss.maxHp > 0 ? Math.round((damageDealt / boss.maxHp) * 100) : 0,
    tasksCompleted: completedTasks.length,
    tasksFailed: after.tasks.filter((task) => task.status === 'Failed').length,
    rollsEarned,
    bonusRolls,
    consumedEffects: boost.effect ? [boost.effect] : [],
    lootReceived,
    createdAt: now,
    ...createBossResultSnapshot(boss),
  };

  return {
    boss: {
      ...after,
      currentBoss: {
        ...after.currentBoss,
        status: 'defeated',
        currentHp: 0,
        defeatedAt: now,
      },
      results: [...(Array.isArray(after.results) ? after.results : []), result],
    },
    inventory: nextInventory,
  };
}

export function expireCurrentBoss(
  bossState,
  playerPower,
  now = Date.now()
) {
  if (!bossState || typeof bossState !== 'object' || Array.isArray(bossState)) {
    return bossState;
  }
  if (!bossState.currentBoss || typeof bossState.currentBoss !== 'object') {
    return bossState;
  }

  const boss = normalizeBossForDisplay(bossState.currentBoss, playerPower);
  if (['defeated', 'expired'].includes(boss.status)) {
    return bossState;
  }

  const tasks = Array.isArray(bossState.tasks) ? bossState.tasks : [];
  const nextTasks = tasks.map((task) => {
    if (!task || typeof task !== 'object') return task;
    if (task.status === 'Completed' || task.status === 'Locked') return task;
    return {
      ...task,
      status: 'Failed',
      failedAt: now,
      failReason: 'Boss đã hết giờ',
    };
  });
  const completedTasks = nextTasks.filter((task) => task?.status === 'Completed');
  const failedTasks = nextTasks.filter((task) => task?.status === 'Failed');
  const damageDealt = Math.max(0, boss.maxHp - boss.currentHp);
  const results = Array.isArray(bossState.results)
    ? bossState.results.filter((result) => result && typeof result === 'object')
    : [];
  const alreadyClosed = results.some(
    (result) =>
      result.bossInstanceId === boss.id &&
      ['defeated', 'expired'].includes(String(result.outcome))
  );
  const expiredResult = {
    id: `result_${boss.id}_expired_${now}`,
    bossInstanceId: boss.id,
    outcome: 'expired',
    damageDealt,
    damagePercent: boss.maxHp > 0 ? Math.round((damageDealt / boss.maxHp) * 100) : 0,
    tasksCompleted: completedTasks.length,
    tasksFailed: failedTasks.length,
    rollsEarned: 0,
    lootReceived: [],
    createdAt: now,
    reason: 'Boss hết giờ trước khi bị hạ.',
    ...createBossResultSnapshot(boss),
  };

  return {
    ...bossState,
    currentBoss: {
      ...bossState.currentBoss,
      status: 'expired',
      expiredAt: now,
    },
    tasks: nextTasks,
    results: alreadyClosed ? results : [...results, expiredResult],
  };
}

export function normalizeBossResultsForDisplay(rawResults, maxRows = 30) {
  const rows = Array.isArray(rawResults) ? rawResults : [];
  const normalized = rows
    .filter((result) => result && typeof result === 'object')
    .map((result, index) => {
      const lootReceived = Array.isArray(result.lootReceived)
        ? result.lootReceived.filter((item) => item && typeof item === 'object')
        : [];
      return {
        id: String(result.id ?? `boss_result_${index}`),
        bossInstanceId: String(result.bossInstanceId ?? ''),
        bossName: String(
          result.bossName ??
            result.bossSnapshot?.name ??
            result.bossInstanceId ??
            'Boss không rõ'
        ),
        bossTypeLabel: String(
          result.bossTypeLabel ?? result.bossSnapshot?.typeLabel ?? 'Boss'
        ),
        bossThemeLabel: String(
          result.bossThemeLabel ?? result.bossSnapshot?.themeLabel ?? 'Không rõ'
        ),
        bossDifficulty: String(
          result.bossDifficulty ?? result.bossSnapshot?.difficulty ?? 'Không rõ'
        ),
        bossPower: nonNegativeInt(
          result.bossPower ?? result.bossSnapshot?.bossPower
        ),
        bossLevel: Math.max(
          1,
          nonNegativeInt(result.bossLevel ?? result.bossSnapshot?.level)
        ),
        bossTier: String(
          result.bossTier ?? result.bossSnapshot?.generatedTier ?? 'Standard'
        ),
        lootTier: Math.max(
          1,
          nonNegativeInt(result.lootTier ?? result.bossSnapshot?.lootTier)
        ),
        imageKey: String(
          result.imageKey ??
            result.bossSnapshot?.imageKey ??
            result.bossSnapshot?.templateId ??
            result.bossInstanceId ??
            ''
        ),
        outcome: String(result.outcome ?? 'unknown'),
        createdAt: nonNegativeInt(result.createdAt),
        damageDealt: nonNegativeInt(result.damageDealt),
        damagePercent: nonNegativeInt(result.damagePercent),
        tasksCompleted: nonNegativeInt(result.tasksCompleted),
        tasksFailed: nonNegativeInt(result.tasksFailed),
        rollsEarned: nonNegativeInt(result.rollsEarned),
        bonusRolls: nonNegativeInt(result.bonusRolls),
        lootReceived,
        lootCount: lootReceived.reduce(
          (sum, item) => sum + Math.max(1, nonNegativeInt(item.quantity ?? 1)),
          0
        ),
        reason: String(result.reason ?? ''),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (maxRows === null) return normalized;
  return normalized.slice(0, Math.max(0, nonNegativeInt(maxRows)));
}

export function summarizeBossResults(rawResults) {
  const results = normalizeBossResultsForDisplay(rawResults, null);
  const total = results.length;
  const victories = results.filter((result) => result.outcome === 'defeated')
    .length;
  const expired = results.filter((result) => result.outcome === 'expired').length;
  const totalLoot = results.reduce((sum, result) => sum + result.lootCount, 0);
  const totalRolls = results.reduce((sum, result) => sum + result.rollsEarned, 0);
  const totalDamage = results.reduce(
    (sum, result) => sum + result.damageDealt,
    0
  );
  const bestDamageResult = results.reduce(
    (best, result) =>
      !best || result.damagePercent > best.damagePercent ? result : best,
    null
  );
  const strongestBoss = results.reduce(
    (best, result) => (!best || result.bossPower > best.bossPower ? result : best),
    null
  );
  const bestLootResult = results.reduce(
    (best, result) => (!best || result.lootCount > best.lootCount ? result : best),
    null
  );

  return {
    total,
    victories,
    expired,
    winRate: total > 0 ? Math.round((victories / total) * 100) : 0,
    totalLoot,
    totalRolls,
    totalDamage,
    bestDamagePercent: bestDamageResult?.damagePercent ?? 0,
    bestDamageBossName: bestDamageResult?.bossName ?? 'Chưa có',
    strongestBossName: strongestBoss?.bossName ?? 'Chưa có',
    strongestBossPower: strongestBoss?.bossPower ?? 0,
    bestLootBossName: bestLootResult?.bossName ?? 'Chưa có',
    bestLootCount: bestLootResult?.lootCount ?? 0,
  };
}

export function summarizeBossCodex(rawResults) {
  const history = normalizeBossResultsForDisplay(rawResults, null);
  const grouped = new Map();

  for (const result of history) {
    const key = result.imageKey || `${result.bossTypeLabel}_${result.bossName}`;
    const existing = grouped.get(key) ?? {
      id: key,
      imageKey: result.imageKey,
      bossName: result.bossName,
      bossTypeLabel: result.bossTypeLabel,
      bossThemeLabel: result.bossThemeLabel,
      encounters: 0,
      victories: 0,
      expired: 0,
      totalLoot: 0,
      bestDamagePercent: 0,
      strongestPower: 0,
      highestLootTier: 0,
      lastSeenAt: 0,
    };

    existing.encounters += 1;
    existing.victories += result.outcome === 'defeated' ? 1 : 0;
    existing.expired += result.outcome === 'expired' ? 1 : 0;
    existing.totalLoot += result.lootCount;
    existing.bestDamagePercent = Math.max(
      existing.bestDamagePercent,
      result.damagePercent
    );
    existing.strongestPower = Math.max(existing.strongestPower, result.bossPower);
    existing.highestLootTier = Math.max(existing.highestLootTier, result.lootTier);
    existing.lastSeenAt = Math.max(existing.lastSeenAt, result.createdAt);
    grouped.set(key, existing);
  }

  return [...grouped.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function summarizeBossLootCollection(rawResults) {
  const history = normalizeBossResultsForDisplay(rawResults, null);
  const grouped = new Map();

  for (const result of history) {
    for (const item of result.lootReceived) {
      const id = String(item.itemId ?? item.id ?? item.name ?? '').trim();
      if (!id) continue;
      const quantity = Math.max(1, nonNegativeInt(item.quantity ?? 1));
      const existing = grouped.get(id) ?? {
        id,
        itemId: id,
        name: String(item.name ?? titleFromId(id)),
        rarity: String(item.rarity ?? getItemDefinition(id).rarity),
        iconKey: item.iconKey ?? id,
        scope: String(item.scope ?? getItemDefinition(id).scope),
        useType: String(item.useType ?? getItemDefinition(id).useType),
        description: String(item.description ?? getItemDefinition(id).description),
        totalQuantity: 0,
        dropCount: 0,
        sourceBossNames: [],
        lastDroppedAt: 0,
      };

      existing.totalQuantity += quantity;
      existing.dropCount += 1;
      existing.lastDroppedAt = Math.max(existing.lastDroppedAt, result.createdAt);
      if (!existing.sourceBossNames.includes(result.bossName)) {
        existing.sourceBossNames.push(result.bossName);
      }
      grouped.set(id, existing);
    }
  }

  const rarityOrder = {
    Mythic: 5,
    Legendary: 4,
    Epic: 3,
    Rare: 2,
    Common: 1,
  };

  return [...grouped.values()].sort((a, b) => {
    const rarityDiff = (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0);
    if (rarityDiff !== 0) return rarityDiff;
    if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity;
    return b.lastDroppedAt - a.lastDroppedAt;
  });
}

const BOSS_HUNTER_RANKS = [
  { rank: 'E', title: 'Tập Sự Cổng', minScore: 0 },
  { rank: 'D', title: 'Người Canh Cổng', minScore: 1500 },
  { rank: 'C', title: 'Thợ Săn Boss', minScore: 5000 },
  { rank: 'B', title: 'Người Phá Giáp', minScore: 12000 },
  { rank: 'A', title: 'Sát Thủ Cổng Đen', minScore: 25000 },
  { rank: 'S', title: 'Kẻ Kết Liễu Vực Sâu', minScore: 50000 },
  { rank: 'SS', title: 'Chúa Tể Cổng Boss', minScore: 100000 },
  { rank: 'SSS', title: 'Kẻ Đứng Trên Thế Giới', minScore: 200000 },
];

export function getBossHunterRank(rawResults) {
  const stats = summarizeBossResults(rawResults);
  const lootCollection = summarizeBossLootCollection(rawResults);
  const rarityScore = lootCollection.reduce((sum, item) => {
    const weight = {
      Rare: 120,
      Epic: 420,
      Legendary: 1200,
      Mythic: 3000,
    }[item.rarity] ?? 40;
    return sum + weight * Math.max(1, nonNegativeInt(item.totalQuantity));
  }, 0);
  const score = Math.round(
    stats.victories * 1200 +
      stats.totalRolls * 45 +
      stats.totalLoot * 140 +
      stats.bestDamagePercent * 20 +
      stats.strongestBossPower * 0.04 +
      rarityScore
  );
  const currentIndex = BOSS_HUNTER_RANKS.reduce(
    (bestIndex, rank, index) => (score >= rank.minScore ? index : bestIndex),
    0
  );
  const current = BOSS_HUNTER_RANKS[currentIndex];
  const next = BOSS_HUNTER_RANKS[currentIndex + 1] ?? null;
  const rankSpan = next ? next.minScore - current.minScore : 1;
  const progressScore = next ? score - current.minScore : rankSpan;

  return {
    score,
    rank: current.rank,
    title: current.title,
    nextRank: next?.rank ?? 'MAX',
    nextTitle: next?.title ?? 'Đã đạt đỉnh hiện tại',
    nextScore: next?.minScore ?? score,
    pointsToNext: next ? Math.max(0, next.minScore - score) : 0,
    progressPercent: next
      ? Math.min(100, Math.round((progressScore / rankSpan) * 100))
      : 100,
  };
}

const BOSS_ACHIEVEMENT_DEFS = [
  {
    id: 'boss_first_clear',
    title: 'Kẻ Diệt Boss',
    description: 'Hạ gục boss đầu tiên.',
    target: 1,
    getCurrent: ({ stats }) => stats.victories,
  },
  {
    id: 'boss_hunter_5',
    title: 'Thợ Săn Cổng',
    description: 'Chiến thắng 5 trận boss.',
    target: 5,
    getCurrent: ({ stats }) => stats.victories,
  },
  {
    id: 'boss_hunter_20',
    title: 'Kẻ Mở Cổng Chuyên Nghiệp',
    description: 'Chiến thắng 20 trận boss.',
    target: 20,
    getCurrent: ({ stats }) => stats.victories,
  },
  {
    id: 'boss_perfect_clear',
    title: 'Kết Liễu Hoàn Hảo',
    description: 'Thắng 1 trận boss với 100% sát thương và không thất bại nhiệm vụ.',
    target: 1,
    getCurrent: ({ perfectWins }) => perfectWins,
  },
  {
    id: 'boss_elite_clear',
    title: 'Sát Thủ Tinh Anh',
    description: 'Hạ 3 boss Tinh Anh hoặc boss Thế Giới.',
    target: 3,
    getCurrent: ({ eliteWins }) => eliteWins,
  },
  {
    id: 'boss_world_clear',
    title: 'Người Đứng Trước Thế Giới',
    description: 'Hạ 1 boss Thế Giới.',
    target: 1,
    getCurrent: ({ worldWins }) => worldWins,
  },
  {
    id: 'boss_loot_10',
    title: 'Người Gom Chiến Lợi Phẩm',
    description: 'Nhận tổng cộng 10 vật phẩm từ boss.',
    target: 10,
    getCurrent: ({ stats }) => stats.totalLoot,
  },
  {
    id: 'boss_rare_drop',
    title: 'Vận May Hiếm',
    description: 'Nhận 1 vật phẩm Sử thi, Huyền thoại hoặc Thần thoại từ boss.',
    target: 1,
    getCurrent: ({ rareLootCount }) => rareLootCount,
  },
  {
    id: 'boss_power_50000',
    title: 'Vượt Ngưỡng 50K',
    description: 'Từng tham chiến boss có lực chiến từ 50,000 trở lên.',
    target: 50000,
    getCurrent: ({ stats }) => stats.strongestBossPower,
  },
];

export function getBossAchievementProgress(rawResults) {
  const history = normalizeBossResultsForDisplay(rawResults, null);
  const stats = summarizeBossResults(rawResults);
  const defeated = history.filter((result) => result.outcome === 'defeated');
  const typeText = (result) =>
    `${result.bossTypeLabel} ${result.bossThemeLabel}`.toLowerCase();
  const worldWins = defeated.filter((result) =>
    typeText(result).includes('thế giới')
  ).length;
  const eliteWins = defeated.filter((result) => {
    const text = typeText(result);
    return text.includes('tinh anh') || text.includes('thế giới');
  }).length;
  const perfectWins = defeated.filter(
    (result) => result.damagePercent >= 100 && result.tasksFailed === 0
  ).length;
  const rareLootCount = history.reduce(
    (sum, result) =>
      sum +
      result.lootReceived.filter((item) =>
        ['Epic', 'Legendary', 'Mythic'].includes(String(item.rarity))
      ).length,
    0
  );
  const context = {
    history,
    stats,
    defeated,
    worldWins,
    eliteWins,
    perfectWins,
    rareLootCount,
  };

  return BOSS_ACHIEVEMENT_DEFS.map((def) => {
    const current = Math.max(0, nonNegativeInt(def.getCurrent(context)));
    const target = Math.max(1, nonNegativeInt(def.target));
    const unlocked = current >= target;
    return {
      ...def,
      current,
      target,
      unlocked,
      progressPercent: Math.min(100, Math.round((current / target) * 100)),
    };
  });
}

export function normalizeBossForDisplay(rawBoss, playerPower) {
  if (!rawBoss || typeof rawBoss !== 'object') return null;
  const basePower = Math.max(1000, nonNegativeInt(playerPower));
  const bossPower = Math.max(
    1,
    nonNegativeInt(rawBoss.bossPower ?? rawBoss.power ?? basePower)
  );
  const maxHp = Math.max(1, nonNegativeInt(rawBoss.maxHp ?? bossPower * 4));
  const currentHp = Math.min(
    maxHp,
    Math.max(0, nonNegativeInt(rawBoss.currentHp ?? maxHp))
  );

  return {
    id: String(rawBoss.id ?? rawBoss.templateId ?? 'state_boss'),
    templateId: String(rawBoss.templateId ?? rawBoss.id ?? 'state_boss'),
    name: String(rawBoss.name ?? titleFromId(rawBoss.templateId ?? rawBoss.id)),
    typeLabel: String(rawBoss.typeLabel ?? rawBoss.type ?? 'Boss'),
    themeLabel: String(rawBoss.themeLabel ?? rawBoss.theme ?? 'Không rõ'),
    imageKey: rawBoss.imageKey ?? rawBoss.templateId ?? rawBoss.id,
    generatedBy: String(rawBoss.generatedBy ?? 'local'),
    generatedTier: String(rawBoss.generatedTier ?? rawBoss.tier ?? 'Standard'),
    level: Math.max(1, nonNegativeInt(rawBoss.level ?? Math.sqrt(bossPower) / 2)),
    lootTier: Math.max(1, nonNegativeInt(rawBoss.lootTier ?? 1)),
    statLine:
      rawBoss.statLine && typeof rawBoss.statLine === 'object'
        ? {
            attack: nonNegativeInt(rawBoss.statLine.attack),
            defense: nonNegativeInt(rawBoss.statLine.defense),
            speed: nonNegativeInt(rawBoss.statLine.speed),
            focus: nonNegativeInt(rawBoss.statLine.focus),
          }
        : {
            attack: Math.round(bossPower / 12),
            defense: Math.round(bossPower / 13),
            speed: Math.round(bossPower / 15),
            focus: Math.round(bossPower / 12),
          },
    playerPowerAtReveal: nonNegativeInt(
      rawBoss.playerPowerAtReveal ?? playerPower
    ),
    bossPower,
    requiredPower: Math.max(
      1,
      nonNegativeInt(rawBoss.requiredPower ?? bossPower * 0.75)
    ),
    recommendedPower: Math.max(
      1,
      nonNegativeInt(rawBoss.recommendedPower ?? bossPower)
    ),
    maxHp,
    currentHp,
    status: String(rawBoss.status ?? (currentHp <= 0 ? 'defeated' : 'active')),
    difficulty: String(rawBoss.difficulty ?? 'Không rõ'),
    endsAt:
      typeof rawBoss.endsAt === 'number'
        ? rawBoss.endsAt
        : Date.now() + 24 * 60 * 60 * 1000,
    specialSkill: {
      name: String(rawBoss.specialSkill?.name ?? 'Kỹ năng không rõ'),
      description: String(
        rawBoss.specialSkill?.description ?? 'Kỹ năng boss chưa được mô tả.'
      ),
    },
    lore: String(rawBoss.lore ?? ''),
    visualPrompt: String(rawBoss.visualPrompt ?? ''),
  };
}

export function getBossParticipationState(playerPower, boss) {
  const power = nonNegativeInt(playerPower);
  if (!boss) {
    return {
      tone: 'neutral',
      label: 'Chưa có boss',
      description: 'Cổng boss chưa mở.',
    };
  }

  if (power < boss.requiredPower) {
    return {
      tone: 'danger',
      label: 'Chỉ quan sát',
      description: `Thiếu ${formatPower(boss.requiredPower - power)} lực chiến để tham gia.`,
    };
  }

  if (power < boss.recommendedPower) {
    return {
      tone: 'warning',
      label: 'Đủ điều kiện - rất khó',
      description: 'Có thể nhận nhiệm vụ boss, nhưng boss đang mạnh hơn bạn.',
    };
  }

  if (power >= boss.bossPower * 2) {
    return {
      tone: 'warning',
      label: 'Quá mạnh so với boss',
      description: 'Sau này đồ hiếm có thể bị giảm để tránh farm boss yếu.',
    };
  }

  return {
    tone: 'success',
    label: 'Có thể tham chiến',
    description: 'Lực chiến đủ để đánh nghiêm túc boss này.',
  };
}

export function canPlayerJoinBoss(playerPower, rawBoss) {
  const boss = normalizeBossForDisplay(rawBoss, playerPower);
  if (!boss) {
    return {
      allowed: false,
      reason: 'Chưa có boss để tham chiến.',
      missingPower: 0,
    };
  }

  if (['defeated', 'expired'].includes(boss.status)) {
    return {
      allowed: false,
      reason: 'Boss da ket thuc.',
      missingPower: 0,
    };
  }

  const power = nonNegativeInt(playerPower);
  const missingPower = Math.max(0, boss.requiredPower - power);
  if (missingPower > 0) {
    return {
      allowed: false,
      reason: `Thieu ${formatPower(missingPower)} luc chien de nhan nhiem vu boss.`,
      missingPower,
    };
  }

  return {
    allowed: true,
    reason:
      power < boss.recommendedPower
        ? 'Du dieu kien tham chien, nhung boss dang manh hon ban.'
        : 'Du dieu kien tham chien.',
    missingPower: 0,
  };
}

function hasBossParticipationAccess(bossState, playerPower) {
  return canPlayerJoinBoss(playerPower, bossState?.currentBoss).allowed;
}

function getBossTaskDeadlineAt(task, boss, now = Date.now()) {
  const explicit = Number(task?.deadlineAt ?? task?.expiresAt);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const bossEndsAt = Number(boss?.endsAt);
  const fallback = Number.isFinite(bossEndsAt)
    ? bossEndsAt
    : now + 3 * 60 * 60 * 1000;
  const text = String(task?.deadline ?? '').toLowerCase();
  const timeMatch = text.match(/(\d{1,2})[:h](\d{2})/);
  if (timeMatch) {
    const deadline = new Date(now);
    deadline.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return Math.min(deadline.getTime(), fallback);
  }

  return fallback;
}

function withBossTaskDeadlines(tasks, boss, now = Date.now()) {
  const rows = Array.isArray(tasks) ? tasks : [];
  return rows.map((task) => {
    if (!task || typeof task !== 'object') return task;
    const deadlineAt = getBossTaskDeadlineAt(task, boss, now);
    return {
      ...task,
      deadlineAt,
      expiresAt: Number(task.expiresAt ?? deadlineAt),
    };
  });
}

function applyBossTaskDeadlines(base, playerPower, now = Date.now()) {
  const boss = normalizeBossForDisplay(base.currentBoss, playerPower);
  const tasks = withBossTaskDeadlines(base.tasks, boss, now);
  let changed = false;
  const nextTasks = tasks.map((task) => {
    if (!task || typeof task !== 'object') return task;
    if (['Completed', 'Failed', 'Locked'].includes(task.status)) return task;
    const deadlineAt = getBossTaskDeadlineAt(task, boss, now);
    if (deadlineAt > now) {
      return { ...task, deadlineAt, expiresAt: deadlineAt };
    }
    changed = true;
    return {
      ...task,
      status: 'Failed',
      deadlineAt,
      expiresAt: deadlineAt,
      failedAt: now,
      failReason: 'Nhiệm vụ đã quá hạn',
    };
  });

  return changed
    ? {
        ...base,
        tasks: nextTasks,
      }
    : base;
}

export function failExpiredBossTasks(bossState, playerPower, now = Date.now()) {
  if (!bossState?.currentBoss) return bossState;
  const base = ensurePlayableBossState(bossState, playerPower);
  if (['defeated', 'expired'].includes(String(base.currentBoss?.status))) {
    return base;
  }
  const bossForTime = normalizeBossForDisplay(base.currentBoss, playerPower);
  if (bossForTime.endsAt <= now) {
    return expireCurrentBoss(base, playerPower, now);
  }
  const next = applyBossTaskDeadlines(base, playerPower, now);
  return next === base ? bossState : next;
}

export function createMockBossRules(boss) {
  return {
    bossId: boss?.id ?? 'mock_boss',
    groups: [
      {
        title: 'Điều kiện tham gia',
        lines: [
          `Yêu cầu lực chiến tối thiểu: ${formatPower(boss?.requiredPower ?? 0)}.`,
          'Dưới yêu cầu chỉ có thể quan sát, không nhận đồ chính.',
        ],
      },
      {
        title: 'Điều kiện nhận đồ',
        lines: [
          'Dưới 30% sát thương: không nhận đồ.',
          '30-59% sát thương: 1 lượt quay cơ bản.',
          '60-99% sát thương: nhận lượt quay chính.',
          'Hạ boss: lượt quay chính + thưởng.',
        ],
      },
      {
        title: 'Luật nhiệm vụ',
        lines: [
          'Nhiệm vụ boss tách biệt với nhiệm vụ cá nhân.',
          'Mỗi nhiệm vụ có hạn chót và sát thương riêng.',
          'Báo cáo mơ hồ sẽ chưa được tính hoàn thành.',
        ],
      },
      {
        title: 'Luật vật phẩm',
        lines: [
          'Giấy Nghỉ Phép không được dùng để bỏ nhiệm vụ boss.',
          'Bùa May Mắn chỉ ảnh hưởng đồ rơi, không tăng sát thương.',
          'Lệnh Gia Hạn và Vé Làm Lại chỉ dùng 1 lần mỗi trận.',
        ],
      },
    ],
  };
}

export function normalizeBossRulesForDisplay(rawRules, boss) {
  if (!rawRules || typeof rawRules !== 'object') return createMockBossRules(boss);
  if (Array.isArray(rawRules.groups)) {
    return {
      bossId: rawRules.bossId ?? boss?.id ?? 'state_boss',
      groups: rawRules.groups
        .filter((group) => group && typeof group === 'object')
        .map((group) => ({
          title: String(group.title ?? 'Luật'),
          lines: Array.isArray(group.lines)
            ? group.lines.map((line) => String(line))
            : [],
        })),
    };
  }

  const groups = [
    ['Điều kiện tham gia', rawRules.participation],
    ['Điều kiện nhận đồ', rawRules.loot],
    ['Luật nhiệm vụ', rawRules.taskRules],
    ['Luật thất bại', rawRules.failureRules],
    ['Luật vật phẩm', rawRules.itemRules],
    ['Luật bằng chứng', rawRules.proofRules],
  ]
    .filter(([, lines]) => Array.isArray(lines) && lines.length > 0)
    .map(([title, lines]) => ({
      title,
      lines: lines.map((line) => String(line)),
    }));

  return groups.length
    ? { bossId: rawRules.bossInstanceId ?? boss?.id ?? 'state_boss', groups }
    : createMockBossRules(boss);
}

export function createMockBossTasks(boss) {
  const hp = Math.max(1, nonNegativeInt(boss?.maxHp));
  const templateId = String(boss?.templateId ?? boss?.imageKey ?? '');

  if (templateId.includes('procrastination')) {
    return [
      {
        id: 'task_deep_work',
        title: 'Chém Đứt Trì Hoãn',
        category: 'Công việc',
        difficulty: 'Khó',
        objective: 'Tập trung sâu 60 phút không dùng mạng xã hội.',
        deadline: 'Trước 16:00 hôm nay',
        damage: Math.round(hp * 0.25),
        status: 'Available',
        proof: 'Báo giờ bắt đầu, giờ kết thúc và đầu việc đã xong.',
      },
      {
        id: 'task_backlog',
        title: 'Đốt Hồ Sơ Tồn Đọng',
        category: 'Công việc',
        difficulty: 'Khó',
        objective: 'Hoàn thành 1 việc đã trì hoãn từ 3 ngày trở lên.',
        deadline: 'Trước 18:00 hôm nay',
        damage: Math.round(hp * 0.3),
        status: 'Available',
        proof: 'Mô tả việc tồn đọng và kết quả cuối cùng.',
      },
      {
        id: 'task_plan',
        title: 'Phong Ấn Nhiễu Loạn',
        category: 'Trí tuệ',
        difficulty: 'Vừa',
        objective: 'Dọn danh sách việc và chọn 3 việc ưu tiên tiếp theo.',
        deadline: 'Trước 21:00 hôm nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Ghi lại 3 việc ưu tiên.',
      },
      {
        id: 'task_work_finisher',
        title: 'Đòn Kết Liễu',
        category: 'Công việc',
        difficulty: 'Kết liễu',
        objective: 'Tập trung sâu thêm 45 phút hoặc hoàn thành việc chính.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.32),
        status: 'Available',
        proof: 'Báo kết quả cụ thể.',
      },
    ];
  }

  if (templateId.includes('lazy')) {
    return [
      {
        id: 'task_pushups',
        title: 'Cú Đấm Khởi Động',
        category: 'Thể dục',
        difficulty: 'Vừa',
        objective: 'Hít đất 60 cái, chia tối đa 6 hiệp.',
        deadline: 'Trước 18:30 hôm nay',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Báo số hiệp và số lần từng hiệp.',
      },
      {
        id: 'task_squat',
        title: 'Phá Xiềng Ì Ạch',
        category: 'Thể dục',
        difficulty: 'Khó',
        objective: 'Squat 120 cái, chia tối đa 6 hiệp.',
        deadline: 'Trước 19:00 hôm nay',
        damage: Math.round(hp * 0.27),
        status: 'Available',
        proof: 'Báo số hiệp và số lần từng hiệp.',
      },
      {
        id: 'task_plank',
        title: 'Giữ Thân Bất Động',
        category: 'Thể dục',
        difficulty: 'Vừa',
        objective: 'Plank tổng 3 phút.',
        deadline: 'Trước 20:00 hôm nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Báo số hiệp plank và thời lượng từng hiệp.',
      },
      {
        id: 'task_fitness_finisher',
        title: 'Đòn Kết Liễu',
        category: 'Thể dục',
        difficulty: 'Kết liễu',
        objective: 'Hoàn thành 3 bài bất kỳ trong cùng một buổi.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.35),
        status: 'Available',
        proof: 'Tổng kết toàn bộ buổi tập.',
      },
    ];
  }

  if (templateId.includes('chain')) {
    return [
      {
        id: 'task_no_social',
        title: 'Khóa Cổng MXH',
        category: 'Kỷ luật',
        difficulty: 'Khó',
        objective: 'Không dùng mạng xã hội giải trí trong 4 giờ liên tục.',
        deadline: 'Trước 22:00 hôm nay',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Báo khung giờ bắt đầu/kết thúc.',
      },
      {
        id: 'task_no_delay',
        title: 'Giết Thói Trì Hoãn',
        category: 'Kỷ luật',
        difficulty: 'Khó',
        objective: 'Làm ngay 1 việc đang né tránh trong 30 phút.',
        deadline: 'Trước 21:00 hôm nay',
        damage: Math.round(hp * 0.24),
        status: 'Available',
        proof: 'Báo việc đã làm và kết quả.',
      },
      {
        id: 'task_clean_space',
        title: 'Thanh Lọc Môi Trường',
        category: 'Tinh thần',
        difficulty: 'Vừa',
        objective: 'Dọn bàn làm việc hoặc phòng trong 30 phút.',
        deadline: 'Trước 21:30 hôm nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Báo khu vực đã dọn.',
      },
      {
        id: 'task_chain_finisher',
        title: 'Đòn Kết Liễu',
        category: 'Kỷ luật',
        difficulty: 'Kết liễu',
        objective: 'Tổng kết ngày và cam kết 1 quy tắc cho ngày mai.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.32),
        status: 'Available',
        proof: 'Ghi lại quy tắc cam kết.',
      },
    ];
  }

  if (templateId.includes('elite_shadow_hunter')) {
    return [
      {
        id: 'task_elite_focus',
        title: 'Truy Vết Mục Tiêu',
        category: 'Tổng hợp',
        difficulty: 'Rất khó',
        objective: 'Hoàn thành 90 phút tập trung sâu hoặc 1 việc rất quan trọng.',
        deadline: 'Trong cửa sổ boss',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Báo mục tiêu, thời gian làm và kết quả cụ thể.',
      },
      {
        id: 'task_elite_body',
        title: 'Ép Thân Luyện Thể',
        category: 'Thể dục',
        difficulty: 'Rất khó',
        objective: 'Chọn 3 bài: hít đất, squat, plank, burpee và hoàn thành tổng 45 phút.',
        deadline: 'Trong cửa sổ boss',
        damage: Math.round(hp * 0.26),
        status: 'Available',
        proof: 'Báo từng bài, số hiệp và tổng thời gian.',
      },
      {
        id: 'task_elite_discipline',
        title: 'Cấm Giới Giải Trí',
        category: 'Kỷ luật',
        difficulty: 'Rất khó',
        objective: 'Không dùng mạng xã hội/giải trí 6 giờ liên tục.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Báo khung giờ và cách kiểm soát.',
      },
      {
        id: 'task_elite_finisher',
        title: 'Đòn Kết Liễu Tinh Anh',
        category: 'Tổng hợp',
        difficulty: 'Kết liễu',
        objective: 'Tổng kết trận và hoàn thành thêm 1 việc bạn đang né tránh.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.3),
        status: 'Available',
        proof: 'Báo việc né tránh và kết quả cuối cùng.',
      },
    ];
  }

  if (templateId.includes('world_abyss')) {
    return [
      {
        id: 'task_world_gate',
        title: 'Mở Cổng Thế Giới',
        category: 'Tổng hợp',
        difficulty: 'Cực khó',
        objective: 'Hoàn thành 120 phút tập trung sâu, chia tối đa 3 phiên.',
        deadline: 'Trong ngày sự kiện',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Báo từng phiên, thời gian và đầu ra.',
      },
      {
        id: 'task_world_body',
        title: 'Thân Thể Chịu Áp Lực',
        category: 'Thể dục',
        difficulty: 'Cực khó',
        objective: 'Tập 60 phút gồm ít nhất 4 bài khác nhau.',
        deadline: 'Trong ngày sự kiện',
        damage: Math.round(hp * 0.2),
        status: 'Available',
        proof: 'Báo danh sách bài tập, hiệp, số lần hoặc thời gian.',
      },
      {
        id: 'task_world_chain',
        title: 'Khóa Chuỗi Thế Giới',
        category: 'Kỷ luật',
        difficulty: 'Cực khó',
        objective: 'Không dùng mạng xã hội/giải trí 8 giờ và không trì hoãn việc chính.',
        deadline: 'Trong ngày sự kiện',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Báo khung giờ và việc chính đã xử lý.',
      },
      {
        id: 'task_world_wisdom',
        title: 'Đọc Lệnh Vực Sâu',
        category: 'Trí tuệ',
        difficulty: 'Rất khó',
        objective: 'Học/đọc 45 phút và viết lại 5 ý áp dụng được.',
        deadline: 'Trong ngày sự kiện',
        damage: Math.round(hp * 0.16),
        status: 'Available',
        proof: 'Ghi 5 ý áp dụng.',
      },
      {
        id: 'task_world_finisher',
        title: 'Phá Lõi Thế Giới',
        category: 'Tổng hợp',
        difficulty: 'Kết liễu',
        objective: 'Hoàn thành việc khó nhất trong ngày và viết tổng kết trận.',
        deadline: 'Trước khi boss biến mất',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Báo việc khó nhất và kết quả.',
      },
    ];
  }

  return [
    {
      id: 'task_opening',
      title: 'Mở Trận',
      category: 'Công việc',
      difficulty: 'Vừa',
      objective: 'Tập trung sâu 45 phút không dùng mạng xã hội.',
      deadline: 'Trước 15:00 hôm nay',
      damage: Math.round(hp * 0.18),
      status: 'Available',
      proof: 'Báo giờ bắt đầu, giờ kết thúc và việc đã xong.',
    },
    {
      id: 'task_break_armor',
      title: 'Phá Giáp',
      category: 'Thể dục',
      difficulty: 'Khó',
      objective: 'Hít đất 80 cái, chia tối đa 8 hiệp.',
      deadline: 'Trước 18:30 hôm nay',
      damage: Math.round(hp * 0.22),
      status: 'Available',
      proof: 'Báo số hiệp và số lần từng hiệp.',
    },
    {
      id: 'task_discipline',
      title: 'Giữ Kỷ Luật',
      category: 'Kỷ luật',
      difficulty: 'Khó',
      objective: 'Không dùng mạng xã hội giải trí trong 4 giờ liên tục.',
      deadline: 'Trước 21:00 hôm nay',
      damage: Math.round(hp * 0.25),
      status: 'Available',
      proof: 'Báo khung giờ bắt đầu/kết thúc.',
    },
    {
      id: 'task_finisher',
      title: 'Đòn Kết Liễu',
      category: 'Tổng hợp',
      difficulty: 'Kết liễu',
      objective: 'Tổng kết ngày và xử lý 1 việc tồn đọng.',
      deadline: 'Trước khi boss biến mất',
      damage: Math.round(hp * 0.4),
      status: 'Available',
      proof: 'Báo kết quả tổng kết và việc tồn đọng đã xử lý.',
    },
  ];
}

export function normalizeBossTasksForDisplay(rawTasks, boss) {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return createMockBossTasks(boss);
  }

  return rawTasks
    .filter((task) => task && typeof task === 'object')
    .map((task) => {
      const deadlineAt = getBossTaskDeadlineAt(task, boss, Date.now());
      return {
        id: String(task.id ?? `${task.title}-${task.damage}`),
        title: String(task.title ?? 'Nhiệm vụ boss'),
        category: String(task.category ?? 'Không rõ'),
        difficulty: String(task.difficulty ?? 'Không rõ'),
        objective: String(task.objective ?? task.description ?? ''),
        deadline:
          typeof task.deadline === 'string'
            ? task.deadline
            : typeof task.deadlineAt === 'number'
              ? new Date(task.deadlineAt).toLocaleString('vi-VN')
              : 'Chưa có hạn chót',
        deadlineAt,
        expiresAt: Number(task.expiresAt ?? deadlineAt),
        damage: nonNegativeInt(task.damage),
        status: String(task.status ?? 'Available'),
        proof: String(task.proof ?? task.completionRule ?? task.proofType ?? ''),
        challengeTier: String(task.challengeTier ?? ''),
        proofPassScore:
          task.proofPassScore == null
            ? null
            : nonNegativeInt(task.proofPassScore),
        acceptedAt: task.acceptedAt ?? null,
        completedAt: task.completedAt ?? null,
        failedAt: task.failedAt ?? null,
        failReason: String(task.failReason ?? ''),
        submittedProof: String(task.submittedProof ?? ''),
        proofScore:
          task.proofScore == null ? null : nonNegativeInt(task.proofScore),
        proofFeedback: String(task.proofFeedback ?? ''),
        proofCheckedBy: String(task.proofCheckedBy ?? ''),
        proofCheckedAt: task.proofCheckedAt ?? null,
      };
    });
}

export function createMockLootTable(boss = null) {
  const lootTier = clampNumber(nonNegativeInt(boss?.lootTier ?? 1), 1, 5);
  const maxRolls = Math.max(3, 2 + lootTier);
  return {
    maxRolls,
    lootTier,
    balanceVersion: 'discipline_safe_v1',
    mainLootRequirement:
      lootTier >= 4
        ? 'Chỉ quay khi hạ boss; đồ cứu kỷ luật có tỉ lệ cực thấp.'
        : 'Chỉ quay khi hạ boss; đồ cứu chuỗi/mở miễn phạt bị khóa theo bậc.',
    entries: [
      {
        id: 'item_large_mana_potion',
        name: 'Bình Mana Lớn',
        rarity: 'Rare',
        rate: formatDropRate(getDropRateCap('item_large_mana_potion', lootTier)),
        condition: 'Hạ boss',
        description: 'Hồi 35 MP.',
      },
      {
        id: 'item_life_shield',
        name: 'Khiên Sinh Mệnh',
        rarity: 'Rare',
        rate: formatDropRate(getDropRateCap('item_life_shield', lootTier)),
        condition: 'Hạ boss',
        description: 'Chặn mất HP 1 lần.',
      },
      ...(lootTier >= 2
        ? [
            {
              id: 'item_extend_order',
              name: 'Lệnh Gia Hạn',
              rarity: 'Epic',
              rate: formatDropRate(getDropRateCap('item_extend_order', lootTier)),
              condition: 'Hạ boss',
              description: 'Gia hạn 1 nhiệm vụ boss.',
            },
            {
              id: 'item_streak_freeze',
              name: 'Bình Đóng Băng Chuỗi',
              rarity: 'Epic',
              rate: formatDropRate(getDropRateCap('item_streak_freeze', lootTier)),
              condition: 'Hạ boss + hoàn thành ít nhất 1 nhiệm vụ Rất khó/Kết liễu',
              description: 'Nghỉ 1 ngày không mất chuỗi. Tỉ lệ rơi cực hiếm.',
            },
          ]
        : []),
      ...(lootTier >= 3
        ? [
            {
              id: 'item_lucky_charm',
              name: 'Bùa May Mắn Nhỏ',
              rarity: 'Epic',
              rate: formatDropRate(getDropRateCap('item_lucky_charm', lootTier)),
              condition: 'Hạ boss',
              description: 'Tăng nhẹ tỉ lệ đồ hiếm trong 1 trận sau.',
            },
          ]
        : []),
      ...(lootTier >= 4
        ? [
            {
              id: 'item_rest_permit',
              name: 'Giấy Nghỉ Phép',
              rarity: 'Legendary',
              rate: formatDropRate(getDropRateCap('item_rest_permit', lootTier)),
              condition: 'Hạ boss tinh anh/thế giới + Kết liễu',
              description: 'Một ngày nghỉ hợp lệ, không phạt HP/chuỗi. Cực hiếm.',
            },
            {
              id: 'item_death_pardon',
              name: 'Lệnh Miễn Tử',
              rarity: 'Mythic',
              rate: formatDropRate(getDropRateCap('item_death_pardon', lootTier)),
              condition: 'Hạ boss tinh anh/thế giới + Kết liễu',
              description: 'Một lần chết không mất chuỗi/debuff. Siêu hiếm.',
            },
          ]
        : []),
      ...(lootTier >= 5
        ? [
            {
              id: 'item_world_core',
              name: 'Lõi Boss Thế Giới',
              rarity: 'Mythic',
              rate: formatDropRate(getDropRateCap('item_world_core', lootTier)),
              condition: 'Hạ boss thế giới',
              description: 'Nguyên liệu cực hiếm cho hệ boss sau này.',
            },
          ]
        : []),
    ],
  };
}

export function normalizeLootTableForDisplay(rawLootTable) {
  if (!rawLootTable || typeof rawLootTable !== 'object') {
    return createMockLootTable();
  }
  const lootTier = Math.max(1, nonNegativeInt(rawLootTable.lootTier ?? 1));

  const entries = Array.isArray(rawLootTable.entries)
    ? rawLootTable.entries
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => {
          const itemId = String(entry.itemId ?? entry.id ?? '').trim();
          const definition = getItemDefinition(itemId);
          const cappedRate = clampLootEntryRate(entry, lootTier);
          return {
            id: String(entry.id ?? entry.itemId ?? entry.name ?? 'loot_item'),
            name: String(entry.name ?? definition.name),
            rarity: String(entry.rarity ?? definition.rarity),
            iconKey: String(entry.iconKey ?? definition.iconKey),
            scope: String(entry.scope ?? definition.scope),
            useType: String(entry.useType ?? definition.useType),
            rate: cappedRate,
            condition: String(
              entry.condition ??
                (entry.requiresDefeat
                  ? 'Hạ boss'
                  : `${entry.minDamagePercent ?? 0}% sát thương`)
            ),
            description: String(entry.description ?? definition.description),
            disciplineSafe:
              DISCIPLINE_PROTECTION_ITEM_IDS.has(itemId) ||
              Boolean(entry.disciplineSafe),
          };
        })
        .filter((entry) => parseRate(entry.rate) > 0)
    : [];

  return {
    maxRolls: nonNegativeInt(rawLootTable.maxRolls ?? 0),
    lootTier,
    balanceVersion: String(rawLootTable.balanceVersion ?? 'discipline_safe_v1'),
    lootTheme: String(rawLootTable.lootTheme ?? ''),
    mainLootRequirement: String(
      rawLootTable.mainLootRequirement ??
        rawLootTable.mainRequirement ??
        'Theo điều kiện sát thương của boss'
    ),
    entries: entries.length ? entries : createMockLootTable().entries,
  };
}

export function createMockInventory() {
  return [
    {
      id: 'item_large_hp_potion',
      name: 'Bình Máu Lớn',
      rarity: 'Rare',
      quantity: 2,
      scope: 'Ngoài boss',
      description: 'Hồi 25 HP.',
      state: 'Dùng được',
    },
    {
      id: 'item_streak_freeze',
      name: 'Bình Đóng Băng Chuỗi',
      rarity: 'Epic',
      quantity: 1,
      scope: 'Ngoài boss',
      description: 'Nghỉ 1 ngày không mất chuỗi.',
      state: 'Hồi theo tuần',
    },
    {
      id: 'item_lucky_charm',
      name: 'Bùa May Mắn Nhỏ',
      rarity: 'Rare',
      quantity: 1,
      scope: 'Trong boss',
      description: 'Tăng nhẹ tỉ lệ đồ hiếm trong 1 trận.',
      state: 'Dùng trong trận',
    },
    {
      id: 'item_extend_order',
      name: 'Lệnh Gia Hạn',
      rarity: 'Epic',
      quantity: 1,
      scope: 'Trong boss',
      description: 'Gia hạn 1 nhiệm vụ boss.',
      state: 'Dùng trong trận',
    },
  ];
}

export function inventoryToDisplayRows(inventory) {
  const items =
    inventory?.items && typeof inventory.items === 'object'
      ? Object.values(inventory.items)
      : [];
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const itemId = String(item.itemId ?? item.id ?? '').trim();
      const definition = getItemDefinition(itemId);
      return {
        id: itemId,
        name: String(item.name ?? definition.name),
        rarity: String(item.rarity ?? definition.rarity),
        iconKey: String(item.iconKey ?? definition.iconKey),
        quantity: nonNegativeInt(item.quantity),
        totalObtained: nonNegativeInt(item.totalObtained ?? item.quantity),
        scope: String(item.scope ?? item.useScope ?? definition.scope),
        useType: String(item.useType ?? definition.useType),
        description: String(item.description ?? definition.description),
        state: String(item.useStatus ?? definition.useStatus),
        lastUsedAt:
          typeof item.lastUsedAt === 'number' ? item.lastUsedAt : null,
        firstObtainedAt:
          typeof item.firstObtainedAt === 'number' ? item.firstObtainedAt : null,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : null,
      };
    })
    .filter((item) => item.id && item.quantity > 0)
    .sort((a, b) => {
      const rarityOrder = {
        Mythic: 5,
        Legendary: 4,
        Epic: 3,
        Rare: 2,
        Unknown: 1,
      };
      const rarityDiff =
        (rarityOrder[b.rarity] ?? 0) - (rarityOrder[a.rarity] ?? 0);
      if (rarityDiff !== 0) return rarityDiff;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
}

export function getInventorySummary(inventory) {
  const rows = inventoryToDisplayRows(inventory);
  return {
    totalStacks: rows.length,
    totalQuantity: rows.reduce((sum, item) => sum + item.quantity, 0),
    rareOrBetter: rows.filter((item) =>
      ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(item.rarity)
    ).length,
    mythicCount: rows
      .filter((item) => item.rarity === 'Mythic')
      .reduce((sum, item) => sum + item.quantity, 0),
  };
}
