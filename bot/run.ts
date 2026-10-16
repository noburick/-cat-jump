import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { decideJump } from './policy.ts';
import type { Observation, Parameters } from './contracts.ts';

type Snapshot = Observation & { state: string; jumps: number };
const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1] ?? '';
}
const mode = arg('--mode', 'obstacles');
const trials = Number(arg('--trials', '20'));
const distances = arg('--distances', '90,130').split(',').map(Number);
const seed = Number(arg('--seed', '20261016'));
const horizonMs = Number(arg('--horizon-ms', '5000'));
if (!['baseline', 'obstacles'].includes(mode) || !Number.isInteger(trials) || trials < 20
    || distances.some(n => !Number.isFinite(n) || n <= 0) || !Number.isInteger(seed)
    || !Number.isFinite(horizonMs) || horizonMs <= 0) {
  throw new Error('Use --mode baseline|obstacles, --trials >=20, positive --distances and --horizon-ms, integer --seed');
}
const url = arg('--url', 'http://127.0.0.1:4173/cat-jump/');
const out = resolve(arg('--output', 'reports/bot'));
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const rows: Record<string, unknown>[] = [];
let blocked: string | null = null;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const read = async (): Promise<Snapshot> => page.evaluate(() => window.__CAT_JUMP_TEST__!.snapshot()) as Promise<Snapshot>;
  for (let i = 0; i < trials; i++) {
    const parameterIndex = i % distances.length;
    const parameters: Parameters = { jumpStartDistance: distances[parameterIndex], jumpSpeed: 560, clearance: 6, inputLatencyMs: 40 };
    const errors: string[] = [];
    const decisions: Record<string, unknown>[] = [];
    const recordError = (error: Error): void => { errors.push(error.stack ?? error.message); };
    const recordConsole = (msg: import('@playwright/test').ConsoleMessage): void => { if (msg.type() === 'error') errors.push(msg.text()); };
    page.on('pageerror', recordError);
    page.on('console', recordConsole);
    const artifact = resolve(out, `trial-${String(i + 1).padStart(2, '0')}`);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    let start = 0;
    let final: Snapshot | null = null;
    let result = 'failed';
    let observedEnd: number | null = null;
    let rightCensored = true;
    try {
      // No injected randomness or game controls. This game currently contains no RNG.
      // A future seeded obstacle implementation must explicitly acknowledge this seed.
      const target = new URL(url);
      target.searchParams.set('seed', String(seed));
      await page.goto(target.href);
      await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
      await expect.poll(async () => (await read()).grounded).toBe(true);
      const initial = await read();
      final = initial;
      if (mode === 'obstacles' && (!initial.capabilities.obstacles || !initial.capabilities.retry)) {
        blocked = 'Current game has no obstacles, game-over or retry. Obstacle success rate cannot be measured.';
        throw new Error(blocked);
      }
      start = performance.now();
      if (mode === 'baseline') {
        await page.locator('canvas').tap();
        await expect.poll(async () => (await read()).cat!.y).toBeLessThan(initial.cat!.y - 15);
        await expect.poll(async () => (await read()).grounded).toBe(true);
        final = await read();
        expect(final.jumps).toBe(initial.jumps + 1);
        expect(final.cat!.y).toBeCloseTo(initial.cat!.y, 0);
        result = 'baseline-jump-landed';
      } else {
        // Refuse comparisons without a real reproducible obstacle seed contract.
        const seedApplied = await page.evaluate(() => (window.__CAT_JUMP_TEST__?.snapshot() as unknown as { seed?: number }).seed);
        if (seedApplied !== seed) throw new Error('Game does not acknowledge the fixed obstacle seed');
        while (performance.now() - start < horizonMs) {
          final = await read();
          if (final.gameOver) {
            observedEnd = performance.now();
            rightCensored = false;
            result = 'collision';
            // Retry only via the real UI, never by mutating game state.
            await page.getByRole('button', { name: 'リトライ', exact: true }).click();
            await expect.poll(async () => (await read()).gameOver).toBe(false);
            break;
          }
          const decision = decideJump(final, parameters);
          decisions.push({ elapsedMs: performance.now() - start, ...decision, nextObstacle: final.nextObstacle });
          if (decision.jump) await page.locator('canvas').tap();
          // Real-time observation cadence; physics continues at the original speed.
          await page.waitForTimeout(16);
        }
        if (result === 'failed') result = 'survived-horizon';
      }
      expect(errors).toEqual([]);
    } catch (error) {
      result = 'failed';
      errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
    } finally {
      const elapsed = start ? (observedEnd ?? performance.now()) - start : 0;
      rows.push({ trial: i + 1, parameterIndex, parameters, seed, mode, result,
        observedSurvivalMs: start ? elapsed : null, rightCensored,
        score: final?.score ?? null, collisions: final?.collisions ?? null,
        jumps: final?.jumps ?? null, finalObservation: final, errors, decisions });
      await page.screenshot({ path: `${artifact}.png`, fullPage: true }).catch(() => {});
      await writeFile(`${artifact}.json`, JSON.stringify(rows.at(-1), null, 2));
      await context.tracing.stop(errors.length ? { path: `${artifact}-trace.zip` } : {});
      page.off('pageerror', recordError);
      page.off('console', recordConsole);
    }
    console.log(`Trial ${i + 1}/${trials}: ${result}${errors.length ? ` (${errors.length} errors)` : ''}`);
    if (blocked) break;
  }
} finally {
  await browser.close();
  const succeeded = rows.filter(r => r.result === 'baseline-jump-landed' || r.result === 'survived-horizon').length;
  const groups = distances.map((distance, index) => {
    const trials = rows.filter(r => r.parameterIndex === index);
    return { jumpStartDistance: distance, applied: mode === 'obstacles', trials: trials.length,
      successes: trials.filter(r => r.result === 'baseline-jump-landed' || r.result === 'survived-horizon').length };
  });
  const summary = { mode, requestedTrials: trials, completedTrials: rows.length, seed,
    seedStatus: mode === 'baseline' ? 'not-applicable-no-randomness' : 'requires-game-acknowledgement',
    blocked, successDefinition: mode === 'baseline' ? 'tap makes cat rise and land at original height' : 'survive configured horizon',
    successRate: rows.length && !blocked ? succeeded / rows.length : null,
    obstacleSuccessRate: mode === 'baseline' || blocked ? null : succeeded / rows.length,
    groups, trials: rows };
  await writeFile(resolve(out, 'results.json'), JSON.stringify(summary, null, 2));
  const rate = summary.successRate === null ? 'unavailable' : `${(summary.successRate * 100).toFixed(1)}%`;
  await writeFile(resolve(out, 'results.md'), `# Bot trial report

Mode: ${mode}

Completed: ${rows.length}/${trials}

Success definition: ${summary.successDefinition}

Success rate: ${rate}

Obstacle success rate: ${summary.obstacleSuccessRate ?? 'unavailable (no obstacle gameplay)'}

${blocked ?? ''}

| Jump start distance | Applied | Trials | Successes |
|---|---|---|---|
${groups.map(g => `| ${g.jumpStartDistance} | ${g.applied} | ${g.trials} | ${g.successes} |`).join('\n')}

Baseline parameter groups are scheduling labels only: trigger distances do not affect a game without obstacles. Score and collisions are null when unsupported. Observed survival is right-censored at the trial end, not a time-to-death metric. Page reload starts independent baseline trials; it does not test a retry feature.
`);
  console.log(JSON.stringify({ mode, completedTrials: rows.length, successRate: summary.successRate, obstacleSuccessRate: summary.obstacleSuccessRate, blocked, output: out }));
  if (blocked || rows.some(r => (r.errors as string[]).length)) process.exitCode = 1;
}
