export const BOSS_ASSET_SLOTS = {
  boss_procrastination_ghost: {
    label: 'Boss Cong Viec',
    expectedFile: 'assets/images/boss/boss_procrastination_ghost.png',
    symbol: 'WG',
    colors: ['#2d1238', '#7c3aed', '#f5c842'],
  },
  boss_lazy_demon: {
    label: 'Boss The Duc',
    expectedFile: 'assets/images/boss/boss_lazy_demon.png',
    symbol: 'LD',
    colors: ['#24100b', '#dc2626', '#f97316'],
  },
  boss_chain_breaker: {
    label: 'Boss Ky Luat',
    expectedFile: 'assets/images/boss/boss_chain_breaker.png',
    symbol: 'CB',
    colors: ['#111827', '#64748b', '#f5c842'],
  },
  boss_weekend_gate_knight: {
    label: 'Boss Tuan',
    expectedFile: 'assets/images/boss/boss_weekend_gate_knight.png',
    symbol: 'WK',
    colors: ['#0f172a', '#7c3aed', '#38bdf8'],
  },
  boss_elite_shadow_hunter: {
    label: 'Boss Tinh Anh',
    expectedFile: 'assets/images/boss/boss_elite_shadow_hunter.png',
    symbol: 'EH',
    colors: ['#09090b', '#a855f7', '#ef4444'],
  },
  boss_world_abyss_king: {
    label: 'Boss The Gioi',
    expectedFile: 'assets/images/boss/boss_world_abyss_king.png',
    symbol: 'WB',
    colors: ['#020617', '#2563eb', '#f5c842'],
  },
};

export const ITEM_ASSET_SLOTS = {
  item_large_hp_potion: {
    expectedFile: 'assets/images/items/item_large_hp_potion.png',
    symbol: 'HP',
    colors: ['#26080d', '#dc2626'],
  },
  item_large_mana_potion: {
    expectedFile: 'assets/images/items/item_large_mana_potion.png',
    symbol: 'MP',
    colors: ['#0f172a', '#2563eb'],
  },
  item_life_shield: {
    expectedFile: 'assets/images/items/item_life_shield.png',
    symbol: 'SH',
    colors: ['#07170d', '#16a34a'],
  },
  item_streak_freeze: {
    expectedFile: 'assets/images/items/item_streak_freeze.png',
    symbol: 'SF',
    colors: ['#082f49', '#38bdf8'],
  },
  item_rest_permit: {
    expectedFile: 'assets/images/items/item_rest_permit.png',
    symbol: 'RP',
    colors: ['#1c1307', '#f5c842'],
  },
  item_death_pardon: {
    expectedFile: 'assets/images/items/item_death_pardon.png',
    symbol: 'DP',
    colors: ['#18181b', '#ef4444'],
  },
  item_lucky_charm: {
    expectedFile: 'assets/images/items/item_lucky_charm.png',
    symbol: 'LC',
    colors: ['#171128', '#a855f7'],
  },
  item_extend_order: {
    expectedFile: 'assets/images/items/item_extend_order.png',
    symbol: 'EX',
    colors: ['#111827', '#f97316'],
  },
  item_world_core: {
    expectedFile: 'assets/images/items/item_world_core.png',
    symbol: 'WC',
    colors: ['#020617', '#f5c842'],
  },
};

export const BOSS_IMAGE_SOURCES = {};
export const ITEM_ICON_SOURCES = {};

export function getBossVisual(imageKey) {
  const key = String(imageKey ?? '').trim();
  const slot = BOSS_ASSET_SLOTS[key] ?? BOSS_ASSET_SLOTS.boss_weekend_gate_knight;
  return {
    key,
    source: BOSS_IMAGE_SOURCES[key] ?? null,
    ...slot,
  };
}

export function getItemVisual(iconKey, rarity = 'Unknown') {
  const key = String(iconKey ?? '').trim();
  const slot = ITEM_ASSET_SLOTS[key] ?? {
    expectedFile: '',
    symbol: String(rarity || '?').slice(0, 2).toUpperCase(),
    colors: ['#171128', '#4b2f85'],
  };
  return {
    key,
    source: ITEM_ICON_SOURCES[key] ?? null,
    ...slot,
  };
}
