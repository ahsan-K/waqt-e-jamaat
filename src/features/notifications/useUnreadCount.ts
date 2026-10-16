import { useAuth } from '@/features/auth/AuthProvider';
import { unreadCount } from '@/lib/inbox';
import { useInbox } from '@/store/inbox';

/** Unread notification count for the bell badge (local inbox, PLAN §11). */
export function useUnreadCount(): number {
  const { user } = useAuth();
  const items = useInbox((s) => (user ? s.byUser[user.uid] : undefined));
  return items ? unreadCount(items) : 0;
}
