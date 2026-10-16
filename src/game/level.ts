export interface LevelRules {
  baseSpeed: number; maxSpeed: number; speedStep: number; speedupEverySeconds: number;
  firstSpawnSeconds: number; crateWidth: number; crateHeight: number;
  minInterval: number; maxInterval: number; spawnX: number; groundY: number;
}
export function minimumSpawnInterval(rules: LevelRules): number {
  // Conservative bound: flight + landing margin + worst possible catch-up in transit.
  return 2 * 560 / 1500 + 0.2 + rules.spawnX * (1 / rules.baseSpeed - 1 / rules.maxSpeed);
}
export function validateLevel(rules: LevelRules): void {
  if (Object.values(rules).some(value => !Number.isFinite(value)) || rules.baseSpeed <= 0
      || rules.maxSpeed < rules.baseSpeed || rules.speedStep <= 0 || rules.speedupEverySeconds <= 0
      || rules.firstSpawnSeconds < 0 || rules.crateWidth <= 0 || rules.crateHeight <= 0
      || rules.spawnX < 960 + rules.crateWidth / 2 || rules.groundY !== 438
      || rules.maxInterval < rules.minInterval) throw new Error('Invalid obstacle rules');
  const clearanceHeight = rules.crateHeight + 6;
  const discriminant = 560 ** 2 - 2 * 1500 * clearanceHeight;
  const safeWindow = discriminant > 0 ? 2 * Math.sqrt(discriminant) / 1500 : 0;
  if ((rules.crateWidth + 44) / rules.baseSpeed >= safeWindow
      || rules.minInterval < minimumSpawnInterval(rules)) {
    throw new Error('Obstacle configuration cannot guarantee a clearable jump and landing gap');
  }
}
export const LEVEL: Readonly<LevelRules> = Object.freeze({
  baseSpeed: 300, maxSpeed: 420, speedStep: 10, speedupEverySeconds: 10,
  firstSpawnSeconds: 8, crateWidth: 40, crateHeight: 36,
  minInterval: 2.8, maxInterval: 3.4, spawnX: 1000, groundY: 438,
});
validateLevel(LEVEL);
export function speedAt(elapsedMs: number, rules: LevelRules = LEVEL): number {
  return Math.min(rules.maxSpeed, rules.baseSpeed + Math.floor(elapsedMs / (1000 * rules.speedupEverySeconds)) * rules.speedStep);
}
