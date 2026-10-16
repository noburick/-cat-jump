export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
// This module is imported only in development / E2E builds.
export function testSession(): { seed: number | null; randomFactory: () => () => number } {
  const raw = new URLSearchParams(location.search).get('seed');
  const seed = raw !== null && /^\d+$/.test(raw) && Number(raw) <= 0xffffffff ? Number(raw) : null;
  return { seed, randomFactory: seed === null ? () => Math.random : () => createSeededRandom(seed) };
}
