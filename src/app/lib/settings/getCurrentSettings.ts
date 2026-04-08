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

    notificationsEnabled: data.notificationsEnabled ?? true,

    notifyCalendarChanges: data.notifyCalendarChanges ?? true,
    notifyExpenseUpdates: data.notifyExpenseUpdates ?? true,
    notifyStatusUpdates: data.notifyStatusUpdates ?? true,
    notifyDocumentUpdates: data.notifyDocumentUpdates ?? true,  

    sharePhoneWithFamily: data.sharePhoneWithFamily ?? true,
    shareAddressWithFamily: data.shareAddressWithFamily ?? false,
  }
}