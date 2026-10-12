/** Single-process development limiter. Supply a distributed limiter for multi-instance deployments. */
export function createMemoryRateLimit({
  requests = 10,
  windowMs = 60_000,
  maxIdentities = 10_000,
  now = Date.now,
} = {}) {
  const buckets = new Map<string, { count: number; expires: number }>();
  return async (identity: string): Promise<boolean> => {
    const time = now();
    for (const [key, bucket] of buckets)
      if (bucket.expires <= time) buckets.delete(key);
    let bucket = buckets.get(identity);
    if (!bucket) {
      if (buckets.size >= maxIdentities) return false;
      bucket = { count: 0, expires: time + windowMs };
      buckets.set(identity, bucket);
    }
    return ++bucket.count <= requests;
  };
}
