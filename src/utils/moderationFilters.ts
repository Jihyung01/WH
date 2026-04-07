/** Hide UGC from users the current viewer has blocked (instant client-side feed update). */
export function filterByBlockedCreators<T extends { creator_id?: string | null }>(
  items: T[],
  blockedUserIds: Set<string>,
): T[] {
  if (blockedUserIds.size === 0) return items;
  return items.filter(
    (item) =>
      !item.creator_id ||
      typeof item.creator_id !== 'string' ||
      !blockedUserIds.has(item.creator_id),
  );
}
