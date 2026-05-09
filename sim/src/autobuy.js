import { MINERS, WEAPONS } from './data.js';
import { era, minerCost, weaponCost, weaponUnlocked, bonusFromResearch, hasModifier } from './formulas.js';

export function autoBuyTick(state, dt) {
  state.autoBuyAcc += dt;
  const autoMult = hasModifier(state, 'mfAuto') ? 0.667 : 1;
  const speed = autoMult / (1 + bonusFromResearch(state, 'autoSpeed'));
  let rounds = 0;
  while (state.autoBuyAcc >= speed && rounds < 100) {
    state.autoBuyAcc -= speed;
    rounds++;
    let bought = false;
    if (state.autos.buyMiners && era(state) >= 1) bought = autoBuyOne(state, 'miner') || bought;
    if (state.autos.buyWeapons && era(state) >= 2) bought = autoBuyOne(state, 'weapon') || bought;
    if (!bought) break;
  }
}

function autoBuyOne(state, kind) {
  const items = kind === 'miner' ? MINERS : WEAPONS;
  const owned = kind === 'miner' ? state.miners : state.weapons;
  const strategy = kind === 'miner' ? state.autos.buyMinersStrategy : state.autos.buyWeaponsStrategy;
  const costFn = kind === 'miner' ? minerCost : weaponCost;
  const valueFn = (it) => kind === 'miner' ? it.rate : it.dps;

  let candidates = items.filter(it => {
    if (kind === 'weapon' && !weaponUnlocked(state, it)) return false;
    return state.ore >= costFn(it, owned[it.id], state);
  });

  if (kind === 'miner') {
    candidates = candidates.filter(it => {
      const idx = MINERS.indexOf(it);
      if (idx === 0) return true;
      return state.miners[MINERS[idx - 1].id] > 0 || state.totalOre >= it.base / 2;
    });
  }

  if (candidates.length === 0) return false;

  let pick;
  if (strategy === 'cheap') {
    pick = candidates.reduce((a, b) => costFn(a, owned[a.id], state) < costFn(b, owned[b.id], state) ? a : b);
  } else if (strategy === 'efficient') {
    pick = candidates.reduce((a, b) =>
      valueFn(a) / costFn(a, owned[a.id], state) > valueFn(b) / costFn(b, owned[b.id], state) ? a : b
    );
  } else {
    pick = candidates.reduce((a, b) => items.indexOf(a) > items.indexOf(b) ? a : b);
  }

  state.ore -= costFn(pick, owned[pick.id], state);
  owned[pick.id]++;
  state.autoBoughtCounts[kind === 'miner' ? 'miners' : 'weapons']++;
  return true;
}
