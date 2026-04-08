export function shouldSendNotification(
  user: any,
  type: 'calendar' | 'expense' | 'status' | 'documents'
) {
  if (!user) return false
  if (user.notificationsEnabled === false) return false

  if (type === 'calendar') return user.notifyCalendarChanges !== false
  if (type === 'expense') return user.notifyExpenseUpdates !== false
  if (type === 'status') return user.notifyStatusUpdates !== false
  if (type === 'documents') return user.notifyDocumentUpdates !== false

  return false
}