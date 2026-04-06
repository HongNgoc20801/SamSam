'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './newChild.module.css'
import { ArrowLeft, Plus } from 'lucide-react'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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
type Relation =
  | 'mother'
  | 'father'
  | 'grandparent'
  | 'guardian'
  | 'other'
  | 'relative'
  | 'babysitter'
  | ''

type Phone = { value: string }
type EmergencyContact = {
  name: string
  relation: Relation
  phones: Phone[]
  isPrimary: boolean
}

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

function isValidPhone(v: string) {
  const s = v.trim()
  if (!s) return false
  return /^[+\d\s]{6,}$/.test(s)
}

export default function NewChildPage() {
  const router = useRouter()
  const t = useTranslations()

  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender>('na')
  const [nationalId, setNationalId] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [className, setClassName] = useState('')
  const [mainTeacher, setMainTeacher] = useState('')

  const [bloodType, setBloodType] = useState<(typeof BLOOD_ALL)[number]>('unknown')
  const [allergyText, setAllergyText] = useState('')
  const [conditionsText, setConditionsText] = useState('')
  const [medicalShort, setMedicalShort] = useState('')

  const [gpName, setGpName] = useState('')
  const [gpClinic, setGpClinic] = useState('')
  const [gpPhones, setGpPhones] = useState<Phone[]>([{ value: '' }])

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { name: '', relation: '', phones: [{ value: '' }], isPrimary: true },
  ])

  const [agree, setAgree] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && agree && !loading
  }, [fullName, birthDate, agree, loading])

  const avatarLetter = (fullName.trim()?.[0] ?? 'C').toUpperCase()

  const filePreview = useMemo(() => {
    if (!avatarFile) return ''
    return URL.createObjectURL(avatarFile)
  }, [avatarFile])

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview)
    }
  }, [filePreview])

  const showAvatarImage = !!filePreview

  async function uploadToMedia(file: File) {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t.newChild.uploadImageError)
    return j
  }

  function setPrimaryContact(index: number) {
    setEmergencyContacts((prev) => prev.map((c, i) => ({ ...c, isPrimary: i === index })))
  }

  function addContact() {
    setEmergencyContacts((prev) => [
      ...prev,
      { name: '', relation: '', phones: [{ value: '' }], isPrimary: false },
    ])
  }

  function removeContact(index: number) {
    setEmergencyContacts((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length && !next.some((c) => c.isPrimary)) next[0].isPrimary = true
      return next.length
        ? next
        : [{ name: '', relation: '', phones: [{ value: '' }], isPrimary: true }]
    })
  }

  function addPhoneToContact(contactIndex: number) {
    setEmergencyContacts((prev) =>
      prev.map((c, i) =>
        i === contactIndex ? { ...c, phones: [...c.phones, { value: '' }] } : c,
      ),
    )
  }

  function removePhoneFromContact(contactIndex: number, phoneIndex: number) {
    setEmergencyContacts((prev) =>
      prev.map((c, i) => {
        if (i !== contactIndex) return c
        const phones = c.phones.filter((_, p) => p !== phoneIndex)
        return { ...c, phones: phones.length ? phones : [{ value: '' }] }
      }),
    )
  }

  function addGpPhone() {
    setGpPhones((prev) => [...prev, { value: '' }])
  }

  function removeGpPhone(idx: number) {
    setGpPhones((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  function validateBeforeSubmit(): string | null {
    const cleanNationalId = normalize11Digits(nationalId.trim())
    if (cleanNationalId && !/^\d{11}$/.test(cleanNationalId)) {
      return t.newChild.validationNationalId
    }

    const normalized = emergencyContacts.map((c) => {
      const name = c.name.trim()
      const phones = c.phones.map((p) => p.value.trim()).filter(Boolean)
      return { ...c, name, phones }
    })

    const hasAnyInput = normalized.filter((c) => c.name || c.phones.length)
    if (!hasAnyInput.length) return t.newChild.validationEmergencyRequired

    const allValid = hasAnyInput.every(
      (c) => c.name && c.phones.length && c.phones.every((p) => isValidPhone(p)),
    )
    if (!allValid) return t.newChild.validationEmergencyInvalid

    if (!hasAnyInput.some((c) => c.isPrimary)) return t.newChild.validationPrimaryRequired

    const gpHasAny = gpName.trim() || gpClinic.trim() || gpPhones.some((p) => p.value.trim())
    if (gpHasAny) {
      const ok = gpPhones
        .map((p) => p.value.trim())
        .filter(Boolean)
        .every((p) => isValidPhone(p))
      if (!ok) return t.newChild.validationGpInvalid
    }

    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')

    const preErr = validateBeforeSubmit()
    if (preErr) return setError(preErr)

    setLoading(true)
    try {
      const cleanNationalId = normalize11Digits(nationalId.trim())

      const body: any = {
        fullName: fullName.trim(),
        birthDate,
        gender,
      }

      if (avatarFile) {
        const mediaDoc = await uploadToMedia(avatarFile)
        body.avatar = mediaDoc?.id
      }

      if (cleanNationalId) body.nationalId = cleanNationalId

      if (schoolName.trim() || className.trim() || mainTeacher.trim()) {
        body.school = {
          schoolName: schoolName.trim() || undefined,
          className: className.trim() || undefined,
          mainTeacher: mainTeacher.trim() || undefined,
        }
      }

      const allergies = parseTags(allergyText)
      const conditions = parseTags(conditionsText)
      const notesShort = medicalShort.trim()

      const hasMedical =
        bloodType !== 'unknown' ||
        allergies.length ||
        conditions.length ||
        notesShort ||
        gpName.trim() ||
        gpClinic.trim()

      if (hasMedical) {
        body.medical = {}
        if (bloodType !== 'unknown') body.medical.bloodType = bloodType
        if (allergies.length) body.medical.allergies = allergies
        if (conditions.length) body.medical.conditions = conditions
        if (notesShort) body.medical.notesShort = notesShort.slice(0, 160)

        const gpPhoneClean = gpPhones
          .map((p) => ({ value: p.value.trim() }))
          .filter((p) => p.value)

        if (gpName.trim() || gpClinic.trim() || gpPhoneClean.length) {
          body.medical.gp = {
            name: gpName.trim() || undefined,
            clinic: gpClinic.trim() || undefined,
            phones: gpPhoneClean.length ? gpPhoneClean : undefined,
          }
        }
      }

      const emergencyClean = emergencyContacts
        .map((c) => ({
          name: c.name.trim(),
          relation: c.relation || undefined,
          isPrimary: !!c.isPrimary,
          phones: c.phones.map((p) => ({ value: p.value.trim() })).filter((p) => p.value),
        }))
        .filter((c) => c.name && c.phones.length)

      body.emergencyContacts = emergencyClean

      const res = await fetch('/api/children', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          j?.message ||
          (Array.isArray(j?.errors)
            ? j.errors.map((x: any) => x?.message).filter(Boolean).join(', ')
            : '') ||
          t.newChild.createError
        throw new Error(msg)
      }

      router.push('/child-info')
    } catch (err: any) {
      setError(err?.message || t.newChild.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button
          type="button"
          onClick={() => router.back()}
          className={styles.backBtn}
          aria-label={t.newChild.backAriaLabel}
        >
          <ArrowLeft size={30} strokeWidth={2.5} />
        </button>

        <div className={styles.topbarCenter}>
          <h1 className={styles.topbarTitle}>{t.newChild.pageTitle}</h1>
          <p className={styles.topbarHint}>{t.newChild.pageHint}</p>
        </div>

        <div className={styles.topbarRight} />
      </header>

      <form onSubmit={onSubmit} className={styles.form}>
        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>{t.newChild.basicTitle}</div>
              <div className={styles.sectionHint}>{t.newChild.basicHint}</div>
            </div>
          </div>

          <div className={styles.identityGrid}>
            <div className={styles.avatarBlock}>
              <label className={styles.avatarPicker}>
                <div className={styles.avatarCircle} aria-label={t.newChild.avatarAriaLabel}>
                  {showAvatarImage ? (
                    <img className={styles.avatarImg} src={filePreview} alt="Child avatar" />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{avatarLetter}</div>
                  )}

                  <div className={styles.avatarOverlay}>
                    <div className={styles.avatarOverlayIcon}>📷</div>
                    <div className={styles.avatarOverlayText}>{t.newChild.addPhoto}</div>
                  </div>
                </div>

                <input
                  className={styles.fileInputHidden}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  disabled={loading}
                />
              </label>

              <div className={styles.avatarText}>{t.newChild.avatarHelp}</div>

              {avatarFile ? (
                <button
                  type="button"
                  className={styles.smallDanger}
                  onClick={() => setAvatarFile(null)}
                  disabled={loading}
                >
                  {t.newChild.removePhoto}
                </button>
              ) : null}
            </div>

            <div className={styles.fieldsCol}>
              <div className={styles.field}>
                <label>{t.newChild.fullName}</label>
                <input
                  placeholder={t.newChild.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>{t.newChild.birthDate}</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.field}>
                  <label>{t.newChild.gender}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    disabled={loading}
                  >
                    <option value="na">{t.newChild.genderNa}</option>
                    <option value="male">{t.newChild.genderMale}</option>
                    <option value="female">{t.newChild.genderFemale}</option>
                    <option value="other">{t.newChild.genderOther}</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>{t.newChild.nationalId}</label>
                <input
                  inputMode="numeric"
                  placeholder={t.newChild.nationalIdPlaceholder}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={loading}
                />
                <div className={styles.helpText}>{t.newChild.nationalIdHelp}</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>{t.newChild.schoolTitle}</div>
              <div className={styles.sectionHint}>{t.newChild.schoolHint}</div>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>{t.newChild.schoolName}</label>
              <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} disabled={loading} />
            </div>

            <div className={styles.field}>
              <label>{t.newChild.className}</label>
              <input value={className} onChange={(e) => setClassName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.field}>
            <label>{t.newChild.mainTeacher}</label>
            <input value={mainTeacher} onChange={(e) => setMainTeacher(e.target.value)} disabled={loading} />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>{t.newChild.medicalTitle}</div>
              <div className={styles.sectionHint}>{t.newChild.medicalHint}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>{t.newChild.bloodType}</label>
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
                    {b === 'unknown' ? t.newChild.bloodUnknown : b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>{t.newChild.allergies}</label>
              <input value={allergyText} onChange={(e) => setAllergyText(e.target.value)} disabled={loading} />
              <div className={styles.helpText}>{t.newChild.tagsHelpComma}</div>
            </div>

            <div className={styles.field}>
              <label>{t.newChild.conditions}</label>
              <input value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} disabled={loading} />
              <div className={styles.helpText}>{t.newChild.tagsHelpShort}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label>{t.newChild.medicalShort}</label>
            <textarea
              className={styles.textarea}
              value={medicalShort}
              onChange={(e) => setMedicalShort(e.target.value)}
              disabled={loading}
              maxLength={160}
              placeholder={t.newChild.medicalShortPlaceholder}
            />
            <div className={styles.helpText}>
              {t.newChild.medicalShortHelp} ({medicalShort.length}/160).
            </div>
          </div>

          <div className={styles.divider} />
          <div className={styles.sectionSubTitle}>{t.newChild.gpTitle}</div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label>{t.newChild.doctorName}</label>
              <input value={gpName} onChange={(e) => setGpName(e.target.value)} disabled={loading} />
            </div>

            <div className={styles.field}>
              <label>{t.newChild.clinic}</label>
              <input value={gpClinic} onChange={(e) => setGpClinic(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldRow}>
              <button
                type="button"
                className={styles.iconCircleBtn}
                onClick={addGpPhone}
                disabled={loading}
                aria-label={t.newChild.addPhone}
                title={t.newChild.addPhone}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
              <label>{t.newChild.phoneNumbers}</label>
            </div>

            <div className={styles.phoneList}>
              {gpPhones.map((p, i) => (
                <div key={i} className={styles.phoneRow}>
                  <input
                    placeholder={t.newChild.phoneNumbersPlaceholder}
                    value={p.value}
                    onChange={(e) =>
                      setGpPhones((prev) =>
                        prev.map((x, idx) => (idx === i ? { value: e.target.value } : x)),
                      )
                    }
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => removeGpPhone(i)}
                    disabled={loading || gpPhones.length === 1}
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTop}>
            <div>
              <div className={styles.sectionTitle}>{t.newChild.emergencyTitle}</div>
              <div className={styles.sectionHint}>{t.newChild.emergencyHint}</div>
            </div>
            <span className={styles.iconPill}>!</span>
          </div>

          <div className={styles.stack}>
            {emergencyContacts.map((c, idx) => (
              <div key={idx} className={styles.cardInner}>
                <div className={styles.rowBetween}>
                  <label className={styles.primaryPick}>
                    <input
                      type="radio"
                      name="primaryEmergency"
                      checked={c.isPrimary}
                      onChange={() => setPrimaryContact(idx)}
                      disabled={loading}
                    />
                    <span>{t.newChild.primary}</span>
                  </label>

                  {emergencyContacts.length > 1 ? (
                    <button
                      type="button"
                      className={styles.smallDanger}
                      onClick={() => removeContact(idx)}
                      disabled={loading}
                    >
                      {t.newChild.remove}
                    </button>
                  ) : null}
                </div>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>{t.newChild.contactName}</label>
                    <input
                      value={c.name}
                      onChange={(e) =>
                        setEmergencyContacts((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.field}>
                    <label>{t.newChild.relation}</label>
                    <select
                      value={c.relation}
                      onChange={(e) =>
                        setEmergencyContacts((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, relation: e.target.value as Relation } : x,
                          ),
                        )
                      }
                      disabled={loading}
                    >
                      <option value="">{t.newChild.relationSelect}</option>
                      <option value="guardian">{t.newChild.relationGuardian}</option>
                      <option value="grandparent">{t.newChild.relationGrandparent}</option>
                      <option value="mother">{t.newChild.relationMother}</option>
                      <option value="father">{t.newChild.relationFather}</option>
                      <option value="relative">{t.newChild.relationRelative}</option>
                      <option value="babysitter">{t.newChild.relationBabysitter}</option>
                      <option value="other">{t.newChild.relationOther}</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldRow}>
                    <button
                      type="button"
                      className={styles.iconCircleBtn}
                      onClick={() => addPhoneToContact(idx)}
                      disabled={loading}
                      aria-label={t.newChild.addEmergencyPhone}
                      title={t.newChild.addEmergencyPhone}
                    >
                      <Plus size={18} strokeWidth={2.6} />
                    </button>
                    <label>{t.newChild.addEmergencyPhone}</label>
                  </div>

                  <div className={styles.phoneList}>
                    {c.phones.map((p, pi) => (
                      <div key={pi} className={styles.phoneRow}>
                        <input
                          placeholder={t.newChild.emergencyPhonePlaceholder}
                          value={p.value}
                          onChange={(e) =>
                            setEmergencyContacts((prev) =>
                              prev.map((x, i) => {
                                if (i !== idx) return x
                                const phones = x.phones.map((pp, j) =>
                                  j === pi ? { value: e.target.value } : pp,
                                )
                                return { ...x, phones }
                              }),
                            )
                          }
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className={styles.smallBtn}
                          onClick={() => removePhoneFromContact(idx, pi)}
                          disabled={loading || c.phones.length === 1}
                        >
                          −
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className={styles.smallBtnAdd}
              onClick={addContact}
              disabled={loading}
            >
              {t.newChild.addEmergencyContact}
            </button>
          </div>
        </section>

        <section className={styles.footerCard}>
          <label className={styles.agree}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={loading}
            />
            <span>{t.newChild.agreeText}</span>
          </label>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => router.back()}
              disabled={loading}
            >
              {t.newChild.cancel}
            </button>

            <button className={styles.primary} type="submit" disabled={!canSubmit}>
              {loading ? t.newChild.saving : t.newChild.saveProfile}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}