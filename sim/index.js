import { simulateRun, generateReport } from './src/simulator.js';

const args = process.argv.slice(2);
const duration = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '0') || 86400 * 7;
const runAll = args.includes('--all');
const seed = parseInt(args.find(a => a.startsWith('--seed='))?.split('=')[1] || '0') || 42;
const json = args.includes('--json');

const profiles = runAll
  ? ['optimal-idle-cheap', 'optimal-idle-efficient', 'optimal-idle-highest']
  : ['optimal-idle-efficient'];

const allResults = [];

for (const profileId of profiles) {
  const start = Date.now();
  const result = simulateRun(profileId, { maxTime: duration, seed });
  const elapsed = Date.now() - start;

  if (json) {
    allResults.push({
      profile: profileId,
      elapsed_ms: elapsed,
      milestones: result.milestones,
      snapshotCount: result.snapshots.length,
      finalState: {
        era: result.finalState.erasUnlocked,
        sector: result.finalState.sector,
        dm: result.finalState.dm,
        sing: result.finalState.sing,
        crys: result.finalState.crys,
        refines: result.finalState.refineCount,
        warps: result.finalState.warpCount,
        ascends: result.finalState.ascendCount,
      }
    });
  } else {
    console.log(`\n[Simulated in ${elapsed}ms]`);
    generateReport(result);
  }
}

if (json) {
  console.log(JSON.stringify(allResults, null, 2));
}
