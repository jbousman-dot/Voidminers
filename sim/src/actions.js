import { MINERS, WEAPONS, STAGES, ERAS, META, RESEARCH, EXPEDITIONS, ANOMALY_TYPES } from './data.js';
import { freshState, startingOre } from './state.js';
import {
  era, hasModifier, minerCost, weaponCost, weaponUnlocked,
  getCurrentEncounter, totalRate, totalDPS, refineGain, warpGain, ascendGain,
  refineThreshold, bonusFromResearch, expDuration, expYield
} from './formulas.js';

export function spawnNextEnemy(state) {
  let stage = STAGES.find(s => s.id === state.currentStage);
  if (!stage) {
    state.currentStage = 3;
    state.currentEnemyIdx = 0;
    stage = STAGES.find(s => s.id === state.currentStage);
  }
  const enc = getCurrentEncounter(state);
  if (!enc) return;
  state.enemyMaxHp = enc.hp;
  state.enemyHp = enc.hp;
}

export function damageEnemy(state, amount, clock, rng) {
  if (amount <= 0) return;
  state.enemyHp -= amount;
  if (state.enemyHp <= 0) onEnemyDeath(state, clock, rng);
}

function onEnemyDeath(state, clock, rng) {
  if (state.inAnomalyFight) {
    const t = ANOMALY_TYPES.find(x => x.id === state.anomalyFightData.typeId);
    state.inAnomalyFight = false;
    state.anomalyFightData = null;
    state.pendingAnomaly = null;
    if (t && t.reward) {
      state.activeBuffs.push({ ...t.reward, expiresAt: clock.now + t.reward.dur * 1000 });
    }
    const bonus = state.totalOre * 0.1 + 1000;
    state.ore += bonus;
    state.totalOre += bonus;
    spawnNextEnemy(state);
    return;
  }

  const enc = getCurrentEncounter(state);
  if (!enc) return;
  let bossBonus = 1 + 0.25 * (state.meta.bossres || 0);
  if (hasModifier(state, 'mfBoss')) bossBonus *= 5;
  const sectorScale = Math.pow(1.8, state.sector - 1);
  const reward = Math.floor(enc.reward * sectorScale * (enc.isBoss ? bossBonus : 1));
  state.scrap += reward;
  state.totalScrap += reward;
  const oreReward = reward * 10;
  state.ore += oreReward;
  state.totalOre += oreReward;
  state.kills++;

  if (enc.isBoss) {
    state.bossesDefeated[enc.stageId] = true;
    state.bossesEverDefeated[enc.stageId] = (state.bossesEverDefeated[enc.stageId] || 0) + 1;
    state.currentStage++;
    state.currentEnemyIdx = 0;
  } else {
    state.currentEnemyIdx++;
  }
  spawnNextEnemy(state);
}

export function doRefine(state, clock) {
  const g = refineGain(state);
  if (g <= 0) return false;
  state.crys += g;
  state.totalCrys += g;
  state.refineCount++;
  state.ore = startingOre(state);
  state.totalOre = 0;
  for (const m of MINERS) state.miners[m.id] = 0;
  for (const w of WEAPONS) state.weapons[w.id] = 0;
  state.scrap = 0;
  state.kills = 0;
  state.currentStage = 1;
  state.currentEnemyIdx = 0;
  state.bossesDefeated = { 1: false, 2: false, 3: false };
  spawnNextEnemy(state);
  return true;
}

export function doWarp(state, clock) {
  const g = warpGain(state);
  if (g <= 0) return false;
  state.sing += g;
  state.totalSing += g;
  state.warpCount++;
  state.sector++;
  state.ore = startingOre(state);
  state.totalOre = 0;
  state.crys = 0;
  state.totalCrys = 0;
  for (const m of MINERS) state.miners[m.id] = 0;
  for (const w of WEAPONS) state.weapons[w.id] = 0;
  state.scrap = 0;
  state.kills = 0;
  state.currentStage = 1;
  state.currentEnemyIdx = 0;
  state.bossesDefeated = { 1: false, 2: false, 3: false };
  spawnNextEnemy(state);
  return true;
}

export function finalizeAscend(state, g, modifiers, clock) {
  const keep = {
    dm: state.dm + g,
    meta: state.meta,
    erasUnlocked: state.erasUnlocked,
    research: state.research,
    forgeModifiers: modifiers || [],
    ascendCount: state.ascendCount + 1,
    bossesEverDefeated: state.bossesEverDefeated,
    expeditionsHistory: state.expeditionsHistory,
    autos: state.autos
  };
  const fresh = freshState();
  Object.assign(state, fresh, keep);
  state.ore = startingOre(state);
  state.lastTick = clock.now;
  state.lastSave = clock.now;
  spawnNextEnemy(state);
  return true;
}

export function doAscend(state, clock) {
  const g = ascendGain(state);
  if (g <= 0) return false;
  return finalizeAscend(state, g, state.forgeModifiers, clock);
}

export function buyMiner(state, id) {
  const m = MINERS.find(x => x.id === id);
  const cost = minerCost(m, state.miners[id], state);
  if (state.ore < cost) return false;
  state.ore -= cost;
  state.miners[id]++;
  return true;
}

export function buyWeapon(state, id) {
  const w = WEAPONS.find(x => x.id === id);
  if (!weaponUnlocked(state, w)) return false;
  const cost = weaponCost(w, state.weapons[id], state);
  if (state.ore < cost) return false;
  state.ore -= cost;
  state.weapons[id]++;
  return true;
}

export function buyEra(state) {
  const next = state.erasUnlocked + 1;
  const eraData = ERAS.find(e => e.id === next);
  if (!eraData || state.dm < eraData.cost) return false;
  state.dm -= eraData.cost;
  state.erasUnlocked = next;
  if (next === 1) state.autos.buyMiners = true;
  if (next === 2) state.autos.buyWeapons = true;
  return true;
}

export function buyMeta(state, id) {
  const u = META.find(x => x.id === id);
  if (!u || (u.era && era(state) < u.era)) return false;
  const owned = state.meta[id];
  if (owned >= u.max || state.dm < u.cost) return false;
  state.dm -= u.cost;
  state.meta[id] = owned + 1;
  return true;
}

export function buyResearch(state, id) {
  if (era(state) < 2) return false;
  if (state.research[id]) return false;
  const node = RESEARCH.find(r => r.id === id);
  if (!node || node.prereq.some(p => !state.research[p])) return false;
  const cost = Math.ceil(node.cost * (1 - 0.1 * (state.meta.rsdisc || 0)));
  if (state.sing < cost) return false;
  state.sing -= cost;
  state.research[id] = true;
  return true;
}

export function startExpedition(state, id, clock) {
  const e = EXPEDITIONS.find(x => x.id === id);
  if (!e || state.expeditions[id]?.active) return false;
  if (state.miners.drone < e.minerCost) return false;
  state.expeditions[id] = {
    active: true,
    startTime: clock.now,
    duration: expDuration(state, e) * 1000,
    minerCost: e.minerCost
  };
  return true;
}

export function checkExpeditions(state, clock, rng) {
  for (const id in state.expeditions) {
    const ex = state.expeditions[id];
    if (!ex.active) continue;
    if (clock.now - ex.startTime >= ex.duration) {
      const e = EXPEDITIONS.find(x => x.id === id);
      const y = expYield(state, e);
      state.crys += y.crys;
      state.totalCrys += y.crys;
      state.scrap += y.scrap;
      state.totalScrap += y.scrap;
      if (y.sing && rng() < 0.2) {
        state.sing += y.sing;
        state.totalSing += y.sing;
      }
      state.expeditions[id] = { active: false };
      state.expeditionsHistory++;
    }
  }
}

export function anomalyTick(state, dt, clock, rng) {
  if (era(state) < 3) return;
  if (state.pendingAnomaly && !state.inAnomalyFight) {
    if (clock.now > state.pendingAnomaly.expiresAt) {
      state.pendingAnomaly = null;
    }
    return;
  }
  if (state.pendingAnomaly || state.inAnomalyFight) return;
  state.anomalyAcc += dt;
  const interval = 600 / (1 + 0.25 * (state.meta.anchance || 0));
  if (state.anomalyAcc >= interval) {
    state.anomalyAcc = 0;
    // Spawn anomaly
    const t = ANOMALY_TYPES[Math.floor(rng() * ANOMALY_TYPES.length)];
    state.pendingAnomaly = {
      typeId: t.id,
      expiresAt: clock.now + t.duration * 1000,
      spawnedAt: clock.now
    };
  }
}

export function resolveAnomaly(state, clock, rng) {
  if (!state.pendingAnomaly) return;
  const t = ANOMALY_TYPES.find(x => x.id === state.pendingAnomaly.typeId);
  if (!t) return;

  if (t.isCombat) {
    // Start anomaly fight
    const playerDPS = totalDPS(state);
    const targetTtk = 30 + rng() * 30;
    const hp = Math.max(1000, playerDPS * targetTtk);
    state.inAnomalyFight = true;
    state.anomalyFightData = { typeId: t.id, bossName: t.bossName, originalHp: hp };
    state.enemyMaxHp = hp;
    state.enemyHp = hp;
    state.mode = 'combat';
    return;
  }

  if (t.choices) {
    // Always pick first choice (ore mult) for simulation
    const choice = t.choices[0];
    if (choice.val.dur) {
      state.activeBuffs.push({ ...choice.val, expiresAt: clock.now + choice.val.dur * 1000 });
    }
  } else if (t.instantReward) {
    if (t.instantReward.type === 'oreTime') {
      const gain = totalRate(state) * t.instantReward.val;
      state.ore += gain;
      state.totalOre += gain;
    } else if (t.instantReward.type === 'crys') {
      const gain = Math.max(1, Math.floor(Math.sqrt(state.totalOre / 1000)));
      state.crys += gain;
      state.totalCrys += gain;
    }
  }
  state.pendingAnomaly = null;
}
