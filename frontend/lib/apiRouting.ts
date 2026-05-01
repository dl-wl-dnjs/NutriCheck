/**
 * Route shape compatibility: dev users use a UUID (Bearer + path/query style
 * matches older API builds). Clerk users use opaque ids — only /profile etc. without path.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelyUserUuid(userId: string): boolean {
  return UUID_RE.test(userId.trim());
}

/** GET/PUT profile path */
export function profilePath(userId: string): string {
  return isLikelyUserUuid(userId) ? `/profile/${encodeURIComponent(userId.trim())}` : '/profile';
}

/** GET scan-history path */
export function scanHistoryPath(userId: string, limit: number): string {
  const q = `limit=${encodeURIComponent(String(limit))}`;
  return isLikelyUserUuid(userId)
    ? `/scan-history/${encodeURIComponent(userId.trim())}?${q}`
    : `/scan-history?${q}`;
}
