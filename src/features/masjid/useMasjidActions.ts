import { useState } from 'react';

import type { GateReason } from '@/components/SignInSheet';
import type { Masjid } from '@/types/masjid';

/**
 * Namazi actions on a masjid. Guests are gated behind the sign-in sheet.
 * (Phase 3: everyone is a guest; Phase 4 wires auth, favourites, reminders, confirmations.)
 */
export function useMasjidActions(
  _id: string | undefined,
  _masjid: Masjid | null,
  openGate: (r: GateReason) => void,
) {
  const [requested] = useState(false);
  return {
    isFavourite: false,
    reminderOn: false,
    notifyWhenAdded: false,
    confirmed: false,
    confirmedNow: false,
    requested,
    toggleFavourite: () => openGate('favourite'),
    toggleReminder: () => openGate('reminder'),
    toggleNotifyWhenAdded: () => openGate('reminder'),
    confirm: () => openGate('confirm'),
    request: () => openGate('reminder'),
    report: () => openGate('confirm'),
    boardPhoto: () => undefined,
  };
}
