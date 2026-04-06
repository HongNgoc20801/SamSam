'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import type { UserSettings } from '@/app/lib/types/settings'

type SettingsContextValue = {
  settings: UserSettings | null
  setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: UserSettings | null
  children: React.ReactNode
}) {
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)

  const value = useMemo(
    () => ({
      settings,
      setSettings,
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)

  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider')
  }

  return ctx
}