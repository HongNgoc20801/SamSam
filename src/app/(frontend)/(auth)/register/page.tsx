'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './register.module.css'
import Brand from '../../components/Brand'

export default function RegisterPage() {
  const router = useRouter()

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

  const [loading] = useState(false) 
  const [error] = useState('') 

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
   
  }

  return (
    <main className={styles.bg}>
      <section className={styles.card} aria-label="Registrering">
        <div className={styles.brand} aria-label="SamSam">
          <Brand />
        </div>

        <h1 className={styles.title}>Opprett konto</h1>
        <p className={styles.subtitle}>Lag en ny konto for å bruke SamSam.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className={styles.grid2}>
            <div>
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

            <div>
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

          <div className={styles.grid2}>
            <div>
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

            <div>
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
                  <option value="sibling">Søsken (anh/chị)</option>
                  <option value="other">Annet</option>
                </select>
              </div>
            </div>
          </div>

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

          <label className={styles.label} htmlFor="password">
            Passord
          </label>
          <div className={styles.field}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Skriv inn passord"
            />
          </div>

          <label className={styles.label} htmlFor="confirm">
            Bekreft passord
          </label>
          <div className={styles.field}>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              placeholder="Gjenta passord"
            />
          </div>

          <button className={styles.primaryBtn} type="submit" disabled={loading}>
            Opprett konto
          </button>

          <div className={styles.divider} role="separator" aria-label="eller">
            <span>eller</span>
          </div>

          <button className={styles.secondaryBtn} type="button" onClick={() => router.push('/login')} disabled={loading}>
            Tilbake til Logg inn
          </button>

          <p className={styles.error} role="alert" aria-live="polite">
            {error}
          </p>
        </form>
      </section>
    </main>
  )
}
