import { serverFetch } from '@/app/lib/serverFetch'
import type { UserSettings } from '@/app/lib/types/settings'

export async function getCurrentSettings(): Promise<UserSettings | null> {
  const res = await serverFetch('/api/customers/me/settings')

  if (!res.ok) {
    return null
  }

  const data = await res.json().catch(() => null)

  if (!data) {
    return null
  }

  return {
    language: data.language ?? 'no',
    notifyCalendarChanges: !!data.notifyCalendarChanges,
    notifyExpenseUpdates: !!data.notifyExpenseUpdates,
    notifyStatusUpdates: !!data.notifyStatusUpdates,
    sharePhoneWithFamily: !!data.sharePhoneWithFamily,
    shareAddressWithFamily: !!data.shareAddressWithFamily,
  }
}