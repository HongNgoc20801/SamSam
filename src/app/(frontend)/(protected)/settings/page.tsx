'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './settings.module.css'
import { useSettings } from '../../components/providers/SettingsProvider'
import { useTranslations } from '@/app/lib/i18n/useTranslations'
import type { AppLanguage, UserSettings } from '@/app/lib/types/settings'

function SettingTile({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`${styles.tile} ${disabled ? styles.tileDisabled : ''}`}>
      <div className={styles.tileContent}>
        <h3 className={styles.tileTitle}>{title}</h3>
        <p className={styles.tileDescription}>{description}</p>
      </div>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleTrack}></span>
      </label>
    </div>
  )
}

function PrivacyRow({
  title,
  description,
  value,
  onClick,
}: {
  title: string
  description: string
  value: string
  onClick: () => void
}) {
  return (
    <button className={styles.privacyRow} type="button" onClick={onClick}>
      <div className={styles.privacyLeft}>
        <p className={styles.privacyTitle}>{title}</p>
        <p className={styles.privacyDescription}>{description}</p>
      </div>

      <div className={styles.privacyRight}>
        <span className={styles.privacyValue}>{value}</span>
        <span className={styles.privacyArrow}>›</span>
      </div>
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { settings, setSettings } = useSettings()
  const t = useTranslations()

  const [language, setLanguage] = useState<AppLanguage>('no')

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [notifyCalendarChanges, setNotifyCalendarChanges] = useState(true)
  const [notifyExpenseUpdates, setNotifyExpenseUpdates] = useState(true)
  const [notifyStatusUpdates, setNotifyStatusUpdates] = useState(true)
  const [notifyDocumentUpdates, setNotifyDocumentUpdates] = useState(true)

  const [sharePhoneWithFamily, setSharePhoneWithFamily] = useState(true)
  const [shareAddressWithFamily, setShareAddressWithFamily] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!settings) return

    setLanguage(settings.language ?? 'no')

    setNotificationsEnabled(settings.notificationsEnabled ?? true)
    setNotifyCalendarChanges(settings.notifyCalendarChanges ?? true)
    setNotifyExpenseUpdates(settings.notifyExpenseUpdates ?? true)
    setNotifyStatusUpdates(settings.notifyStatusUpdates ?? true)
    setNotifyDocumentUpdates(settings.notifyDocumentUpdates ?? true)

    setSharePhoneWithFamily(settings.sharePhoneWithFamily ?? true)
    setShareAddressWithFamily(settings.shareAddressWithFamily ?? false)
  }, [settings])

  async function handleSave() {
    if (!settings || saving) return

    setSaving(true)
    setError('')
    setSuccess('')

    const nextSettings: UserSettings = {
      language,
      notificationsEnabled,
      notifyCalendarChanges,
      notifyExpenseUpdates,
      notifyStatusUpdates,
      notifyDocumentUpdates,
      sharePhoneWithFamily,
      shareAddressWithFamily,
    }

    try {
      const res = await fetch('/api/customers/me/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextSettings),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || t.settings.saveError)
      }

      setSettings(nextSettings)
      setSuccess(t.settings.saved)
    } catch (err: any) {
      setError(err?.message || t.settings.saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/customers/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}

    router.push('/login')
  }

  if (!settings) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <p className={styles.loading}>{t.settings.loading}</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerBlock}>
          <p className={styles.eyebrow}>{t.settings.pageKicker}</p>
          <h1 className={styles.pageTitle}>{t.settings.title}</h1>
          <p className={styles.pageIntro}>
            {t.settings.pageDescription ??
              'Manage language, privacy, and in-app notification preferences.'}
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <h2 className={styles.sectionTitle}>{t.settings.notifications}</h2>
                  <p className={styles.sectionDescription}>
                    {t.settings.notificationsDescription ??
                      'Choose which in-app updates you want to receive.'}
                  </p>
                </div>

                <span className={styles.gridLabel}>
                  {t.settings.gridLabel ?? 'GRID'}
                </span>
              </div>

              <div className={styles.masterTile}>
                <div className={styles.masterTileContent}>
                  <h3 className={styles.masterTitle}>
                    {t.settings.allNotifications ?? 'All notifications'}
                  </h3>
                  <p className={styles.masterDescription}>
                    {t.settings.allNotificationsDescription ??
                      'Turn all in-app notifications on or off.'}
                  </p>
                </div>

                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}></span>
                </label>
              </div>

              <div className={styles.tileGrid}>
                <SettingTile
                  title={t.settings.calendar}
                  description={t.settings.calendarDescription}
                  checked={notifyCalendarChanges}
                  onChange={setNotifyCalendarChanges}
                  disabled={!notificationsEnabled}
                />

                <SettingTile
                  title={t.settings.expenses}
                  description={t.settings.expensesDescription}
                  checked={notifyExpenseUpdates}
                  onChange={setNotifyExpenseUpdates}
                  disabled={!notificationsEnabled}
                />

                <SettingTile
                  title={t.settings.status}
                  description={t.settings.statusDescription}
                  checked={notifyStatusUpdates}
                  onChange={setNotifyStatusUpdates}
                  disabled={!notificationsEnabled}
                />

                <SettingTile
                  title={t.settings.documents ?? 'Documents'}
                  description={
                    t.settings.documentsDescription ??
                    'Get notified when documents are uploaded, replaced, or changed.'
                  }
                  checked={notifyDocumentUpdates}
                  onChange={setNotifyDocumentUpdates}
                  disabled={!notificationsEnabled}
                />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <h2 className={styles.sectionTitle}>{t.settings.privacy}</h2>
                  <p className={styles.sectionDescription}>
                    {t.settings.privacyDescription ??
                      'Control what other family members can see.'}
                  </p>
                </div>
              </div>

              <div className={styles.privacyStack}>
                <PrivacyRow
                  title={t.settings.phoneVisibility}
                  description={t.settings.phoneVisibilityDescription}
                  value={
                    sharePhoneWithFamily
                      ? t.settings.phoneVisible
                      : t.settings.phoneHidden
                  }
                  onClick={() => setSharePhoneWithFamily((prev) => !prev)}
                />

                <PrivacyRow
                  title={t.settings.addressPrivacy}
                  description={t.settings.addressPrivacyDescription}
                  value={
                    shareAddressWithFamily
                      ? t.settings.addressShared
                      : t.settings.addressPrivate
                  }
                  onClick={() => setShareAddressWithFamily((prev) => !prev)}
                />
              </div>
            </section>

            {success ? <p className={styles.success}>{success}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.bottomActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => router.push('/profile')}
              >
                {t.settings.backToProfile}
              </button>

              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t.settings.saving : t.settings.save}
              </button>
            </div>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.securityPanel}>
              <p className={styles.sideEyebrowDark}>{t.settings.securityEyebrow}</p>
              <h3 className={styles.securityTitle}>{t.settings.security}</h3>
              <p className={styles.securityText}>{t.settings.securityDescription}</p>

              <div className={styles.securityActions}>
                <button
                  className={styles.darkButton}
                  type="button"
                  onClick={() => router.push('/settings/change-password')}
                >
                  {t.settings.updatePassword}
                </button>

                <button
                  className={styles.darkButton}
                  type="button"
                  onClick={handleLogout}
                >
                  {t.settings.logout}
                </button>
              </div>
            </section>

            <section className={styles.sidePanel}>
              <p className={styles.sideEyebrow}>{t.settings.systemLanguage}</p>

              <select
                className={styles.select}
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
              >
                <option value="no">Norsk</option>
                <option value="en">English</option>
              </select>
            </section>

            <section className={styles.sidePanel}>
              <p className={styles.sideEyebrow}>{t.settings.helpSupport}</p>

              <div className={styles.linkList}>
                <button type="button" className={styles.inlineLink}>
                  {t.settings.helpCenter}
                </button>
                <button type="button" className={styles.inlineLink}>
                  {t.settings.contactSupport}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}