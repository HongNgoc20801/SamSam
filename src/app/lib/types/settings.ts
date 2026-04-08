export type AppLanguage = 'no' | 'en'

export type UserSettings = {
  language: AppLanguage
  notificationsEnabled: boolean
  notifyCalendarChanges: boolean
  notifyExpenseUpdates: boolean
  notifyStatusUpdates: boolean
  notifyDocumentUpdates: boolean
  sharePhoneWithFamily: boolean
  shareAddressWithFamily: boolean
}