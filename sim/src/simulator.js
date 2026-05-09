import { freshState, startingOre } from './state.js';
import { totalRate, totalDPS, globalMult, era, refineGain, warpGain, ascendGain, minerCost, weaponCost, weaponUnlocked, tapPower, tapDamage } from './formulas.js';
import { spawnNextEnemy, damageEnemy, doRefine, doWarp, doAscend, checkExpeditions, anomalyTick, resolveAnomaly, buyEra, buyMeta, buyResearch, buyMiner, buyWeapon } from './actions.js';
import { autoBuyTick } from './autobuy.js';
import { MINERS, WEAPONS, ERAS, META, RESEARCH } from './data.js';

// Seeded PRNG
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class VirtualClock {
  constructor() { this.now = 0; }
  advance(ms) { this.now += ms; }
}

function fmtTime(s) {
  if (s < 60) return Math.floor(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.floor(s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
}

function fmt(n) {
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  if (n < 1000) return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + SUFFIX[i];
}

// Profiles define player decision-making
const PROFILES = {
  'optimal-idle-cheap': {
    name: 'Idle (Cheapest Auto-Buy)',
    minerStrategy: 'cheap',
    weaponStrategy: 'cheap',
  },
  'optimal-idle-efficient': {
    name: 'Idle (Efficient Auto-Buy)',
    minerStrategy: 'efficient',
    weaponStrategy: 'efficient',
  },
  'optimal-idle-highest': {
    name: 'Idle (Highest Tier Auto-Buy)',
    minerStrategy: 'highest',
    weaponStrategy: 'highest',
  },
};

function smartDecide(state, clock, rng) {
  // Buy eras when affordable
  while (true) {
    const next = state.erasUnlocked + 1;
    const eraData = ERAS.find(e => e.id === next);
    if (!eraData || state.dm < eraData.cost) break;
    buyEra(state);
  }

  // Buy meta upgrades (prioritize: speed > cheap > wpndmg > others)
  const metaPriority = ['speed', 'cheap', 'wpndmg', 'bossres', 'crys', 'start', 'sing', 'tap', 'expspd', 'expyld', 'rsdisc', 'anchance', 'offline'];
  for (const id of metaPriority) {
    if (state.dm >= (META.find(m => m.id === id)?.cost || 999)) {
      buyMeta(state, id);
    }
  }

  // Buy research (prioritize: m1, c1, a1, then deeper)
  const researchPriority = ['m1', 'c1', 'a1', 'm2', 'c2', 'a2', 'm3', 'c3', 'a3', 'm4', 'c4', 'a4'];
  for (const id of researchPriority) {
    buyResearch(state, id);
  }

  // Resolve anomalies immediately
  if (state.pendingAnomaly && !state.inAnomalyFight) {
    resolveAnomaly(state, clock, rng);
  }

  // Enable auto-prestige flags as eras unlock
  if (era(state) >= 2 && !state.autos.refine) state.autos.refine = true;
  if (era(state) >= 3 && !state.autos.warp) state.autos.warp = true;
  if (era(state) >= 4 && !state.autos.ascend) state.autos.ascend = true;

  // Manual prestige — correct strategy modeling the real game flow:
  //
  // Flow: Refine many times (accumulate crystals) → push to Boss 2 → Warp
  //       → Refine+Warp cycles → push to Boss 3 → Ascend
  //
  // Key: prestige resets bossesDefeated. So:
  // 1. Refine repeatedly when Boss 1 is beaten (builds crystals)
  // 2. When crystals are high enough for a good warp, DON'T refine — push to Boss 2
  // 3. Kill Boss 2, then warp
  // 4. After warps give singularities, push to Boss 3 and ascend

  // Highest priority prestiges first
  if (ascendGain(state) > 0) { doAscend(state, clock); return; }
  if (warpGain(state) > 0) { doWarp(state, clock); return; }

  // Decide: refine or push?
  if (refineGain(state) > 0) {
    // If we've never warped, we need 25+ crystals total to warp
    // Once we have enough crystals, stop refining and push to Boss 2
    const needsWarpPush = state.warpCount === 0 && state.totalCrys >= 25 &&
                          state.bossesEverDefeated[2] === 0;
    // If we've warped before but need to ascend, push to Boss 3
    const needsAscendPush = state.warpCount > 0 && state.totalSing >= 4 &&
                            state.bossesEverDefeated[3] === 0;
    // If currently pushing through S2 or S3 to reach a boss, don't refine
    const pushingS2 = state.currentStage >= 2 && !state.bossesDefeated[2] && state.totalCrys >= 25;
    const pushingS3 = state.currentStage >= 3 && !state.bossesDefeated[3] && state.totalSing >= 4;

    if (!needsWarpPush && !needsAscendPush && !pushingS2 && !pushingS3) {
      doRefine(state, clock);
    }
  }

  // Manual buying before auto-buy eras (simulate active player)
  if (era(state) < 1) {
    manualBuy(state);
  }
  // Manual weapon buying before era 2 unlocks auto-weapons
  if (era(state) >= 1 && era(state) < 2) {
    manualBuyWeapons(state);
  }
}

function manualBuy(state) {
  // Buy best-value miner or weapon, up to 10 purchases per tick
  for (let i = 0; i < 10; i++) {
    let bestVal = 0, bestAction = null;
    for (const m of MINERS) {
      const idx = MINERS.indexOf(m);
      if (idx > 0 && state.miners[MINERS[idx-1].id] === 0 && state.totalOre < m.base / 2) continue;
      const cost = minerCost(m, state.miners[m.id], state);
      if (state.ore >= cost) {
        const val = m.rate / cost;
        if (val > bestVal) { bestVal = val; bestAction = () => buyMiner(state, m.id); }
      }
    }
    for (const w of WEAPONS) {
      if (!weaponUnlocked(state, w)) continue;
      const cost = weaponCost(w, state.weapons[w.id], state);
      if (state.ore >= cost) {
        const val = w.dps / cost;
        if (val > bestVal) { bestVal = val; bestAction = () => buyWeapon(state, w.id); }
      }
    }
    if (!bestAction) break;
    bestAction();
  }
}

function manualBuyWeapons(state) {
  for (let i = 0; i < 5; i++) {
    let bestVal = 0, bestAction = null;
    for (const w of WEAPONS) {
      if (!weaponUnlocked(state, w)) continue;
      const cost = weaponCost(w, state.weapons[w.id], state);
      if (state.ore >= cost) {
        const val = w.dps / cost;
        if (val > bestVal) { bestVal = val; bestAction = () => buyWeapon(state, w.id); }
      }
    }
    if (!bestAction) break;
    bestAction();
  }
}

export function simulateRun(profileId = 'optimal-idle-efficient', config = {}) {
  const profile = PROFILES[profileId] || PROFILES['optimal-idle-efficient'];
  const clock = new VirtualClock();
  const rng = mulberry32(config.seed || 42);
  const state = freshState();

  // Apply profile settings
  state.autos.buyMinersStrategy = profile.minerStrategy;
  state.autos.buyWeaponsStrategy = profile.weaponStrategy;

  state.ore = startingOre(state);
  state.lastTick = 0;
  state.lastSave = 0;
  spawnNextEnemy(state);

  const DT_MS = 1000; // 1-second ticks
  const DT_S = 1;
  const MAX_TIME = config.maxTime || 86400 * 7; // 7 days default
  const SNAPSHOT_INTERVAL = config.snapshotInterval || 60;

  const snapshots = [];
  const milestones = {};
  let nextSnapshot = 0;
  let lastOps = 0;

  // OPS/DPS thresholds to track
  const OPS_THRESHOLDS = [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e12];
  const opsTracked = new Set();

  function recordMilestone(key, time) {
    if (!milestones[key]) milestones[key] = time;
  }

  // Track previous state for milestone detection
  let prevKills = 0;
  let prevBosses = { 1: 0, 2: 0, 3: 0 };
  let prevRefine = 0;
  let prevWarp = 0;
  let prevAscend = 0;
  let prevEra = 0;

  while (clock.now / 1000 < MAX_TIME) {
    clock.advance(DT_MS);
    const gameTime = clock.now / 1000;
    state.lastTick = clock.now;

    // Expire buffs
    state.activeBuffs = state.activeBuffs.filter(b => b.expiresAt > clock.now);

    // Production
    const rate = totalRate(state);
    state.ore += rate * DT_S;
    state.totalOre += rate * DT_S;

    // Simulate tapping (active player taps ~3x/sec when no auto)
    if (era(state) < 1) {
      const tapPowerVal = tapPower(state);
      const tapsPerSec = 3;
      state.ore += tapPowerVal * tapsPerSec * DT_S;
      state.totalOre += tapPowerVal * tapsPerSec * DT_S;
    }

    // Combat — DPS from weapons + simulated tap damage
    const dps = totalDPS(state);
    let combatDmg = dps * DT_S;
    // Simulate tapping in combat mode too (3 taps/sec active play)
    if (era(state) < 2) {
      combatDmg += tapDamage(state) * 3 * DT_S;
    }
    if (combatDmg > 0) damageEnemy(state, combatDmg, clock, rng);

    // Auto-buy
    if (era(state) >= 1) autoBuyTick(state, DT_S);

    // Auto-prestige
    if (state.autos.refine && era(state) >= 2 && refineGain(state) > 0) doRefine(state, clock);
    if (state.autos.warp && era(state) >= 3 && warpGain(state) > 0) doWarp(state, clock);
    if (state.autos.ascend && era(state) >= 4 && ascendGain(state) > 0) doAscend(state, clock);

    // Expeditions & anomalies
    checkExpeditions(state, clock, rng);
    anomalyTick(state, DT_S, clock, rng);

    // Smart decisions (era/meta/research/anomaly resolution)
    smartDecide(state, clock, rng);

    // Milestone tracking
    if (state.kills > 0 && prevKills === 0) recordMilestone('first_kill', gameTime);
    for (const sid of [1, 2, 3]) {
      if (state.bossesEverDefeated[sid] > 0 && prevBosses[sid] === 0)
        recordMilestone(`boss_${sid}`, gameTime);
    }
    if (state.refineCount > 0 && prevRefine === 0) recordMilestone('first_refine', gameTime);
    if (state.warpCount > 0 && prevWarp === 0) recordMilestone('first_warp', gameTime);
    if (state.ascendCount > 0 && prevAscend === 0) recordMilestone('first_ascend', gameTime);
    if (state.erasUnlocked > prevEra) recordMilestone(`era_${state.erasUnlocked}`, gameTime);

    const currentOps = totalRate(state);
    for (const t of OPS_THRESHOLDS) {
      if (currentOps >= t && !opsTracked.has(t)) {
        opsTracked.add(t);
        recordMilestone(`ops_${fmt(t)}`, gameTime);
      }
    }

    prevKills = state.kills;
    prevBosses = { ...state.bossesEverDefeated };
    prevRefine = state.refineCount;
    prevWarp = state.warpCount;
    prevAscend = state.ascendCount;
    prevEra = state.erasUnlocked;

    // Snapshots
    if (gameTime >= nextSnapshot) {
      snapshots.push({
        t: gameTime,
        ore: state.ore,
        ops: currentOps,
        dps: totalDPS(state),
        crys: state.crys,
        sing: state.sing,
        dm: state.dm,
        mult: globalMult(state),
        era: state.erasUnlocked,
        sector: state.sector,
        refines: state.refineCount,
        warps: state.warpCount,
        ascends: state.ascendCount,
        kills: state.kills,
        stage: state.currentStage,
      });
      nextSnapshot += SNAPSHOT_INTERVAL;
    }
  }

  return { snapshots, milestones, finalState: state, profile: profile.name };
}

// Wall detection
export function detectWalls(snapshots, windowSec = 300, growthThreshold = 0.05) {
  const walls = [];
  for (let i = 0; i < snapshots.length; i++) {
    const start = snapshots[i];
    const endIdx = snapshots.findIndex(s => s.t >= start.t + windowSec);
    if (endIdx < 0) break;
    const end = snapshots[endIdx];
    if (start.ops <= 0) continue;
    const growth = (end.ops - start.ops) / start.ops;
    if (growth < growthThreshold && start.t > 120) {
      // Check if this wall is already captured
      if (walls.length > 0 && walls[walls.length - 1].endTime >= start.t) {
        walls[walls.length - 1].endTime = end.t;
      } else {
        walls.push({
          startTime: start.t,
          endTime: end.t,
          opsAtStart: start.ops,
          opsAtEnd: end.ops,
          growth: growth,
          stage: start.stage,
          era: start.era,
        });
      }
    }
  }
  return walls;
}

// Runaway detection
export function detectRunaway(snapshots) {
  const issues = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const cur = snapshots[i];
    if (prev.ops > 0 && cur.ops / prev.ops > 2 && prev.t > 600) {
      const dt = cur.t - prev.t;
      if (dt <= 60) {
        issues.push({
          time: cur.t,
          prevOps: prev.ops,
          curOps: cur.ops,
          ratio: cur.ops / prev.ops,
        });
      }
    }
    if (cur.mult > 1e15) {
      issues.push({ time: cur.t, type: 'extreme_mult', mult: cur.mult });
    }
  }
  return issues;
}

// Report generation
export function generateReport(result) {
  const { snapshots, milestones, finalState, profile } = result;

  console.log('\n' + '='.repeat(60));
  console.log('  VOID MINERS — SIMULATION HEALTH REPORT');
  console.log('  Profile: ' + profile);
  console.log('  Duration: ' + fmtTime(snapshots[snapshots.length - 1]?.t || 0) + ' simulated');
  console.log('='.repeat(60));

  // Milestones
  console.log('\nMILESTONES');
  console.log('-'.repeat(50));
  const milestoneOrder = [
    'first_kill', 'boss_1', 'first_refine', 'boss_2', 'first_warp',
    'boss_3', 'first_ascend', 'era_1', 'era_2', 'era_3', 'era_4'
  ];
  const milestoneLabels = {
    first_kill: 'First Kill',
    boss_1: 'Boss: Sector Warden',
    first_refine: 'First Refine',
    boss_2: 'Boss: Star Eater',
    first_warp: 'First Warp',
    boss_3: 'Boss: Void Sovereign',
    first_ascend: 'First Ascend',
    era_1: 'Era 1: Drone Network',
    era_2: 'Era 2: Combat AI',
    era_3: 'Era 3: Reality Engine',
    era_4: 'Era 4: Transcendence',
  };
  for (const key of milestoneOrder) {
    const label = milestoneLabels[key] || key;
    const time = milestones[key];
    console.log(`  ${label.padEnd(30)} ${time ? fmtTime(time) : '— not reached'}`);
  }

  // OPS thresholds
  console.log('\nOPS PROGRESSION');
  console.log('-'.repeat(50));
  for (const key of Object.keys(milestones).filter(k => k.startsWith('ops_')).sort()) {
    console.log(`  ${key.replace('ops_', '').padEnd(12)}/s reached at ${fmtTime(milestones[key])}`);
  }

  // Walls
  const walls = detectWalls(snapshots);
  console.log(`\nPROGRESSION WALLS DETECTED: ${walls.length}`);
  console.log('-'.repeat(50));
  if (walls.length === 0) {
    console.log('  ✓ No significant walls detected');
  } else {
    for (const w of walls.slice(0, 5)) {
      const duration = w.endTime - w.startTime;
      console.log(`  ⚠ ${fmtTime(w.startTime)}-${fmtTime(w.endTime)} (${fmtTime(duration)} stall)`);
      console.log(`    OPS: ${fmt(w.opsAtStart)} → ${fmt(w.opsAtEnd)} | Stage ${w.stage} | Era ${w.era}`);
    }
  }

  // Runaway
  const runaway = detectRunaway(snapshots);
  console.log(`\nRUNAWAY SCALING: ${runaway.length}`);
  console.log('-'.repeat(50));
  if (runaway.length === 0) {
    console.log('  ✓ No runaway detected');
  } else {
    for (const r of runaway.slice(0, 5)) {
      if (r.type === 'extreme_mult') {
        console.log(`  ⚠ ${fmtTime(r.time)}: globalMult = ${fmt(r.mult)} (extreme)`);
      } else {
        console.log(`  ⚠ ${fmtTime(r.time)}: OPS jumped ${fmt(r.prevOps)} → ${fmt(r.curOps)} (${r.ratio.toFixed(1)}x)`);
      }
    }
  }

  // Final state summary
  console.log('\nFINAL STATE');
  console.log('-'.repeat(50));
  console.log(`  Era: ${finalState.erasUnlocked} | Sector: ${finalState.sector}`);
  console.log(`  DM: ${finalState.dm} | Sing: ${finalState.sing} | Crys: ${finalState.crys}`);
  console.log(`  Refines: ${finalState.refineCount} | Warps: ${finalState.warpCount} | Ascensions: ${finalState.ascendCount}`);
  console.log(`  Total Kills: ${finalState.kills}`);
  console.log(`  Global Mult: ${fmt(globalMult(finalState))}`);
  console.log('');

  return { milestones, walls, runaway };
}
