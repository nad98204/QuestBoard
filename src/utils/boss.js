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

const ITEM_CATALOG = {
  item_large_hp_potion: {
    name: 'Binh Mau Lon',
    rarity: 'Rare',
    iconKey: 'item_large_hp_potion',
    scope: 'Ngoai boss',
    useType: 'restore_hp',
    description: 'Hoi 25 HP.',
    useStatus: 'San sang',
  },
  item_large_mana_potion: {
    name: 'Binh Mana Lon',
    rarity: 'Rare',
    iconKey: 'item_large_mana_potion',
    scope: 'Ngoai boss',
    useType: 'restore_mp',
    description: 'Hoi 35 MP.',
    useStatus: 'San sang',
  },
  item_life_shield: {
    name: 'Khien Sinh Menh',
    rarity: 'Rare',
    iconKey: 'item_life_shield',
    scope: 'Ngoai boss',
    useType: 'prevent_hp_loss',
    description: 'Chan mat HP 1 lan.',
    useStatus: 'San sang',
  },
  item_streak_freeze: {
    name: 'Binh Dong Bang Chuoi',
    rarity: 'Epic',
    iconKey: 'item_streak_freeze',
    scope: 'Ngoai boss',
    useType: 'protect_streak',
    description: 'Nghi 1 ngay khong mat streak.',
    useStatus: 'Cuc hiem',
  },
  item_rest_permit: {
    name: 'Giay Nghi Phep',
    rarity: 'Legendary',
    iconKey: 'item_rest_permit',
    scope: 'Ngoai boss',
    useType: 'valid_rest_day',
    description: 'Mot ngay nghi hop le, khong phat HP/streak.',
    useStatus: 'Cuc hiem',
  },
  item_death_pardon: {
    name: 'Lenh Mien Tu',
    rarity: 'Mythic',
    iconKey: 'item_death_pardon',
    scope: 'Ngoai boss',
    useType: 'death_pardon',
    description: 'Mot lan chet khong mat streak/debuff.',
    useStatus: 'Cuc hiem',
  },
  item_lucky_charm: {
    name: 'Bua May Man Nho',
    rarity: 'Epic',
    iconKey: 'item_lucky_charm',
    scope: 'Trong boss',
    useType: 'loot_boost',
    description: 'Tang nhe ti le loot hiem trong 1 tran sau.',
    useStatus: 'Dung trong boss',
  },
  item_extend_order: {
    name: 'Lenh Gia Han',
    rarity: 'Epic',
    iconKey: 'item_extend_order',
    scope: 'Trong boss',
    useType: 'extend_boss_task',
    description: 'Gia han 1 nhiem vu boss.',
    useStatus: 'Dung trong boss',
  },
  item_world_core: {
    name: 'Loi Boss The Gioi',
    rarity: 'Mythic',
    iconKey: 'item_world_core',
    scope: 'Nguyen lieu',
    useType: 'crafting_material',
    description: 'Nguyen lieu cuc hiem cho he boss sau nay.',
    useStatus: 'Chua mo khoa',
  },
};

function getItemDefinition(itemId) {
  return ITEM_CATALOG[itemId] ?? {
    name: titleFromId(itemId),
    rarity: 'Unknown',
    iconKey: itemId,
    scope: 'Unknown',
    useType: 'unknown',
    description: '',
    useStatus: 'Chua ro',
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
      reason: 'Hieu ung nay dang active, khong the dung trung.',
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

export function useInventoryItem(state, itemId, now = Date.now()) {
  const itemKey = String(itemId ?? '').trim();
  const inventory = normalizeInventoryObject(state?.inventory);
  const current = inventory.items[itemKey];
  const quantity = nonNegativeInt(current?.quantity);
  if (!itemKey || !current || quantity <= 0) {
    return {
      state,
      success: false,
      message: 'Khong co vat pham nay trong tui do.',
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
        message: 'HP dang day, khong can dung binh mau.',
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
      message: `Da dung ${item.name}: +${after - before} HP.`,
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
        message: 'MP dang day, khong can dung binh mana.',
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
      message: `Da dung ${item.name}: +${after - before} MP.`,
    };
  }

  if (
    [
      'prevent_hp_loss',
      'protect_streak',
      'valid_rest_day',
      'death_pardon',
      'loot_boost',
      'extend_boss_task',
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
      message: `Da kich hoat ${item.name}.`,
    };
  }

  return {
    state,
    success: false,
    message: 'Vat pham nay chua co cong dung trong V1.',
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

function scaleDropRate(rate, multiplier) {
  const next = parseRate(rate) * multiplier;
  if (next < 1) return `${Math.max(0.1, Math.round(next * 10) / 10)}%`;
  return `${Math.round(next)}%`;
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
      label: 'Level nhan vat',
      value: nonNegativeInt(profile?.level || 1),
      multiplier: 100,
    },
    {
      id: 'hp',
      label: 'HP hien tai',
      value: nonNegativeInt(profile?.hp),
      multiplier: 4,
    },
    {
      id: 'mana',
      label: 'MP hien tai',
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
      label: 'Streak',
      value: nonNegativeInt(profile?.streak),
      multiplier: 35,
    },
    {
      id: 'quests',
      label: 'Tong quest da hoan thanh',
      value: nonNegativeInt(profile?.lifetimeQuestsCompleted),
      multiplier: 2,
    },
    {
      id: 'exercise',
      label: 'Ngay the duc hoan hao',
      value: nonNegativeInt(profile?.lifetimeExercisePerfectDays),
      multiplier: 25,
    },
    {
      id: 'overcome',
      label: 'Quest vuot ban than da xong',
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
  if (value >= 300000) return 'Sieu viet';
  if (value >= 150000) return 'Chua te';
  if (value >= 80000) return 'Than thoai';
  if (value >= 40000) return 'Bat tu';
  if (value >= 20000) return 'Huyen thoai';
  if (value >= 10000) return 'Anh hung';
  if (value >= 6000) return 'Hiep si';
  if (value >= 3000) return 'Dung si';
  if (value >= 1000) return 'Chien binh';
  return 'Tap su';
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
    title: 'Boss Tuan sap xuat hien',
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
      title: 'Boss Cong Viec sap xuat hien',
      hour: 10,
      minute: 0,
    },
    {
      eventType: 'fitness',
      title: 'Boss The Duc sap xuat hien',
      hour: 16,
      minute: 30,
    },
    {
      eventType: 'discipline',
      title: 'Boss Ky Luat sap xuat hien',
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
    title: 'Boss Tuan sap xuat hien',
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
    results: [],
    lastSeenBossTemplateIds: [],
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
    results: Array.isArray(base.results)
      ? base.results.filter((result) => result && typeof result === 'object')
      : [],
    lastSeenBossTemplateIds,
  };
}

const BOSS_TEMPLATE_BY_EVENT_TYPE = {
  work: {
    id: 'boss_procrastination_ghost',
    name: 'Bong Ma Tri Hoan',
    typeLabel: 'Boss Cong Viec',
    themeLabel: 'Tri hoan cong viec',
    difficulty: 'Kho',
    powerRange: [1.08, 1.22],
    requiredRange: [0.62, 0.72],
    hpRange: [3.0, 3.6],
    durationHoursRange: [8, 12],
    lootTier: 1,
    variants: [
      'Bong Ma Tri Hoan',
      'Ke An Cap Deadline',
      'Phap Su Sao Lang',
    ],
    skillName: 'Hoi Mau Tri Hoan',
    skillDescription: 'Tre deadline se lam boss hoi HP trong ban that.',
  },
  fitness: {
    id: 'boss_lazy_demon',
    name: 'Quy Luoi Bieng',
    typeLabel: 'Boss The Duc',
    themeLabel: 'Vuot luoi van dong',
    difficulty: 'Kho',
    powerRange: [1.12, 1.28],
    requiredRange: [0.62, 0.75],
    hpRange: [3.2, 3.9],
    durationHoursRange: [4, 7],
    lootTier: 1,
    variants: [
      'Quy Luoi Bieng',
      'Cuong Thu Than Xac',
      'Ke Nuot Suc Ben',
    ],
    skillName: 'Than Xac Nang Ne',
    skillDescription: 'Nhiem vu qua de se gay it damage hon trong ban that.',
  },
  discipline: {
    id: 'boss_chain_breaker',
    name: 'Ke Pha Chuoi',
    typeLabel: 'Boss Ky Luat',
    themeLabel: 'Bao ve streak',
    difficulty: 'Rat kho',
    powerRange: [1.22, 1.42],
    requiredRange: [0.68, 0.82],
    hpRange: [3.7, 4.5],
    durationHoursRange: [3, 5],
    lootTier: 2,
    variants: [
      'Ke Pha Chuoi',
      'Quan Giam Nguc Thoi Quen',
      'Sat Thu Ky Luat',
    ],
    skillName: 'Xich Gay',
    skillDescription: 'Fail nhiem vu ky luat se tang giap boss trong ban that.',
  },
  weekly: {
    id: 'boss_weekend_gate_knight',
    name: 'Ky Si Cuoi Tuan',
    typeLabel: 'Boss Tuan',
    themeLabel: 'Ky luat tong hop',
    difficulty: 'Rat kho',
    powerRange: [1.25, 1.55],
    requiredRange: [0.65, 0.82],
    hpRange: [4.0, 5.4],
    durationHoursRange: [18, 28],
    lootTier: 3,
    variants: [
      'Ky Si Cuoi Tuan',
      'Nguoi Gac Cong Thu Bay',
      'Lanh Chua Ngay Nghi',
    ],
    skillName: 'Giap Cuoi Tuan',
    skillDescription:
      'Can hoan thanh it nhat 2 nhom nhiem vu khac nhau de pha giap.',
  },
  elite: {
    id: 'boss_elite_shadow_hunter',
    name: 'Tho San Bong Toi',
    typeLabel: 'Boss Tinh Anh',
    themeLabel: 'Thu thach gioi han',
    difficulty: 'Ac mong',
    powerRange: [1.55, 1.9],
    requiredRange: [0.78, 0.95],
    hpRange: [5.0, 6.5],
    durationHoursRange: [4, 8],
    lootTier: 4,
    variants: [
      'Tho San Bong Toi',
      'Kiem Si Hoang Hon',
      'Ke Truy Sat Manh Nhat',
    ],
    skillName: 'San Moi Yeu Diem',
    skillDescription: 'Nhiem vu bo do se lam cac nhiem vu sau kho hon.',
  },
  world: {
    id: 'boss_world_abyss_king',
    name: 'Vuong Gia Vuc Sau',
    typeLabel: 'Boss The Gioi',
    themeLabel: 'Dot pha thuc luc',
    difficulty: 'The gioi',
    powerRange: [2.2, 3.2],
    requiredRange: [0.9, 1.12],
    hpRange: [7.5, 10],
    durationHoursRange: [12, 24],
    lootTier: 5,
    variants: [
      'Vuong Gia Vuc Sau',
      'Long De Bong Toi',
      'Quan Vuong Cong Doan',
    ],
    skillName: 'Ap Luc The Gioi',
    skillDescription: 'Chi nguoi du luc chien moi duoc tham chien.',
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
    results: [],
    lastSeenBossTemplateIds: [boss.templateId],
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
    results: [],
    lastSeenBossTemplateIds: [],
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
    results: [],
    lastSeenBossTemplateIds: [],
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
      results: Array.isArray(bossState.results) ? bossState.results : [],
      lastSeenBossTemplateIds: Array.isArray(bossState.lastSeenBossTemplateIds)
        ? bossState.lastSeenBossTemplateIds
        : [],
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
  return {
    ...base,
    tasks: base.tasks.map((task) => {
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
  now = Date.now()
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
  const task = base.tasks.find((row) => row.id === taskId);
  if (!task || task.status === 'Completed' || task.status === 'Locked') {
    return base;
  }

  const currentBoss = normalizeBossForDisplay(base.currentBoss, playerPower);
  const damage = nonNegativeInt(task.damage);
  const nextHp = Math.max(0, currentBoss.currentHp - damage);
  const defeated = nextHp <= 0;

  return {
    ...base,
    currentBoss: {
      ...base.currentBoss,
      currentHp: nextHp,
      status: defeated ? 'defeated' : base.currentBoss.status ?? 'active',
      defeatedAt: defeated ? now : base.currentBoss.defeatedAt,
    },
    tasks: base.tasks.map((row) => {
      if (row.id !== taskId) return row;
      return {
        ...row,
        status: 'Completed',
        completedAt: now,
      };
    }),
  };
}

function rollOneLootEntry(entries) {
  const weighted = entries
    .map((entry) => ({
      ...entry,
      weight: parseRate(entry.rate ?? entry.dropRate),
    }))
    .filter((entry) => entry.weight > 0);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;

  let cursor = Math.random() * total;
  for (const entry of weighted) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return weighted[weighted.length - 1] ?? null;
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
  return received;
}

export function completeBossTaskAndRollRewards(
  bossState,
  inventory,
  taskId,
  playerPower,
  now = Date.now()
) {
  const before = ensurePlayableBossState(bossState, playerPower);
  const after = completeBossTask(before, taskId, playerPower, now);
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
      String(task.difficulty).toLowerCase() === 'ket lieu' ||
      String(task.title).toLowerCase().includes('ket lieu')
  );
  const lootTable = after.lootTable ?? createMockLootTable();
  const baseRolls = Math.max(1, nonNegativeInt(lootTable.maxRolls || 3));
  const rollsEarned = baseRolls + 1 + (finisherDone ? 1 : 0);
  const lootReceived = rollBossLoot(lootTable, rollsEarned);
  const nextInventory = lootReceived.reduce(
    (acc, item) => addInventoryItem(acc, item, item.quantity),
    inventory && typeof inventory === 'object'
      ? inventory
      : { items: {}, activeEffects: [] }
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
    lootReceived,
    createdAt: now,
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
      failReason: 'Boss expired',
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
    reason: 'Boss het gio truoc khi bi ha.',
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
    themeLabel: String(rawBoss.themeLabel ?? rawBoss.theme ?? 'Unknown'),
    imageKey: rawBoss.imageKey ?? rawBoss.templateId ?? rawBoss.id,
    generatedBy: String(rawBoss.generatedBy ?? 'manual'),
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
    difficulty: String(rawBoss.difficulty ?? 'Unknown'),
    endsAt:
      typeof rawBoss.endsAt === 'number'
        ? rawBoss.endsAt
        : Date.now() + 24 * 60 * 60 * 1000,
    specialSkill: {
      name: String(rawBoss.specialSkill?.name ?? 'Unknown skill'),
      description: String(
        rawBoss.specialSkill?.description ?? 'Boss skill chua duoc mo ta.'
      ),
    },
  };
}

export function getBossParticipationState(playerPower, boss) {
  const power = nonNegativeInt(playerPower);
  if (!boss) {
    return {
      tone: 'neutral',
      label: 'Chua co boss',
      description: 'Cong boss chua reveal.',
    };
  }

  if (power < boss.requiredPower) {
    return {
      tone: 'danger',
      label: 'Chi quan sat',
      description: `Thieu ${formatPower(boss.requiredPower - power)} luc chien de tham gia.`,
    };
  }

  if (power < boss.recommendedPower) {
    return {
      tone: 'warning',
      label: 'Du dieu kien - rat kho',
      description: 'Co the nhan nhiem vu boss, nhung boss dang manh hon ban.',
    };
  }

  if (power >= boss.bossPower * 2) {
    return {
      tone: 'warning',
      label: 'Qua manh so voi boss',
      description: 'Sau nay loot hiem co the bi giam de tranh farm boss yeu.',
    };
  }

  return {
    tone: 'success',
    label: 'Co the tham chien',
    description: 'Luc chien du de danh nghiem tuc boss nay.',
  };
}

export function canPlayerJoinBoss(playerPower, rawBoss) {
  const boss = normalizeBossForDisplay(rawBoss, playerPower);
  if (!boss) {
    return {
      allowed: false,
      reason: 'Chua co boss de tham chien.',
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

export function createMockBossRules(boss) {
  return {
    bossId: boss?.id ?? 'mock_boss',
    groups: [
      {
        title: 'Dieu kien tham gia',
        lines: [
          `Yeu cau luc chien toi thieu: ${formatPower(boss?.requiredPower ?? 0)}.`,
          'Duoi yeu cau chi co the quan sat, khong nhan loot chinh.',
        ],
      },
      {
        title: 'Dieu kien nhan loot',
        lines: [
          'Duoi 30% damage: khong nhan loot.',
          '30-59% damage: 1 roll co ban.',
          '60-99% damage: nhan roll chinh.',
          'Ha boss: roll chinh + bonus.',
        ],
      },
      {
        title: 'Luat nhiem vu',
        lines: [
          'Nhiem vu boss tach biet voi nhiem vu ca nhan.',
          'Moi nhiem vu co deadline va damage rieng.',
          'Bao cao mo ho se chua duoc tinh hoan thanh.',
        ],
      },
      {
        title: 'Luat vat pham',
        lines: [
          'Giay Nghi Phep khong duoc dung de bo nhiem vu boss.',
          'Bua May Man chi anh huong loot, khong tang damage.',
          'Lenh Gia Han va Ve Lam Lai chi dung 1 lan moi tran.',
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
          title: String(group.title ?? 'Rule'),
          lines: Array.isArray(group.lines)
            ? group.lines.map((line) => String(line))
            : [],
        })),
    };
  }

  const groups = [
    ['Dieu kien tham gia', rawRules.participation],
    ['Dieu kien nhan loot', rawRules.loot],
    ['Luat nhiem vu', rawRules.taskRules],
    ['Luat that bai', rawRules.failureRules],
    ['Luat vat pham', rawRules.itemRules],
    ['Luat bang chung', rawRules.proofRules],
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
        title: 'Chem Dut Tri Hoan',
        category: 'Cong viec',
        difficulty: 'Kho',
        objective: 'Deep work 60 phut khong dung mang xa hoi.',
        deadline: 'Truoc 16:00 hom nay',
        damage: Math.round(hp * 0.25),
        status: 'Available',
        proof: 'Bao gio bat dau, gio ket thuc va dau viec da xong.',
      },
      {
        id: 'task_backlog',
        title: 'Dot Ho So Ton Dong',
        category: 'Cong viec',
        difficulty: 'Kho',
        objective: 'Hoan thanh 1 viec da tri hoan tu 3 ngay tro len.',
        deadline: 'Truoc 18:00 hom nay',
        damage: Math.round(hp * 0.3),
        status: 'Available',
        proof: 'Mo ta viec ton dong va ket qua cuoi cung.',
      },
      {
        id: 'task_plan',
        title: 'Phong An Nhieu Loan',
        category: 'Tri tue',
        difficulty: 'Vua',
        objective: 'Don task list va chon 3 viec uu tien tiep theo.',
        deadline: 'Truoc 21:00 hom nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Ghi lai 3 viec uu tien.',
      },
      {
        id: 'task_work_finisher',
        title: 'Don Ket Lieu',
        category: 'Cong viec',
        difficulty: 'Ket lieu',
        objective: 'Deep work them 45 phut hoac hoan thanh task chinh.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.32),
        status: 'Available',
        proof: 'Bao ket qua cu the.',
      },
    ];
  }

  if (templateId.includes('lazy')) {
    return [
      {
        id: 'task_pushups',
        title: 'Cu Dam Khoi Dong',
        category: 'The duc',
        difficulty: 'Vua',
        objective: 'Hit dat 60 cai, chia toi da 6 hiep.',
        deadline: 'Truoc 18:30 hom nay',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Bao so hiep va reps tung hiep.',
      },
      {
        id: 'task_squat',
        title: 'Pha Xieng I Ach',
        category: 'The duc',
        difficulty: 'Kho',
        objective: 'Squat 120 cai, chia toi da 6 hiep.',
        deadline: 'Truoc 19:00 hom nay',
        damage: Math.round(hp * 0.27),
        status: 'Available',
        proof: 'Bao so hiep va reps tung hiep.',
      },
      {
        id: 'task_plank',
        title: 'Giu Than Bat Dong',
        category: 'The duc',
        difficulty: 'Vua',
        objective: 'Plank tong 3 phut.',
        deadline: 'Truoc 20:00 hom nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Bao so hiep plank va thoi luong tung hiep.',
      },
      {
        id: 'task_fitness_finisher',
        title: 'Don Ket Lieu',
        category: 'The duc',
        difficulty: 'Ket lieu',
        objective: 'Hoan thanh 3 bai bat ky trong cung mot buoi.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.35),
        status: 'Available',
        proof: 'Tong ket toan bo buoi tap.',
      },
    ];
  }

  if (templateId.includes('chain')) {
    return [
      {
        id: 'task_no_social',
        title: 'Khoa Cong MXH',
        category: 'Ky luat',
        difficulty: 'Kho',
        objective: 'Khong MXH giai tri trong 4 gio lien tuc.',
        deadline: 'Truoc 22:00 hom nay',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Bao khung gio bat dau/ket thuc.',
      },
      {
        id: 'task_no_delay',
        title: 'Giet Thoi Tri Hoan',
        category: 'Ky luat',
        difficulty: 'Kho',
        objective: 'Lam ngay 1 viec dang ne tranh trong 30 phut.',
        deadline: 'Truoc 21:00 hom nay',
        damage: Math.round(hp * 0.24),
        status: 'Available',
        proof: 'Bao viec da lam va ket qua.',
      },
      {
        id: 'task_clean_space',
        title: 'Thanh Loc Moi Truong',
        category: 'Tinh than',
        difficulty: 'Vua',
        objective: 'Don ban lam viec hoac phong trong 30 phut.',
        deadline: 'Truoc 21:30 hom nay',
        damage: Math.round(hp * 0.18),
        status: 'Available',
        proof: 'Bao khu vuc da don.',
      },
      {
        id: 'task_chain_finisher',
        title: 'Don Ket Lieu',
        category: 'Ky luat',
        difficulty: 'Ket lieu',
        objective: 'Tong ket ngay va cam ket 1 quy tac cho ngay mai.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.32),
        status: 'Available',
        proof: 'Ghi lai quy tac cam ket.',
      },
    ];
  }

  if (templateId.includes('elite_shadow_hunter')) {
    return [
      {
        id: 'task_elite_focus',
        title: 'Truy Vet Muc Tieu',
        category: 'Tong hop',
        difficulty: 'Rat kho',
        objective: 'Hoan thanh 90 phut deep work hoac 1 viec rat quan trong.',
        deadline: 'Trong cua so boss',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Bao muc tieu, thoi gian lam va ket qua cu the.',
      },
      {
        id: 'task_elite_body',
        title: 'Ep Than Luyen The',
        category: 'The duc',
        difficulty: 'Rat kho',
        objective: 'Chon 3 bai: hit dat, squat, plank, burpee va hoan thanh tong 45 phut.',
        deadline: 'Trong cua so boss',
        damage: Math.round(hp * 0.26),
        status: 'Available',
        proof: 'Bao tung bai, so hiep va tong thoi gian.',
      },
      {
        id: 'task_elite_discipline',
        title: 'Cam Gioi Giai Tri',
        category: 'Ky luat',
        difficulty: 'Rat kho',
        objective: 'Khong MXH/giai tri 6 gio lien tuc.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Bao khung gio va cach kiem soat.',
      },
      {
        id: 'task_elite_finisher',
        title: 'Don Ket Lieu Tinh Anh',
        category: 'Tong hop',
        difficulty: 'Ket lieu',
        objective: 'Tong ket tran va hoan thanh them 1 viec ban dang ne tranh.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.3),
        status: 'Available',
        proof: 'Bao viec ne tranh va ket qua cuoi cung.',
      },
    ];
  }

  if (templateId.includes('world_abyss')) {
    return [
      {
        id: 'task_world_gate',
        title: 'Mo Cong The Gioi',
        category: 'Tong hop',
        difficulty: 'Cuc kho',
        objective: 'Hoan thanh 120 phut deep work, chia toi da 3 phien.',
        deadline: 'Trong ngay event',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Bao tung phien, thoi gian va dau ra.',
      },
      {
        id: 'task_world_body',
        title: 'Than The Chiu Ap Luc',
        category: 'The duc',
        difficulty: 'Cuc kho',
        objective: 'Tap 60 phut gom it nhat 4 bai khac nhau.',
        deadline: 'Trong ngay event',
        damage: Math.round(hp * 0.2),
        status: 'Available',
        proof: 'Bao danh sach bai tap, hiep, reps hoac thoi gian.',
      },
      {
        id: 'task_world_chain',
        title: 'Khoa Chuoi The Gioi',
        category: 'Ky luat',
        difficulty: 'Cuc kho',
        objective: 'Khong MXH/giai tri 8 gio va khong tri hoan viec chinh.',
        deadline: 'Trong ngay event',
        damage: Math.round(hp * 0.22),
        status: 'Available',
        proof: 'Bao khung gio va viec chinh da xu ly.',
      },
      {
        id: 'task_world_wisdom',
        title: 'Doc Lenh Vuc Sau',
        category: 'Tri tue',
        difficulty: 'Rat kho',
        objective: 'Hoc/doc 45 phut va viet lai 5 y ap dung duoc.',
        deadline: 'Trong ngay event',
        damage: Math.round(hp * 0.16),
        status: 'Available',
        proof: 'Ghi 5 y ap dung.',
      },
      {
        id: 'task_world_finisher',
        title: 'Pha Loi The Gioi',
        category: 'Tong hop',
        difficulty: 'Ket lieu',
        objective: 'Hoan thanh viec kho nhat trong ngay va viet tong ket tran.',
        deadline: 'Truoc khi boss bien mat',
        damage: Math.round(hp * 0.28),
        status: 'Available',
        proof: 'Bao viec kho nhat va ket qua.',
      },
    ];
  }

  return [
    {
      id: 'task_opening',
      title: 'Mo Tran',
      category: 'Cong viec',
      difficulty: 'Vua',
      objective: 'Deep work 45 phut khong dung mang xa hoi.',
      deadline: 'Truoc 15:00 hom nay',
      damage: Math.round(hp * 0.18),
      status: 'Available',
      proof: 'Bao gio bat dau, gio ket thuc va viec da xong.',
    },
    {
      id: 'task_break_armor',
      title: 'Pha Giap',
      category: 'The duc',
      difficulty: 'Kho',
      objective: 'Hit dat 80 cai, chia toi da 8 hiep.',
      deadline: 'Truoc 18:30 hom nay',
      damage: Math.round(hp * 0.22),
      status: 'Available',
      proof: 'Bao so hiep va reps tung hiep.',
    },
    {
      id: 'task_discipline',
      title: 'Giu Ky Luat',
      category: 'Ky luat',
      difficulty: 'Kho',
      objective: 'Khong MXH giai tri trong 4 gio lien tuc.',
      deadline: 'Truoc 21:00 hom nay',
      damage: Math.round(hp * 0.25),
      status: 'Available',
      proof: 'Bao khung gio bat dau/ket thuc.',
    },
    {
      id: 'task_finisher',
      title: 'Don Ket Lieu',
      category: 'Tong hop',
      difficulty: 'Ket lieu',
      objective: 'Tong ket ngay va xu ly 1 viec ton dong.',
      deadline: 'Truoc khi boss bien mat',
      damage: Math.round(hp * 0.4),
      status: 'Available',
      proof: 'Bao ket qua tong ket va viec ton dong da xu ly.',
    },
  ];
}

export function normalizeBossTasksForDisplay(rawTasks, boss) {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return createMockBossTasks(boss);
  }

  return rawTasks
    .filter((task) => task && typeof task === 'object')
    .map((task) => ({
      id: String(task.id ?? `${task.title}-${task.damage}`),
      title: String(task.title ?? 'Boss task'),
      category: String(task.category ?? 'Unknown'),
      difficulty: String(task.difficulty ?? 'Unknown'),
      objective: String(task.objective ?? task.description ?? ''),
      deadline:
        typeof task.deadline === 'string'
          ? task.deadline
          : typeof task.deadlineAt === 'number'
            ? new Date(task.deadlineAt).toLocaleString('vi-VN')
            : 'Chua co deadline',
      damage: nonNegativeInt(task.damage),
      status: String(task.status ?? 'available'),
      proof: String(task.proof ?? task.completionRule ?? task.proofType ?? ''),
    }));
}

export function createMockLootTable(boss = null) {
  const lootTier = clampNumber(nonNegativeInt(boss?.lootTier ?? 1), 1, 5);
  const rateMultiplier = [0, 0.85, 1, 1.15, 1.35, 1.6][lootTier] ?? 1;
  const maxRolls = Math.max(3, 2 + lootTier);
  return {
    maxRolls,
    lootTier,
    mainLootRequirement:
      lootTier >= 4
        ? 'Gay it nhat 70% HP boss hoac ha boss'
        : 'Gay it nhat 60% HP boss',
    entries: [
      {
        id: 'item_large_mana_potion',
        name: 'Binh Mana Lon',
        rarity: 'Rare',
        rate: scaleDropRate('10%', rateMultiplier),
        condition: '30% damage',
        description: 'Hoi 35 MP.',
      },
      {
        id: 'item_life_shield',
        name: 'Khien Sinh Menh',
        rarity: 'Rare',
        rate: scaleDropRate('12%', rateMultiplier),
        condition: '30% damage',
        description: 'Chan mat HP 1 lan.',
      },
      {
        id: 'item_streak_freeze',
        name: 'Binh Dong Bang Chuoi',
        rarity: 'Epic',
        rate: scaleDropRate('3%', Math.min(1.25, rateMultiplier)),
        condition: '60% damage',
        description: 'Nghi 1 ngay khong mat streak.',
      },
      {
        id: 'item_rest_permit',
        name: 'Giay Nghi Phep',
        rarity: 'Legendary',
        rate: scaleDropRate('0.7%', Math.min(1.35, rateMultiplier)),
        condition: 'Ha boss',
        description: 'Mot ngay nghi hop le, khong phat HP/streak.',
      },
      {
        id: 'item_death_pardon',
        name: 'Lenh Mien Tu',
        rarity: 'Mythic',
        rate: scaleDropRate('0.2%', Math.min(1.4, rateMultiplier)),
        condition: 'Ha boss + ket lieu',
        description: 'Mot lan chet khong mat streak/debuff.',
      },
      ...(lootTier >= 3
        ? [
            {
              id: 'item_lucky_charm',
              name: 'Bua May Man Nho',
              rarity: 'Epic',
              rate: scaleDropRate('1.8%', Math.min(1.25, rateMultiplier)),
              condition: 'Ha boss',
              description: 'Tang nhe ti le loot hiem trong 1 tran sau.',
            },
          ]
        : []),
      ...(lootTier >= 5
        ? [
            {
              id: 'item_world_core',
              name: 'Loi Boss The Gioi',
              rarity: 'Mythic',
              rate: '0.1%',
              condition: 'Ha boss the gioi',
              description: 'Nguyen lieu cuc hiem cho he boss sau nay.',
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

  const entries = Array.isArray(rawLootTable.entries)
    ? rawLootTable.entries
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
          id: String(entry.id ?? entry.itemId ?? entry.name ?? 'loot_item'),
          name: String(
            entry.name ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).name
          ),
          rarity: String(
            entry.rarity ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).rarity
          ),
          iconKey: String(
            entry.iconKey ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).iconKey
          ),
          scope: String(
            entry.scope ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).scope
          ),
          useType: String(
            entry.useType ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).useType
          ),
          rate:
            entry.rate != null
              ? String(entry.rate)
              : entry.dropRate != null
                ? `${entry.dropRate}%`
                : '?',
          condition: String(
            entry.condition ??
              (entry.requiresDefeat
                ? 'Ha boss'
                : `${entry.minDamagePercent ?? 0}% damage`)
          ),
          description: String(
            entry.description ??
              getItemDefinition(String(entry.itemId ?? entry.id ?? '')).description
          ),
        }))
    : [];

  return {
    maxRolls: nonNegativeInt(rawLootTable.maxRolls ?? 0),
    lootTier: Math.max(1, nonNegativeInt(rawLootTable.lootTier ?? 1)),
    mainLootRequirement: String(
      rawLootTable.mainLootRequirement ??
        rawLootTable.mainRequirement ??
        'Theo dieu kien damage cua boss'
    ),
    entries: entries.length ? entries : createMockLootTable().entries,
  };
}

export function createMockInventory() {
  return [
    {
      id: 'item_large_hp_potion',
      name: 'Binh Mau Lon',
      rarity: 'Rare',
      quantity: 2,
      scope: 'Ngoai boss',
      description: 'Hoi 25 HP.',
      state: 'Dung duoc',
    },
    {
      id: 'item_streak_freeze',
      name: 'Binh Dong Bang Chuoi',
      rarity: 'Epic',
      quantity: 1,
      scope: 'Ngoai boss',
      description: 'Nghi 1 ngay khong mat streak.',
      state: 'Cooldown tuan',
    },
    {
      id: 'item_lucky_charm',
      name: 'Bua May Man Nho',
      rarity: 'Rare',
      quantity: 1,
      scope: 'Trong boss',
      description: 'Tang nhe ti le loot hiem trong 1 tran.',
      state: 'Dung trong tran',
    },
    {
      id: 'item_extend_order',
      name: 'Lenh Gia Han',
      rarity: 'Epic',
      quantity: 1,
      scope: 'Trong boss',
      description: 'Gia han 1 nhiem vu boss.',
      state: 'Dung trong tran',
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
