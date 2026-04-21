'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './changePassword.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

export default function ChangePasswordPage() {
  const router = useRouter()
  const t = useTranslations()

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api` : '/api'
  }, [])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t.changePassword.fillAllFields)
      return
    }

    if (newPassword.length < 6) {
      setError(t.changePassword.passwordMinLength)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t.changePassword.passwordMismatch)
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/customers/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          data?.message ||
            t.changePassword.requestFailed.replace(
              '{status}',
              String(res.status)
            )
        )
      }

      setSuccess(
        data?.message || t.changePassword.passwordUpdated
      )

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(
        err?.message || t.changePassword.genericError
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.card}>
          <h1 className={styles.title}>
            {t.changePassword.title}
          </h1>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <label className={styles.field}>
              <span className={styles.label}>
                {t.changePassword.currentPassword}
              </span>

              <input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                autoComplete="current-password"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {t.changePassword.newPassword}
              </span>

              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                autoComplete="new-password"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                {t.changePassword.confirmPassword}
              </span>

              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
              />
            </label>

            {success ? (
              <p className={styles.success}>
                {success}
              </p>
            ) : null}

            {error ? (
              <p className={styles.error}>
                {error}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() =>
                  router.push('/profile')
                }
              >
                {t.changePassword.back}
              </button>

              <button
                className={styles.primaryBtn}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? t.changePassword.saving
                  : t.changePassword.updatePassword}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}