// Extracted verbatim from index.html lines 912-1034

export const MINERS = [
  { id: 'drone',   name: 'Scout Drone',     base: 15,        rate: 1.5,   growth: 1.12, desc: 'Tiny autonomous miner' },
  { id: 'rig',     name: 'Drill Rig',       base: 100,       rate: 8,     growth: 1.13, desc: 'Mounted excavation' },
  { id: 'hauler',  name: 'Ore Hauler',      base: 1100,      rate: 70,    growth: 1.14, desc: 'Hull-mounted scoops' },
  { id: 'reactor', name: 'Plasma Reactor',  base: 12000,     rate: 500,   growth: 1.15, desc: 'Vaporizes asteroid cores' },
  { id: 'forge',   name: 'Stellar Forge',   base: 130000,    rate: 4000,  growth: 1.16, desc: 'Forges raw matter' },
  { id: 'rift',    name: 'Rift Excavator',  base: 1500000,   rate: 32000, growth: 1.17, desc: 'Pulls from subspace' }
];

export const WEAPONS = [
  { id: 'laser',   name: 'Pulse Laser',       base: 30,      dps: 2,      growth: 1.14, unlock: 'always',  desc: 'Cheap rapid-fire beam' },
  { id: 'rail',    name: 'Rail Cannon',       base: 400,     dps: 25,     growth: 1.15, unlock: 'kills:5', desc: 'Heavy kinetic slug' },
  { id: 'plasma',  name: 'Plasma Lance',      base: 6000,    dps: 220,    growth: 1.16, unlock: 'boss:1',  desc: 'Unlocked: Sector Warden' },
  { id: 'missile', name: 'Swarm Missile',     base: 90000,   dps: 1800,   growth: 1.17, unlock: 'kills:15',desc: 'Homing micro-warheads' },
  { id: 'beam',    name: 'Annihilation Beam', base: 1.4e6,   dps: 14000,  growth: 1.18, unlock: 'boss:2',  desc: 'Unlocked: Star Eater' },
  { id: 'void',    name: 'Voidlance',         base: 2.2e7,   dps: 110000, growth: 1.19, unlock: 'boss:3',  desc: 'Unlocked: Void Sovereign' }
];

export const STAGES = [
  { id: 1, name: 'Asteroid Belt', enemies: [
      { name: 'Husk Drone', hp: 40, reward: 8 },
      { name: 'Scrap Pirate', hp: 200, reward: 30 },
      { name: 'Mining Wraith', hp: 1200, reward: 150 }
    ], boss: { name: 'SECTOR WARDEN', hp: 8000, reward: 800, gates: 'refine' }
  },
  { id: 2, name: 'Stellar Halo', enemies: [
      { name: 'Photon Eel', hp: 15000, reward: 2200 },
      { name: 'Flare Reaver', hp: 75000, reward: 11000 },
      { name: 'Solar Hydra', hp: 350000, reward: 50000 }
    ], boss: { name: 'STAR EATER', hp: 1.2e6, reward: 240000, gates: 'warp' }
  },
  { id: 3, name: 'Void Periphery', enemies: [
      { name: 'Null Phantom', hp: 8e6, reward: 1e6 },
      { name: 'Entropy Maw', hp: 3e7, reward: 4e6 },
      { name: 'Shard of Anti', hp: 1.2e8, reward: 2e7 }
    ], boss: { name: 'VOID SOVEREIGN', hp: 6e8, reward: 1.5e8, gates: 'ascend' }
  }
];

export const ERAS = [
  { id: 1, name: 'Drone Network',  cost: 2,  desc: 'Auto-buy miners, send Expeditions' },
  { id: 2, name: 'Combat AI',      cost: 6,  desc: 'Auto-fight, auto-refine, Research tree' },
  { id: 3, name: 'Reality Engine', cost: 14, desc: 'Auto-warp, Anomalies, Singularity Forge' },
  { id: 4, name: 'Transcendence',  cost: 30, desc: 'Auto-ascend, full automation' }
];

export const META = [
  { id: 'tap',      name: 'Hardened Probe',    desc: 'Tap power +1',                cost: 1,  max: 50 },
  { id: 'start',    name: 'Reserve Cache',     desc: '+25 starting Ore',            cost: 1,  max: 30 },
  { id: 'crys',     name: 'Crystal Lattice',   desc: '+5% Ore from Crystals',       cost: 2,  max: 40 },
  { id: 'sing',     name: 'Gravity Lens',      desc: '+10% Singularity gain',       cost: 4,  max: 20 },
  { id: 'offline',  name: 'Offline Reactor',   desc: 'Earn 50% rate while away',    cost: 3,  max: 4 },
  { id: 'speed',    name: 'Time Compressor',   desc: 'Production +25%',             cost: 5,  max: 20 },
  { id: 'cheap',    name: 'Quantum Discount',  desc: 'Items 5% cheaper',            cost: 3,  max: 15 },
  { id: 'wpndmg',   name: 'Targeting AI',      desc: 'Weapon damage +25%',          cost: 4,  max: 20 },
  { id: 'bossres',  name: 'Boss Hunter',       desc: '+25% boss rewards',           cost: 4,  max: 8 },
  { id: 'expspd',   name: 'Warp Drive',        desc: 'Expeditions 15% faster',      cost: 3,  max: 10, era: 1 },
  { id: 'expyld',   name: 'Cargo Holds',       desc: 'Expeditions +20% rewards',    cost: 3,  max: 15, era: 1 },
  { id: 'rsdisc',   name: 'AI Tutor',          desc: 'Research 10% cheaper',        cost: 4,  max: 8,  era: 2 },
  { id: 'anchance', name: 'Quantum Sensor',    desc: '+25% Anomaly spawn rate',     cost: 5,  max: 6,  era: 3 }
];

export const EXPEDITIONS = [
  { id: 'short',  name: 'Short Sweep',     duration: 300,   minerCost: 3,  yield: { crys: 2, scrap: 50 } },
  { id: 'med',    name: 'Deep Survey',     duration: 1800,  minerCost: 8,  yield: { crys: 15, scrap: 500 } },
  { id: 'long',   name: 'Frontier Push',   duration: 7200,  minerCost: 20, yield: { crys: 80, scrap: 4000 } },
  { id: 'epic',   name: 'Galactic Run',    duration: 21600, minerCost: 40, yield: { crys: 350, scrap: 25000, sing: 1 } }
];

export const RESEARCH = [
  { id: 'm1', col: 0, row: 0, name: 'Quantum Drills',      cost: 1, prereq: [], effect: { type: 'mineRate', val: 0.5 } },
  { id: 'm2', col: 0, row: 1, name: 'Gravity Wells',       cost: 2, prereq: ['m1'], effect: { type: 'tapMult', val: 3 } },
  { id: 'm3', col: 0, row: 2, name: 'Antimatter Cores',    cost: 4, prereq: ['m2'], effect: { type: 'mineRate', val: 2.0 } },
  { id: 'm4', col: 0, row: 3, name: 'Cosmic Networks',     cost: 8, prereq: ['m3'], effect: { type: 'perRefine', val: 0.1 } },
  { id: 'c1', col: 1, row: 0, name: 'Smart Munitions',     cost: 1, prereq: [], effect: { type: 'wpnDmg', val: 0.5 } },
  { id: 'c2', col: 1, row: 1, name: 'Crit Calibration',    cost: 2, prereq: ['c1'], effect: { type: 'critChance', val: 0.15 } },
  { id: 'c3', col: 1, row: 2, name: 'Annihilation Field',  cost: 4, prereq: ['c2'], effect: { type: 'wpnDmg', val: 2.0 } },
  { id: 'c4', col: 1, row: 3, name: 'Boss Shredder',       cost: 8, prereq: ['c3'], effect: { type: 'bossDmg', val: 5.0 } },
  { id: 'a1', col: 2, row: 0, name: 'Optimizer Routine',   cost: 1, prereq: [], effect: { type: 'autoSpeed', val: 0.25 } },
  { id: 'a2', col: 2, row: 1, name: 'Predictive AI',       cost: 2, prereq: ['a1'], effect: { type: 'refineThresh', val: -0.25 } },
  { id: 'a3', col: 2, row: 2, name: 'Fleet Coordination',  cost: 4, prereq: ['a2'], effect: { type: 'expSpeed', val: 0.3 } },
  { id: 'a4', col: 2, row: 3, name: 'Reality Compiler',    cost: 8, prereq: ['a3'], effect: { type: 'globalMult', val: 3.0 } }
];

export const ANOMALY_TYPES = [
  {
    id: 'flare', name: 'SOLAR FLARE', duration: 120,
    isCombat: true, bossName: 'FLARE LORD',
    reward: { type: 'oreMult', val: 3, dur: 1800 }
  },
  {
    id: 'storm', name: 'QUANTUM STORM', duration: 90,
    choices: [
      { label: 'x10 ORE / 5MIN', val: { type: 'oreMult', val: 10, dur: 300 } },
      { label: 'x10 DPS / 5MIN', val: { type: 'dpsMult', val: 10, dur: 300 } }
    ]
  },
  {
    id: 'rift', name: 'TEMPORAL RIFT', duration: 60,
    instantReward: { type: 'oreTime', val: 1800 }
  },
  {
    id: 'cache', name: 'SUPPLY CACHE', duration: 180,
    instantReward: { type: 'crys', val: 'auto' }
  }
];

export const FORGE_MODIFIERS = [
  { id: 'mfMine',   name: 'Mining Focus',   tag: 'tradeoff' },
  { id: 'mfCombat', name: 'War Doctrine',   tag: 'tradeoff' },
  { id: 'mfFast',   name: 'Speedrun',       tag: 'tradeoff' },
  { id: 'mfRich',   name: 'Crystal Vein',   tag: 'economic' },
  { id: 'mfWarp',   name: 'Warp Mastery',   tag: 'economic' },
  { id: 'mfTap',    name: 'Iron Fingers',   tag: 'utility' },
  { id: 'mfAuto',   name: 'Pure Automation',tag: 'utility' },
  { id: 'mfSwarm',  name: 'Cheap Swarm',    tag: 'tradeoff' },
  { id: 'mfBoss',   name: 'Bounty Hunter',  tag: 'offensive' }
];
