import type { NotificationType } from './createNotification'

export function shouldSendNotification(user: any, type: NotificationType) {
  if (!user) return false
  if (user.notificationsEnabled === false) return false

  if (type === 'calendar') return user.notifyCalendarChanges !== false
  if (type === 'expense') return user.notifyExpenseUpdates !== false
  if (type === 'documents') return user.notifyDocumentUpdates !== false
  if (type === 'status') return user.notifyStatusUpdates !== false
  if (type === 'post') return user.notifyStatusUpdates !== false

  return false
}