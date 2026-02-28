'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import styles from './newChild.module.css'

const BLOOD_MAIN = ['A', 'B', 'AB', 'O'] as const
const BLOOD_ALL = [
  'unknown',
  'A',
  'B',
  'AB',
  'O',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

type Gender = 'na' | 'male' | 'female' | 'other'
type Relation = 'mother' | 'father' | 'grandparent' | 'guardian' | 'other' | 'relative' | 'babysitter' | ''

type AvatarSource = 'url' | 'upload'

function normalize11Digits(v: string) {
  return v.replace(/\s+/g, '')
}

function parseTags(input: string) {
  return input
    .split(/[,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((value) => ({ value }))
}

function isLikelyHttpUrl(url: string) {
  const u = url.trim()
  if (!u) return false
  return /^https?:\/\/.+/i.test(u)
}

export default function NewChildPage() {
  const router = useRouter()

  // profile
  const [avatarSource, setAvatarSource] = useState<AvatarSource>('url')
  const [avatarURL, setAvatarURL] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender>('na')
  const [nationalId, setNationalId] = useState('')

  // school
  const [schoolName, setSchoolName] = useState('')
  const [className, setClassName] = useState('')
  const [mainTeacher, setMainTeacher] = useState('')

  // medical
  const [bloodType, setBloodType] = useState<(typeof BLOOD_ALL)[number]>('unknown')
  const [allergyText, setAllergyText] = useState('')
  const [conditionsText, setConditionsText] = useState('')
  const [medicalShort, setMedicalShort] = useState('')

  // emergency contact (single)
  const [emName, setEmName] = useState('')
  const [emPhone, setEmPhone] = useState('')
  const [emRelation, setEmRelation] = useState<Relation>('')

  // governance
  const [agree, setAgree] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && agree && !loading
  }, [fullName, birthDate, agree, loading])

  // Avatar preview
  const avatarLetter = (fullName.trim()?.[0] ?? 'C').toUpperCase()
  const filePreview = useMemo(() => {
    if (!avatarFile) return ''
    return URL.createObjectURL(avatarFile)
  }, [avatarFile])

  const showAvatarImage =
    avatarSource === 'upload'
      ? !!filePreview
      : !!avatarURL.trim() && isLikelyHttpUrl(avatarURL.trim())

  async function uploadToMedia(file: File) {
    // Payload Media upload (typical)
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || 'Could not upload image.')

    // Expecting Payload Media doc back with id
    return j
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')

    const cleanNationalId = normalize11Digits(nationalId.trim())

    if (cleanNationalId && !/^\d{11}$/.test(cleanNationalId)) {
      setError('National ID must be exactly 11 digits.')
      return
    }

    if (avatarSource === 'url' && avatarURL.trim() && !isLikelyHttpUrl(avatarURL)) {
      setError('Invalid avatar URL. Please use a link starting with http(s)://')
      return
    }

    setLoading(true)
    try {
      const body: any = {
        fullName: fullName.trim(),
        birthDate,
        gender,
      }

      // Avatar (matches the new collection schema: avatar.source + avatar.url or avatar.upload)
      if (avatarSource === 'url') {
        const u = avatarURL.trim()
        if (u) body.avatar = { source: 'url', url: u }
      } else {
        if (avatarFile) {
          const mediaDoc = await uploadToMedia(avatarFile)
          body.avatar = { source: 'upload', upload: mediaDoc?.id }
        }
      }

      if (cleanNationalId) body.nationalId = cleanNationalId

      // school group
      if (schoolName.trim() || className.trim() || mainTeacher.trim()) {
        body.school = {
          schoolName: schoolName.trim() || undefined,
          className: className.trim() || undefined,
          mainTeacher: mainTeacher.trim() || undefined,
        }
      }

      // medical group
      const allergies = parseTags(allergyText)
      const conditions = parseTags(conditionsText)
      const notesShort = medicalShort.trim()

      if (bloodType !== 'unknown' || allergies.length || conditions.length || notesShort) {
        body.medical = {}
        if (bloodType !== 'unknown') body.medical.bloodType = bloodType
        if (allergies.length) body.medical.allergies = allergies
        if (conditions.length) body.medical.conditions = conditions
        if (notesShort) body.medical.notesShort = notesShort.slice(0, 160)
      }

      // primaryEmergencyContact (if you kept old field name in backend, rename here accordingly)
      if (emName.trim() || emPhone.trim() || emRelation) {
        body.primaryEmergencyContact = {
          name: emName.trim() || undefined,
          phone: emPhone.trim() || undefined,
          relation: emRelation || undefined,
        }
      }

      const res = await fetch('/api/children', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message || 'Could not create child profile.')

      router.push('/child-info')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          ←
        </button>
        <div>
          <div className={styles.title}>Create child profile</div>
          <div className={styles.subtitle}>This information will be shared with your family group.</div>
        </div>
        <div className={styles.rightSpace} />
      </header>

      <form onSubmit={onSubmit} className={styles.form}>
        {/* Section: Identity */}
        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>Basic information</div>
              <div className={styles.sectionHint}>Used for calendars, messages, and notifications.</div>
            </div>
            <span className={styles.badge}>Shared</span>
          </div>

          <div className={styles.identityGrid}>
            <div className={styles.avatarBlock}>
              <div className={styles.avatarCircle} aria-label="Avatar preview">
                {showAvatarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.avatarImg}
                    src={avatarSource === 'upload' ? filePreview : avatarURL.trim()}
                    alt="Child avatar"
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>{avatarLetter}</div>
                )}
              </div>
              <div className={styles.avatarText}>Avatar (optional)</div>
            </div>

            <div className={styles.fieldsCol}>
              {/* Avatar source */}
              <div className={styles.field}>
                <label>Avatar source</label>
                <div className={styles.segment}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${avatarSource === 'url' ? styles.segmentActive : ''}`}
                    onClick={() => setAvatarSource('url')}
                    disabled={loading}
                    aria-pressed={avatarSource === 'url'}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${avatarSource === 'upload' ? styles.segmentActive : ''}`}
                    onClick={() => setAvatarSource('upload')}
                    disabled={loading}
                    aria-pressed={avatarSource === 'upload'}
                  >
                    Upload
                  </button>
                </div>
                <div className={styles.helpText}>Choose one option. You can change it later.</div>
              </div>

              {/* Avatar URL */}
              {avatarSource === 'url' ? (
                <div className={styles.field}>
                  <label>Image URL</label>
                  <input
                    placeholder="https://..."
                    value={avatarURL}
                    onChange={(e) => setAvatarURL(e.target.value)}
                    disabled={loading}
                  />
                  <div className={styles.helpText}>Use a direct http(s) image URL. Leave empty if not needed.</div>
                </div>
              ) : (
                <div className={styles.field}>
                  <label>Upload image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    disabled={loading}
                  />
                  <div className={styles.helpText}>PNG/JPG recommended. The image will be stored in Media.</div>
                </div>
              )}

              <div className={styles.field}>
                <label>Full name</label>
                <input
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Date of birth</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.field}>
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} disabled={loading}>
                    <option value="na">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>National ID (11 digits) (optional)</label>
                <input
                  inputMode="numeric"
                  placeholder="Example: 12345678901"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={loading}
                />
                <div className={styles.helpText}>For administrative/medical paperwork. Spaces are removed automatically.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: School */}
        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>School / Kindergarten</div>
              <div className={styles.sectionHint}>Helps keep contact info and schedules consistent.</div>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>School name</label>
              <input
                placeholder="Example: ABC Kindergarten"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label>Class</label>
              <input
                placeholder="Example: 2A"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Main teacher (optional)</label>
            <input
              placeholder="Teacher name"
              value={mainTeacher}
              onChange={(e) => setMainTeacher(e.target.value)}
              disabled={loading}
            />
          </div>
        </section>

        {/* Section: Medical */}
        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>Medical (emergency)</div>
              <div className={styles.sectionHint}>Keep it short and specific.</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>Blood type</label>
            <div className={styles.bloodRow}>
              {BLOOD_MAIN.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`${styles.bloodBtn} ${bloodType === b ? styles.bloodActive : ''}`}
                  onClick={() => setBloodType(b)}
                  disabled={loading}
                >
                  {b}
                </button>
              ))}

              <select
                className={styles.bloodMore}
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value as any)}
                disabled={loading}
              >
                {BLOOD_ALL.map((b) => (
                  <option key={b} value={b}>
                    {b === 'unknown' ? 'Unknown / Other' : b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Allergies (tags)</label>
              <input
                placeholder="Seafood, peanuts, pollen..."
                value={allergyText}
                onChange={(e) => setAllergyText(e.target.value)}
                disabled={loading}
              />
              <div className={styles.helpText}>Separate with commas or semicolons.</div>
            </div>

            <div className={styles.field}>
              <label>Conditions (tags)</label>
              <input
                placeholder="Asthma, eczema..."
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                disabled={loading}
              />
              <div className={styles.helpText}>Use short keywords only.</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>Medical note (short) (optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Example: Carries an EpiPen. Avoid medication X."
              value={medicalShort}
              onChange={(e) => setMedicalShort(e.target.value)}
              disabled={loading}
              maxLength={160}
            />
            <div className={styles.helpText}>
              Max 160 characters ({medicalShort.length}/160).
            </div>
          </div>
        </section>

        {/* Section: Emergency */}
        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>Emergency contact</div>
              <div className={styles.sectionHint}>Used when we need to reach someone quickly.</div>
            </div>
            <span className={styles.iconPill}>🚨</span>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Contact name</label>
              <input
                placeholder="Full name"
                value={emName}
                onChange={(e) => setEmName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label>Phone number</label>
              <input
                placeholder="+47 123 45 678"
                value={emPhone}
                onChange={(e) => setEmPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Relation</label>
            <select value={emRelation} onChange={(e) => setEmRelation(e.target.value as Relation)} disabled={loading}>
              <option value="">Select</option>
              <option value="guardian">Guardian</option>
              <option value="grandparent">Grandparent</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="relative">Relative</option>
              <option value="babysitter">Babysitter</option>
              <option value="other">Other</option>
            </select>
          </div>
        </section>

        {/* Agreement + actions */}
        <section className={styles.footerCard}>
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div>
              <div className={styles.infoText}>
                The profile information will be visible to both parents and changes are recorded.
              </div>
            </div>
          </div>

          <label className={styles.agree}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={loading} />
            <span>I understand this information is shared within my family group.</span>
          </label>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={() => router.back()} disabled={loading}>
              Cancel
            </button>

            <button className={styles.primary} type="submit" disabled={!canSubmit}>
              {loading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}