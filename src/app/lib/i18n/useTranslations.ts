'use client'

import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'
import { getDictionary } from './getDictionary'
import { messages } from './messages'
import type { AppLanguage } from '@/app/lib/types/settings'

type Dictionary = typeof messages.no

function normalizeLanguage(lang?: string): AppLanguage {
  if (!lang) return 'no'

  const value = lang.toLowerCase()

  if (value === 'nb' || value === 'nn' || value === 'no') return 'no'
  if (value === 'en') return 'en'

  return 'no'
}

export function useTranslations(): Dictionary {
  const { settings } = useSettings()
  const language = normalizeLanguage(settings?.language)

  return getDictionary(language) as Dictionary
}