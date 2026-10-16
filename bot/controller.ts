import type { Page } from '@playwright/test';
import type { TestSnapshot } from '../src/testing/bridge.ts';
import { decideJump } from './policy.ts';
import type { Decision } from './policy.ts';
import type { Parameters } from './contracts.ts';

// Automation-only, read-only RAF polling avoids missing windows between protocol roundtrips.
// This function never dispatches inputs or writes game state inside the page.
export async function waitForDecision(page: Page, parameters: Parameters, allowFreeJump = false, horizonMs = Number.MAX_SAFE_INTEGER): Promise<{ state: TestSnapshot; decision: Decision }> {
  const handle = await page.waitForFunction(({ source, parameters, allowFreeJump, horizonMs }) => {
    const state = window.__CAT_JUMP_TEST__?.snapshot();
    if (!state?.cat) return false;
    const decide = new Function(`return (${source})`)() as (state: TestSnapshot, parameters: Parameters) => Decision;
    const decision = decide(state, parameters);
    const obstacle = state.nextObstacle;
    const free = allowFreeJump && state.grounded && (!obstacle || obstacle.distance / (state.cat.velocityX - obstacle.velocityX) > 3);
    return state.gameOver || state.elapsedMs >= horizonMs || free || decision.jump ? { state, decision } : false;
  }, { source: decideJump.toString(), parameters, allowFreeJump, horizonMs }, { polling: 'raf', timeout: 120000 });
  const result = await handle.jsonValue();
  void handle.dispose();
  if (!result) throw new Error('Decision polling returned no observation');
  return result;
}
