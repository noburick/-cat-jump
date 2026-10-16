import { test, expect } from '@playwright/test';
import { LEVEL, minimumSpawnInterval, speedAt, validateLevel } from '../src/game/level';
import { createSeededRandom } from '../src/testing/session';

test('crate timing and speed ramp remain physically clearable', () => {
  expect(() => validateLevel(LEVEL)).not.toThrow();
  expect(speedAt(0)).toBe(300);
  expect(speedAt(9999)).toBe(300);
  expect(speedAt(10000)).toBe(310);
  expect(speedAt(999999)).toBe(420);
  expect(LEVEL.minInterval).toBeGreaterThan(minimumSpawnInterval(LEVEL));
  expect(() => validateLevel({ ...LEVEL, minInterval: 0.5 })).toThrow(/clearable/);
  expect(() => validateLevel({ ...LEVEL, crateHeight: 150 })).toThrow(/clearable/);
  expect(() => validateLevel({ ...LEVEL, baseSpeed: 30 })).toThrow(/clearable/);
});
test('seeded interval streams reproduce on retry and differ across seeds', () => {
  const a = createSeededRandom(20261016), b = createSeededRandom(20261016), c = createSeededRandom(20261017);
  const first = Array.from({ length: 20 }, () => a());
  expect(Array.from({ length: 20 }, () => b())).toEqual(first);
  expect(Array.from({ length: 20 }, () => c())).not.toEqual(first);
});
