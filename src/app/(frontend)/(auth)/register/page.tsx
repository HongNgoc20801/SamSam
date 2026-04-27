'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import styles from './register.module.css'
import Brand from '../../components/Brand/Brand'

const AUTH_COLLECTION = 'customers'

function cleanEmailInput(v: string) {
  return v.trim().toLowerCase().replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone: string) {
  return /^[+\d\s]{6,}$/.test(phone.trim())
}

function hasUppercase(value: string) {
  return /[A-ZÆØÅ]/.test(value)
}

function hasLowercase(value: string) {
  return /[a-zæøå]/.test(value)
}

function hasNumber(value: string) {
  return /\d/.test(value)
}

function hasSpecialChar(value: string) {
  return /[^A-Za-z0-9]/.test(value)
}

export default function RegisterPage() {
  const router = useRouter()

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api/${AUTH_COLLECTION}` : `/api/${AUTH_COLLECTION}`
  }, [])

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [familyRole, setFamilyRole] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      uppercase: hasUppercase(password),
      lowercase: hasLowercase(password),
      number: hasNumber(password),
      special: hasSpecialChar(password),
    }
  }, [password])

  const passedPasswordChecks = Object.values(passwordChecks).filter(Boolean).length

  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        label: '',
        level: 0,
        className: styles.strengthEmpty,
        progressClassName: '',
        width: '0%',
      }
    }

    if (passedPasswordChecks <= 2) {
      return {
        label: 'Svakt',
        level: 1,
        className: styles.strengthWeak,
        progressClassName: styles.passwordProgressWeak,
        width: '33%',
      }
    }

    if (passedPasswordChecks <= 4) {
      return {
        label: 'Middels',
        level: 2,
        className: styles.strengthMedium,
        progressClassName: styles.passwordProgressMedium,
        width: '66%',
      }
    }

    return {
      label: 'Sterkt',
      level: 3,
      className: styles.strengthStrong,
      progressClassName: styles.passwordProgressStrong,
      width: '100%',
    }
  }, [password, passedPasswordChecks])

  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordsDontMatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    const cleanEmail = cleanEmailInput(email)

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !birthDate ||
      !cleanEmail ||
      !phone.trim() ||
      !address.trim() ||
      !gender ||
      !familyRole ||
      !password ||
      !confirm
    ) {
      setError('Vennligst fyll inn alle feltene.')
      return
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Ugyldig e-postadresse.')
      return
    }

    if (!isValidPhone(phone)) {
      setError('Ugyldig telefonnummer.')
      return
    }

    if (password.length < 8) {
      setError('Passord må være minst 8 tegn.')
      return
    }

    if (!passwordChecks.uppercase || !passwordChecks.lowercase || !passwordChecks.number) {
      setError('Passord må inneholde store og små bokstaver, samt minst ett tall.')
      return
    }

    if (password !== confirm) {
      setError('Passordene matcher ikke.')
      return
    }

    setLoading(true)

    try {
      const createRes = await fetch(`${API_BASE}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate,
          email: cleanEmail,
          phone: phone.trim(),
          address: address.trim(),
          gender,
          familyRole,
          password,
        }),
      })

      const raw = await createRes.text()
      let createData: any = {}

      try {
        createData = JSON.parse(raw)
      } catch {}

      if (!createRes.ok) {
        const msg =
          createData?.message ||
          createData?.errors?.[0]?.message ||
          raw ||
          'Kunne ikke opprette konto.'
        throw new Error(msg)
      }

      const code = inviteCode.trim()
      if (code) sessionStorage.setItem('samsam_invite_code', code)
      else sessionStorage.removeItem('samsam_invite_code')

      router.push('/login?registered=1')
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Sammen om omsorgen</p>

          <h2 className={styles.heroTitle}>
            En trygg digital plass
            <br />
            for familien
          </h2>

          <p className={styles.heroText}>
            Hold oversikt over kalender, avtaler og oppgaver rundt barnet i hverdagen – samlet på
            ett sted.
          </p>

          <div className={styles.heroTags}>
            <span>Kalender</span>
            <span>Avtaler</span>
            <span>Oppgaver</span>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-label="Registrering">
        <div className={styles.panelInner}>
          <div className={styles.brand} aria-label="SamSam">
            <Brand />
          </div>

          <h1 className={styles.title}>Opprett konto</h1>
          <p className={styles.subtitle}>Lag en ny konto for å bruke SamSam.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="firstName">
                  Fornavn
                </label>
                <div className={styles.field}>
                  <input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    placeholder="Fornavn"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="lastName">
                  Etternavn
                </label>
                <div className={styles.field}>
                  <input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    placeholder="Etternavn"
                  />
                </div>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="birthDate">
                  Fødselsdato
                </label>
                <div className={styles.field}>
                  <input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="gender">
                  Kjønn
                </label>
                <div className={styles.field}>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Velg</option>
                    <option value="male">Mann</option>
                    <option value="female">Kvinne</option>
                    <option value="other">Annet</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">
                E-post
              </label>
              <div className={styles.field}>
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="Din e-postadresse"
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="phone">
                  Telefonnummer
                </label>
                <div className={styles.field}>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    placeholder="+47 123 45 678"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="familyRole">
                  Rolle i familien
                </label>
                <div className={styles.field}>
                  <select
                    id="familyRole"
                    value={familyRole}
                    onChange={(e) => setFamilyRole(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Velg</option>
                    <option value="father">Far</option>
                    <option value="mother">Mor</option>
                    <option value="sibling">Søsken</option>
                    <option value="other">Annet</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="address">
                Adresse
              </label>
              <div className={styles.field}>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  placeholder="Gate, nummer, poststed"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="inviteCode">
                Invitasjonskode (valgfritt)
              </label>
              <div className={styles.field}>
                <input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={loading}
                  placeholder="F.eks. A1B2C3D4E5"
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="password">
                  Passord
                </label>

                <div className={styles.field}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Skriv inn passord"
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className={styles.passwordSection}>
                    <div className={styles.passwordStrengthRow}>
                      <span className={styles.passwordStrengthLabel}>PASSORDSIKKERHET</span>
                      <span
                        className={`${styles.passwordStrengthValue} ${passwordStrength.className}`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div
                      className={styles.passwordProgress}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={3}
                      aria-valuenow={passwordStrength.level}
                      aria-label="Passordstyrke"
                    >
                      <span
                        className={`${styles.passwordProgressFill} ${passwordStrength.progressClassName}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>

                    <p className={styles.passwordHint}>
                      Bruk minst 8 tegn med stor og liten bokstav, samt minst ett tall.
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="confirm">
                  Bekreft passord
                </label>

                <div className={styles.field}>
                  <input
                    id="confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    placeholder="Gjenta passord"
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Skjul passord' : 'Vis passord'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {confirm.length > 0 && (
                  <div className={styles.confirmState}>
                    {passwordsMatch ? (
                      <span className={styles.matchOk}>Passordene matcher</span>
                    ) : passwordsDontMatch ? (
                      <span className={styles.matchError}>Passordene matcher ikke</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <button className={styles.primaryBtn} type="submit" disabled={loading}>
              {loading ? 'Oppretter…' : 'Opprett konto'}
            </button>

            <div className={styles.divider} role="separator" aria-label="eller">
              <span>eller</span>
            </div>

            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={() => router.push('/login')}
              disabled={loading}
            >
              Tilbake til Logg inn
            </button>

            <p className={styles.error} role="alert" aria-live="polite">
              {error}
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}