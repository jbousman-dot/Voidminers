import { MINERS, WEAPONS, META } from './data.js';

export function freshState() {
  return {
    ore: 0, totalOre: 0,
    crys: 0, totalCrys: 0,
    sing: 0, totalSing: 0,
    dm: 0,
    scrap: 0, totalScrap: 0,
    miners: Object.fromEntries(MINERS.map(m => [m.id, 0])),
    weapons: Object.fromEntries(WEAPONS.map(w => [w.id, 0])),
    meta: Object.fromEntries(META.map(m => [m.id, 0])),
    research: {},
    forgeModifiers: [],
    erasUnlocked: 0,
    autos: {
      buyMiners: false,
      buyMinersStrategy: 'efficient',
      buyWeapons: false,
      buyWeaponsStrategy: 'efficient',
      refine: false,
      warp: false,
      ascend: false,
    },
    autoBoughtCounts: { miners: 0, weapons: 0 },
    tab: 'mine', mode: 'mine',
    lastSave: 0, lastTick: 0,
    autoBuyAcc: 0,
    sector: 1,
    refineCount: 0, warpCount: 0, ascendCount: 0,
    currentStage: 1, currentEnemyIdx: 0,
    enemyHp: 40, enemyMaxHp: 40,
    inAnomalyFight: false,
    anomalyFightData: null,
    kills: 0,
    bossesDefeated: { 1: false, 2: false, 3: false },
    bossesEverDefeated: { 1: 0, 2: 0, 3: 0 },
    expeditions: {},
    expeditionsHistory: 0,
    activeBuffs: [],
    pendingAnomaly: null,
    anomalyAcc: 0,
  };
}

export function startingOre(state) {
  return 25 * (state.meta.start || 0);
}
