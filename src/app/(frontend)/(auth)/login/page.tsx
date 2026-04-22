'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

const AUTH_COLLECTION = 'customers'

function cleanEmailInput(v: string) {
  return v.trim().toLowerCase().replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const router = useRouter()

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api/${AUTH_COLLECTION}` : `/api/${AUTH_COLLECTION}`
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const remembered = localStorage.getItem('samsam_remember') === '1'
    if (!remembered) return

    setEmail(localStorage.getItem('samsam_email') ?? '')
    setRemember(true)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, { credentials: 'include' })
        if (!res.ok) return

        const data = await res.json().catch(() => null)
        if (data?.user) router.replace('/dashboard')
      } catch {}
    })()
  }, [API_BASE, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setError('')

    const cleanEmail = cleanEmailInput(email)

    if (!cleanEmail || !password) {
      setError('Vennligst fyll inn e-post og passord.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Ugyldig e-postadresse.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      })

      const data = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        throw new Error(
          data?.message || data?.errors?.[0]?.message || 'Feil e-post eller passord.'
        )
      }

      if (remember) {
        localStorage.setItem('samsam_remember', '1')
        localStorage.setItem('samsam_email', cleanEmail)
      } else {
        localStorage.removeItem('samsam_remember')
        localStorage.removeItem('samsam_email')
      }

      const savedInviteCode = (sessionStorage.getItem('samsam_invite_code') || '').trim()

      if (savedInviteCode) {
        const joinRes = await fetch(`/api/families/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: savedInviteCode }),
        })

        const j = await joinRes.json().catch(() => null)
        if (!joinRes.ok) {
          console.warn('Join family failed:', joinRes.status, j?.message)
        }

        sessionStorage.removeItem('samsam_invite_code')
        await fetch(`/api/customers/me`, {
          credentials: 'include',
          cache: 'no-store',
        })
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <aside className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBrand}>SamSam</div>

          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>Sammen om omsorgen.</h2>
            <p className={styles.heroText}>
              En trygg digital plass der familie kan følge opp kalender, avtaler og
              oppgaver rundt barnet i hverdagen.
            </p>
          </div>

          <div className={styles.heroBadge}>Sikker plattform</div>
        </div>
      </aside>

      <section className={styles.panel} aria-label="Innlogging">
        <div className={styles.panelInner}>
          <div className={styles.panelTop}>
            <div className={styles.secureBadge}>Secure Login Portal</div>

            <h1 className={styles.title}>Velkommen tilbake</h1>
            <p className={styles.subtitle}>
              Logg inn for å fortsette og få oversikt over kalender, avtaler og oppgaver.
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label className={styles.label} htmlFor="email">
                E-postadresse
              </label>

              <div className={styles.field}>
                <span className={styles.icon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16v12H4V6z" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M4 7l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <label className={styles.label} htmlFor="password">
                Passord
              </label>

              <div className={styles.field}>
                <span className={styles.icon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 11V8.6A5 5 0 0 1 12 3a5 5 0 0 1 5 5.6V11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path d="M6 11h12v10H6V11z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 15v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Skriv inn passord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
              </div>

              <div className={styles.row}>
                <label className={styles.remember}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setRemember(checked)

                      if (!checked) {
                        localStorage.removeItem('samsam_remember')
                        localStorage.removeItem('samsam_email')
                        localStorage.removeItem('samsam_password')
                        setEmail('')
                        setPassword('')
                      }
                    }}
                    disabled={loading}
                  />
                  <span>Huske meg</span>
                </label>

                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() =>
                    alert('Glemt passord: kan lage flow senere (Payload støtter /forgot-password).')
                  }
                  disabled={loading}
                >
                  Glemt passord?
                </button>
              </div>

              <button className={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? 'Logger inn…' : 'Logg inn'}
              </button>

              <div className={styles.divider} role="separator" aria-label="eller">
                <span>eller</span>
              </div>

              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => router.push('/register')}
                disabled={loading}
              >
                Opprett konto
              </button>

              <p className={styles.note}>
                Har du fått en invitasjon? Lim inn koden for å bli med i familiegruppen.
              </p>

              <p className={styles.registerText}>
                Har du ikke konto?{' '}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => router.push('/register')}
                  disabled={loading}
                >
                  Registrer deg nå
                </button>
              </p>

              <p className={styles.error} role="alert" aria-live="polite">
                {error}
              </p>
            </form>
          </div>

          <div className={styles.panelBottom}>
            <div className={styles.metaRow}>
              <span>Privacy first</span>
              <span>Data protection</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}