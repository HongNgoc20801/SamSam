'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './newChild.module.css'

export default function NewChildPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [agree, setAgree] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    if (!fullName.trim() || !birthDate) {
      setError('Vennligst fyll inn navn og fødselsdato.')
      return
    }
    if (!agree) {
      setError('Du må bekrefte at dette er delt informasjon.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          birthDate,
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message || 'Kunne ikke opprette barneprofil.')

      router.push('/child-info')
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Opprett barneprofil</h1>
      <p className={styles.subtitle}>
        Informasjonen blir delt i familiegruppen og logges i systemet.
      </p>

      <form onSubmit={onSubmit} className={styles.form}>
        <label className={styles.label}>
          Fullt navn
          <input
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </label>

        <label className={styles.label}>
          Fødselsdato
          <input
            className={styles.input}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={loading}
          />
        </label>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={loading}
          />
          <span>Jeg forstår at dette er delt informasjon</span>
        </label>

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Oppretter…' : 'Opprett'}
        </button>

        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}
