import { serverFetch } from '@/app/lib/serverFetch'
import { getDictionary } from './getDictionary'
import type { AppLanguage } from '@/app/lib/types/settings'

function normalizeLanguage(lang?: string): AppLanguage {
  if (!lang) return 'no'

  const value = lang.toLowerCase()

  if (value === 'nb' || value === 'nn' || value === 'no') return 'no'
  if (value === 'en') return 'en'

  return 'no'
}

export async function getTranslations() {
  try {
    const res = await serverFetch('/api/customers/me')

    if (!res.ok) {
      return getDictionary('no')
    }

    const data = await res.json().catch(() => null)
    const language = normalizeLanguage(data?.user?.language)

    return getDictionary(language)
  } catch {
    return getDictionary('no')
  }
}