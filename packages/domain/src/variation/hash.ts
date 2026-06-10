const UINT32_MASK = 0xffffffff;
const KNUTH_MULTIPLIER = 2654435769;

export function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash & UINT32_MASK;
}

export function pick<T>(arr: ReadonlyArray<T>, hash: number, offset: number): T {
  if (arr.length === 0) {
    throw new Error('pick(): array must not be empty');
  }
  const mixed = Math.abs((hash + offset * KNUTH_MULTIPLIER) >>> 0);
  const item = arr[mixed % arr.length];
  return item as T;
}
