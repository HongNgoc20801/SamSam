'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LockKeyhole } from 'lucide-react'

import styles from './changePassword.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const t = useTranslations()
  const td = t.changePassword

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
      setError(td.fillAllFields)
      return
    }

    if (!isStrongPassword(newPassword)) {
      setError(td.passwordRequirement)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(td.passwordMismatch)
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/customers/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          data?.message || td.requestFailed.replace('{status}', String(res.status)),
        )
      }

      setSuccess(data?.message || td.passwordUpdated)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.message || td.genericError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => router.push('/profile')}
            >
              <ArrowLeft size={16} />
              {td.back}
            </button>

            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{td.title}</span>
          </div>

          <h1 className={styles.title}>{td.title}</h1>
          <p className={styles.subtitle}>{td.subtitle}</p>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <LockKeyhole size={22} />
            </div>

            <div>
              <h2 className={styles.cardTitle}>{td.cardTitle}</h2>
              <p className={styles.cardText}>{td.helpText}</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>{td.currentPassword}</span>
              <input
                className={styles.input}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{td.newPassword}</span>
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <span className={styles.hint}>{td.passwordHint}</span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>{td.confirmPassword}</span>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>

            {success ? <p className={styles.success}>✓ {success}</p> : null}
            {error ? <p className={styles.error}>⚠ {error}</p> : null}

            <div className={styles.actions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => router.push('/profile')}
                disabled={saving}
              >
                {td.cancel}
              </button>

              <button className={styles.primaryBtn} type="submit" disabled={saving}>
                {saving ? td.saving : td.updatePassword}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}