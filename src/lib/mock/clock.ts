// Fixed clock for deterministic mock data. SSR must render identical
// markup to the client, so nothing in a render path may read Date.now().

export const NOW = Date.parse('2026-10-17T13:20:00Z')
export const NOW_ISO = new Date(NOW).toISOString()

export function minutesAgo(mins: number): string {
  return new Date(NOW - mins * 60_000).toISOString()
}

// Deterministic PRNG for mock series — same seed, same data, every render.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
