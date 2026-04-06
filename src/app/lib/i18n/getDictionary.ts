import { messages } from './messages'
import type { AppLanguage } from '@/app/lib/types/settings'

export function getDictionary(language: AppLanguage) {
  return messages[language] ?? messages.no
}