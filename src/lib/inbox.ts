export type InboxType =
  'reminder' | 'change' | 'added' | 'special' | 'report' | 'request' | 'approved' | 'rejected';

export type InboxItem = {
  id: string;
  type: InboxType;
  title: string;
  body: string;
  at: number;
  readAt?: number;
  /** Deep link route, e.g. "/masjid/abc". */
  route?: string;
};

export const INBOX_MAX = 100;
export const INBOX_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Merge new items (dedupe by id, keep existing read state), prune by age and size. */
export function mergeInbox(existing: InboxItem[], incoming: InboxItem[], now: number): InboxItem[] {
  const byId = new Map(existing.map((i) => [i.id, i]));
  for (const item of incoming) {
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? { ...item, readAt: prev.readAt } : item);
  }
  return [...byId.values()]
    .filter((i) => now - i.at <= INBOX_RETENTION_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, INBOX_MAX);
}

export function unreadCount(items: InboxItem[], now = Date.now()): number {
  return items.filter((i) => !i.readAt && i.at <= now).length;
}

export type InboxGroup = 'today' | 'yesterday' | 'week' | 'older';

/** Group label by calendar day relative to `today` ('YYYY-MM-DD' in local time). */
export function groupOf(itemDate: string, today: string, yesterday: string): InboxGroup {
  if (itemDate === today) return 'today';
  if (itemDate === yesterday) return 'yesterday';
  const diff = (Date.parse(today) - Date.parse(itemDate)) / 86_400_000;
  return diff <= 7 ? 'week' : 'older';
}
