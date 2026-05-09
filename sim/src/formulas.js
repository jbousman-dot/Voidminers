import { MINERS, WEAPONS, STAGES, RESEARCH, ANOMALY_TYPES } from './data.js';

export function era(state) { return state.erasUnlocked; }
export function hasModifier(state, id) { return state.forgeModifiers.includes(id); }

export function discountMult(state) {
  return Math.pow(0.95, state.meta.cheap || 0) * (hasModifier(state, 'mfSwarm') ? 0.7 : 1);
}
export function minerCost(m, owned, state) {
  return Math.ceil(m.base * Math.pow(m.growth, owned) * discountMult(state));
}
export function weaponCost(w, owned, state) {
  return Math.ceil(w.base * Math.pow(w.growth, owned) * discountMult(state));
}

export function bonusFromResearch(state, type) {
  let val = 0;
  for (const id in state.research) {
    if (!state.research[id]) continue;
    const node = RESEARCH.find(r => r.id === id);
    if (node && node.effect.type === type) val += node.effect.val;
  }
  return val;
}

export function globalMult(state) {
  const crysBoost = 0.04 + 0.005 * (state.meta.crys || 0);
  const mFromCrys = 1 + state.crys * crysBoost;
  const mFromSing = Math.pow(1.5, Math.min(state.sing, 50));
  const mFromSpeed = Math.pow(1.25, state.meta.speed || 0);
  const sectorBonus = Math.pow(2, Math.min(state.sector - 1, 20));
  const research = (1 + bonusFromResearch(state, 'globalMult'));
  return mFromCrys * mFromSing * mFromSpeed * sectorBonus * research;
}

export function totalRate(state) {
  let r = 0;
  for (const m of MINERS) r += m.rate * state.miners[m.id];
  let mult = globalMult(state);
  mult *= (1 + bonusFromResearch(state, 'mineRate'));
  mult *= (1 + bonusFromResearch(state, 'perRefine') * state.refineCount);
  if (hasModifier(state, 'mfMine')) mult *= 5;
  if (hasModifier(state, 'mfCombat')) mult *= 0.4;
  if (hasModifier(state, 'mfFast')) mult *= 2;
  if (hasModifier(state, 'mfSwarm')) mult *= 0.7;
  for (const b of state.activeBuffs) if (b.type === 'oreMult') mult *= b.val;
  const awayCount = Object.values(state.expeditions).filter(e => e.active).reduce((s, e) => s + (e.minerCost || 0), 0);
  if (awayCount > 0) {
    const awayRatio = Math.min(1, awayCount / 100);
    mult *= (1 - awayRatio * 0.5);
  }
  return r * mult;
}

export function totalDPS(state) {
  let d = 0;
  for (const w of WEAPONS) d += w.dps * state.weapons[w.id];
  let mult = (1 + 0.25 * (state.meta.wpndmg || 0));
  mult *= (1 + bonusFromResearch(state, 'wpnDmg'));
  mult *= globalMult(state);
  if (hasModifier(state, 'mfCombat')) mult *= 5;
  if (hasModifier(state, 'mfMine')) mult *= 0.4;
  if (hasModifier(state, 'mfFast')) mult *= 2;
  if (hasModifier(state, 'mfSwarm')) mult *= 0.7;
  const enc = getCurrentEncounter(state);
  if (enc?.isBoss) mult *= (1 + bonusFromResearch(state, 'bossDmg'));
  for (const b of state.activeBuffs) if (b.type === 'dpsMult') mult *= b.val;
  return d * mult;
}

export function tapPower(state) {
  let base = (1 + (state.meta.tap || 0));
  if (bonusFromResearch(state, 'tapMult') > 0) base *= (1 + bonusFromResearch(state, 'tapMult'));
  if (hasModifier(state, 'mfTap')) base *= 10;
  if (hasModifier(state, 'mfAuto')) base = 0;
  return base * globalMult(state);
}

export function tapDamage(state) {
  return tapPower(state) * 3 * (1 + 0.25 * (state.meta.wpndmg || 0)) * (1 + bonusFromResearch(state, 'wpnDmg'));
}

export function refineThreshold(state) {
  return 5000 * (1 + bonusFromResearch(state, 'refineThresh'));
}

export function weaponUnlocked(state, w) {
  if (w.unlock === 'always') return true;
  if (w.unlock.startsWith('kills:')) return state.kills >= parseInt(w.unlock.split(':')[1]);
  if (w.unlock.startsWith('boss:')) return state.bossesEverDefeated[parseInt(w.unlock.split(':')[1])] > 0;
  return false;
}

export function getCurrentEncounter(state) {
  if (state.inAnomalyFight && state.anomalyFightData) {
    return {
      name: state.anomalyFightData.bossName,
      hp: state.enemyMaxHp,
      reward: 0,
      isBoss: false,
      isAnomaly: true,
      stageId: 0
    };
  }
  const stage = STAGES.find(s => s.id === state.currentStage);
  if (!stage) return null;
  const sectorScale = Math.pow(1.8, state.sector - 1);
  if (state.currentEnemyIdx >= stage.enemies.length) {
    let bossHp = Math.ceil(stage.boss.hp * sectorScale);
    if (hasModifier(state, 'mfFast')) bossHp *= 3;
    return { ...stage.boss, hp: bossHp, isBoss: true, stageId: stage.id };
  }
  const e = stage.enemies[state.currentEnemyIdx];
  return { ...e, hp: Math.ceil(e.hp * sectorScale), isBoss: false, stageId: stage.id };
}

export function refineGain(state) {
  if (!state.bossesDefeated[1]) return 0;
  if (state.totalOre < refineThreshold(state)) return 0;
  let g = Math.floor(Math.sqrt(state.totalOre / refineThreshold(state)));
  if (hasModifier(state, 'mfRich')) g = Math.floor(g * 3);
  return g;
}

export function warpGain(state) {
  if (!state.bossesDefeated[2]) return 0;
  if (state.totalCrys < 25) return 0;
  let g = Math.floor(Math.pow(state.totalCrys / 25, 0.6) * (1 + 0.1 * (state.meta.sing || 0)));
  if (hasModifier(state, 'mfWarp')) g = Math.floor(g * 2);
  return Math.max(g, 1);
}

export function ascendGain(state) {
  if (!state.bossesDefeated[3]) return 0;
  if (state.totalSing < 4) return 0;
  return Math.max(1, Math.floor(state.totalSing * 1.25));
}

export function expDuration(state, e) {
  let d = e.duration;
  d *= (1 - 0.15 * (state.meta.expspd || 0));
  d *= (1 - bonusFromResearch(state, 'expSpeed'));
  return Math.max(30, d);
}

export function expYield(state, e) {
  const yieldMult = 1 + 0.2 * (state.meta.expyld || 0);
  const richMult = hasModifier(state, 'mfRich') ? 3 : 1;
  return {
    crys: Math.floor((e.yield.crys || 0) * yieldMult * richMult),
    scrap: Math.floor((e.yield.scrap || 0) * yieldMult),
    sing: e.yield.sing || 0
  };
}
