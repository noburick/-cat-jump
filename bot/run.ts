import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { waitForDecision } from './controller.ts';
import { LEVEL } from '../src/game/level.ts';
import type { Observation, Parameters } from './contracts.ts';

type Snapshot = Observation & { state: string; jumps: number; elapsedMs: number; seed: number | null; lastJumpAtMs: number | null };
const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1] ?? '';
}
const mode = arg('--mode', 'obstacles');
const trials = Number(arg('--trials', '20'));
const distances = arg('--distances', '20,220').split(',').map(Number);
const seed = Number(arg('--seed', '20261016'));
const horizonMs = Number(arg('--horizon-ms', '16000'));
if (!['baseline', 'obstacles'].includes(mode) || !Number.isInteger(trials) || trials < 20
    || distances.some(n => !Number.isFinite(n) || n <= 0) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff
    || !Number.isFinite(horizonMs) || horizonMs <= 0) {
  throw new Error('Use --mode baseline|obstacles, --trials >=20, positive --distances and --horizon-ms, integer --seed');
}
const url = arg('--url', 'http://127.0.0.1:4173/cat-jump/');
const out = resolve(arg('--output', 'reports/bot'));
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const rows: Record<string, unknown>[] = [];
let blocked: string | null = null;
let calibratedLatencyMs: number | null = null;
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
    let screenshotSaved = false;
    let retried = false;
    let rightCensored = true;
    try {
      // The fixed seed is accepted only by the development/E2E session module.
      const target = new URL(url);
      target.searchParams.set('seed', String(seed));
      if (i === 0 || mode === 'baseline' || !rows.at(-1)?.retried) await page.goto(target.href);
      await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__);
      await expect.poll(async () => (await read()).grounded).toBe(true);
      let initial = await read();
      final = initial;
      if (mode === 'obstacles' && (!initial.capabilities.obstacles || !initial.capabilities.retry)) {
        blocked = 'Current game has no obstacles, game-over or retry. Obstacle success rate cannot be measured.';
        throw new Error(blocked);
      }
      await page.locator('canvas').scrollIntoViewIfNeeded();
      let canvasBounds = (await page.locator('canvas').boundingBox())!;
      const tapCanvas = (): Promise<void> => page.touchscreen.tap(canvasBounds.x + canvasBounds.width / 2, canvasBounds.y + canvasBounds.height / 2);
      if (mode === 'obstacles' && calibratedLatencyMs === null) {
        const ready = await waitForDecision(page, { ...parameters, jumpStartDistance: 220, inputLatencyMs: 0 }, true);
        await tapCanvas();
        await page.waitForFunction(() => window.__CAT_JUMP_TEST__!.snapshot().jumps === 1);
        const jumped = await read();
        calibratedLatencyMs = Math.max(0, jumped.lastJumpAtMs! - ready.state.elapsedMs);
        console.log(`Measured fixed input latency: ${calibratedLatencyMs.toFixed(1)} simulation ms`);
        await page.goto(target.href);
        await page.waitForFunction(() => !!window.__CAT_JUMP_TEST__ && window.__CAT_JUMP_TEST__.snapshot().grounded);
        initial = await read();
        canvasBounds = (await page.locator('canvas').boundingBox())!;
      }
      parameters.inputLatencyMs = calibratedLatencyMs ?? parameters.inputLatencyMs;
      start = performance.now();
      if (mode === 'baseline') {
        await tapCanvas();
        await expect.poll(async () => (await read()).cat!.y).toBeLessThan(initial.cat!.y - 15);
        await expect.poll(async () => (await read()).grounded).toBe(true);
        final = await read();
        expect(final.jumps).toBe(initial.jumps + 1);
        expect(final.cat!.y).toBeCloseTo(initial.cat!.y, 0);
        result = 'baseline-jump-landed';
      } else {
        if (initial.seed !== seed) throw new Error('Game does not acknowledge the fixed obstacle seed');
        while (true) {
          if (performance.now() - start > Math.max(90000, horizonMs * 10)) throw new Error('Simulation stalled');
          const ready = await waitForDecision(page, parameters, false, horizonMs);
          final = ready.state;
          if (final.gameOver) {
            observedEnd = performance.now();
            rightCensored = false;
            result = 'collision';
            await page.screenshot({ path: `${artifact}.png`, fullPage: true });
            screenshotSaved = true;
            // This is the same real UI used by a player; no state-setting test API exists.
            await page.getByRole('button', { name: 'リトライ', exact: true }).click();
            await expect.poll(async () => (await read()).gameOver).toBe(false);
            await expect.poll(async () => (await read()).grounded).toBe(true);
            const reset = await read();
            expect(reset.score).toBe(0);
            expect(reset.jumps).toBe(0);
            expect(reset.collisions).toBe(0);
            expect(reset.seed).toBe(seed);
            retried = true;
            break;
          }
          if (final.elapsedMs >= horizonMs) {
            result = 'survived-horizon';
            break;
          }
          decisions.push({ elapsedMs: final.elapsedMs, ...ready.decision, cat: final.cat, nextObstacle: final.nextObstacle });
          if (ready.decision.jump) {
            const previousJumps = final.jumps;
            await tapCanvas();
            await page.waitForFunction(count => window.__CAT_JUMP_TEST__!.snapshot().jumps > count || window.__CAT_JUMP_TEST__!.snapshot().gameOver, previousJumps);
          }
        }
      }
      expect(errors).toEqual([]);
    } catch (error) {
      result = 'failed';
      errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
    } finally {
      const elapsed = start ? (observedEnd ?? performance.now()) - start : 0;
      rows.push({ trial: i + 1, parameterIndex, parameters, seed, mode, result,
        observedSurvivalMs: start ? final?.elapsedMs ?? null : null, wallPlayMs: start ? elapsed : null, rightCensored, retried,
        score: final?.score ?? null, collisions: final?.collisions ?? null,
        jumps: final?.jumps ?? null, finalObservation: final, errors, decisions });
      if (!screenshotSaved) await page.screenshot({ path: `${artifact}.png`, fullPage: true }).catch(() => {});
      await writeFile(`${artifact}.json`, JSON.stringify(rows.at(-1), null, 2));
      await context.tracing.stop(errors.length || result === 'collision' ? { path: `${artifact}-trace.zip` } : {});
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
    const successes = trials.filter(r => r.result === 'baseline-jump-landed' || r.result === 'survived-horizon').length;
    return { jumpStartDistance: distance, applied: mode === 'obstacles', trials: trials.length, successes,
      successRate: trials.length ? successes / trials.length : null,
      meanScore: trials.length ? trials.reduce((n, r) => n + Number(r.score ?? 0), 0) / trials.length : null,
      meanSurvivalMs: trials.length ? trials.reduce((n, r) => n + Number(r.observedSurvivalMs ?? 0), 0) / trials.length : null,
      collisions: trials.reduce((n, r) => n + Number(r.collisions ?? 0), 0),
      retries: trials.filter(r => r.retried).length };

  });
  const summary = { mode, requestedTrials: trials, completedTrials: rows.length, seed,
    horizonMs, calibratedLatencyMs, rules: LEVEL, calibrationWarmupExcluded: true, seedStatus: blocked ? 'unavailable' : 'fixed-and-acknowledged',
    blocked, successDefinition: mode === 'baseline' ? 'tap makes cat rise and land at original height' : 'survive configured horizon',
    successRate: rows.length && !blocked ? succeeded / rows.length : null,
    obstacleSuccessRate: mode === 'baseline' || blocked ? null : succeeded / rows.length,
    groups, trials: rows };
  await writeFile(resolve(out, 'results.json'), JSON.stringify(summary, null, 2));
  const rate = summary.successRate === null ? 'unavailable' : `${(summary.successRate * 100).toFixed(1)}%`;
  await writeFile(resolve(out, 'results.md'), `# Bot trial report

Mode: ${mode}

Seed: ${seed}; horizon: ${horizonMs} simulation ms

Completed: ${rows.length}/${trials}

Success definition: ${summary.successDefinition}

Success rate: ${rate}

Obstacle success rate: ${summary.obstacleSuccessRate ?? 'unavailable (no obstacle gameplay)'}

${blocked ?? ''}

| Jump start distance | Applied | Trials | Successes | Mean score | Mean survival (ms) | Collisions | UI retries |
|---|---|---|---|---|---|---|---|
${groups.map(g => `| ${g.jumpStartDistance} | ${g.applied} | ${g.trials} | ${g.successes} | ${g.meanScore} | ${g.meanSurvivalMs?.toFixed(1)} | ${g.collisions} | ${g.retries} |`).join('\n')}

Survival uses actual physics simulation time, not browser throughput. Survived-horizon runs are right-censored; collision runs end at contact. Collision retries use the real UI, and successful runs reload for the next independent trial. Baseline groups do not use the obstacle trigger distance. No game difficulty, hitbox, or physics setting changes between parameter groups.
`);
  console.log(JSON.stringify({ mode, completedTrials: rows.length, successRate: summary.successRate, obstacleSuccessRate: summary.obstacleSuccessRate, blocked, output: out }));
  if (blocked || rows.some(r => (r.errors as string[]).length)) process.exitCode = 1;
}
