export const RANDOM_RULES = Object.freeze({ minimumWeight: 0.10, recoveryRolls: 24 });

export function createBalancedRandomizer({ minimumWeight = 0.10, recoveryRolls = 24, random = () => Math.random() } = {}) {
  if (!Number.isFinite(minimumWeight) || minimumWeight <= 0 || minimumWeight > 1 || !Number.isFinite(recoveryRolls) || recoveryRolls < 1 || typeof random !== 'function') {
    throw new RangeError('Invalid balanced-random settings');
  }
  let revealedCount = 0;
  const lastSeen = new Map();
  const seenThisBuild = new Set();
  function weight(id) {
    if (!lastSeen.has(id)) return 1;
    const absence = Math.max(0, revealedCount - lastSeen.get(id));
    const recovery = Math.min(absence / recoveryRolls, 1);
    return minimumWeight + (1 - minimumWeight) * recovery;
  }
  function eligible(ids) { return ids.filter(id => !seenThisBuild.has(id)); }
  function pick(ids) {
    const candidates = eligible(ids);
    if (!candidates.length) return null;
    const weights = candidates.map(weight);
    const total = weights.reduce((sum, value) => sum + value, 0);
    let cursor = random() * total;
    for (let i = 0; i < candidates.length; i++) {
      cursor -= weights[i];
      if (cursor < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }
  function reveal(id) {
    if (seenThisBuild.has(id)) return false;
    revealedCount++;
    lastSeen.set(id, revealedCount);
    seenThisBuild.add(id);
    return true;
  }
  return Object.freeze({ pick, reveal, eligible, weight, startBuild: () => seenThisBuild.clear() });
}
