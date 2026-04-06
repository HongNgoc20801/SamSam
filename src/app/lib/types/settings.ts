export type AppLanguage = 'no' | 'en'

export type UserSettings = {
  language: AppLanguage
  notifyCalendarChanges: boolean
  notifyExpenseUpdates: boolean
  notifyStatusUpdates: boolean
  sharePhoneWithFamily: boolean
  shareAddressWithFamily: boolean
}