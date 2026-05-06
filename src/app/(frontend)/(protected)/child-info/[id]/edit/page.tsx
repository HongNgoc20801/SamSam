'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './editChild.module.css'
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  UserRound,
  School,
  HeartPulse,
  Phone,
  CircleCheck,
} from 'lucide-react'
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
type ProfileStatus = 'active' | 'inactive' | 'archived'

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

function stringifyTags(arr?: { value: string }[]) {
  if (!Array.isArray(arr)) return ''
  return arr
    .map((x) => String(x?.value || '').trim())
    .filter(Boolean)
    .join(', ')
}

function isValidPhone(v: string) {
  const s = v.trim()
  if (!s) return false
  return /^[+\d\s]{6,}$/.test(s)
}

function normalizeMediaUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

function getAvatarUrl(avatar: any): string {
  if (!avatar || typeof avatar === 'string') return ''

  if (typeof avatar.url === 'string' && avatar.url.trim()) {
    return normalizeMediaUrl(avatar.url)
  }

  if (typeof avatar.thumbnailURL === 'string' && avatar.thumbnailURL.trim()) {
    return normalizeMediaUrl(avatar.thumbnailURL)
  }

  if (typeof avatar?.sizes?.thumbnail?.url === 'string' && avatar.sizes.thumbnail.url.trim()) {
    return normalizeMediaUrl(avatar.sizes.thumbnail.url)
  }

  if (typeof avatar.filename === 'string' && avatar.filename.trim()) {
    return `/api/media/file/${avatar.filename}`
  }

  return ''
}

export default function EditChildPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || '')

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'pending' | 'confirmed' | string>('pending')
  const [activeSection, setActiveSection] = useState('profile-status')

  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('active')
  const [profileStatusReason, setProfileStatusReason] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [existingAvatarUrl, setExistingAvatarUrl] = useState('')
  const [filePreview, setFilePreview] = useState('')

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
  const [medicationsText, setMedicationsText] = useState('')
  const [medicalShort, setMedicalShort] = useState('')

  const [gpName, setGpName] = useState('')
  const [gpClinic, setGpClinic] = useState('')
  const [gpPhones, setGpPhones] = useState<Phone[]>([{ value: '' }])

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { name: '', relation: '', phones: [{ value: '' }], isPrimary: true },
  ])

  useEffect(() => {
    if (!id) return

    let ignore = false

    ;(async () => {
      try {
        setInitialLoading(true)
        setError('')

        const res = await fetch(`/api/children/${id}?depth=1`, {
          credentials: 'include',
          cache: 'no-store',
        })

        const j = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(j?.message || t.editChild.loadError)
        }

        if (ignore) return

        setStatus(j?.status || 'pending')

        setProfileStatus(
          j?.profileStatus === 'inactive' || j?.profileStatus === 'archived'
            ? j.profileStatus
            : 'active',
        )

        setProfileStatusReason(j?.profileStatusReason || '')
        setFullName(j?.fullName || '')
        setBirthDate(j?.birthDate ? String(j.birthDate).slice(0, 10) : '')
        setGender((j?.gender || 'na') as Gender)
        setNationalId(j?.nationalId || '')

        setSchoolName(j?.school?.schoolName || '')
        setClassName(j?.school?.className || '')
        setMainTeacher(j?.school?.mainTeacher || '')

        setBloodType((j?.medical?.bloodType || 'unknown') as (typeof BLOOD_ALL)[number])
        setAllergyText(stringifyTags(j?.medical?.allergies))
        setConditionsText(stringifyTags(j?.medical?.conditions))
        setMedicationsText(stringifyTags(j?.medical?.medications))
        setMedicalShort(j?.medical?.notesShort || '')

        setGpName(j?.medical?.gp?.name || '')
        setGpClinic(j?.medical?.gp?.clinic || '')
        setGpPhones(
          Array.isArray(j?.medical?.gp?.phones) && j.medical.gp.phones.length
            ? j.medical.gp.phones.map((p: any) => ({ value: String(p?.value || '') }))
            : [{ value: '' }],
        )

        setEmergencyContacts(
          Array.isArray(j?.emergencyContacts) && j.emergencyContacts.length
            ? j.emergencyContacts.map((c: any) => ({
                name: c?.name || '',
                relation: (c?.relation || '') as Relation,
                isPrimary: !!c?.isPrimary,
                phones:
                  Array.isArray(c?.phones) && c.phones.length
                    ? c.phones.map((p: any) => ({ value: String(p?.value || '') }))
                    : [{ value: '' }],
              }))
            : [{ name: '', relation: '', phones: [{ value: '' }], isPrimary: true }],
        )

        setExistingAvatarUrl(getAvatarUrl(j?.avatar))
      } catch (e: any) {
        if (!ignore) setError(e?.message || t.editChild.loadError)
      } finally {
        if (!ignore) setInitialLoading(false)
      }
    })()

    return () => {
      ignore = true
    }
  }, [id, t.editChild.loadError])

  useEffect(() => {
    if (!avatarFile) {
      setFilePreview('')
      return
    }

    const objectUrl = URL.createObjectURL(avatarFile)
    setFilePreview(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [avatarFile])

  useEffect(() => {
    if (initialLoading) return

    const sectionIds = [
      'profile-status',
      'basic-info',
      'school-info',
      'medical-info',
      'emergency-info',
    ]

    const sections = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter(Boolean) as HTMLElement[]

    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target?.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        root: null,
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [initialLoading])

  const avatarLetter = (fullName.trim()?.[0] ?? 'C').toUpperCase()
  const avatarSrc = filePreview || existingAvatarUrl || ''

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && !loading && !initialLoading
  }, [fullName, birthDate, loading, initialLoading])

  async function uploadToMedia(file: File) {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || t.editChild.uploadImageError)

    return j?.doc || j
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

      if (next.length && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true
      }

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
      return t.editChild.validationNationalId
    }

    const normalized = emergencyContacts.map((c) => {
      const name = c.name.trim()
      const phones = c.phones.map((p) => p.value.trim()).filter(Boolean)
      return { ...c, name, phones }
    })

    const hasAnyInput = normalized.filter((c) => c.name || c.phones.length)

    if (!hasAnyInput.length) return t.editChild.validationEmergencyRequired

    const allValid = hasAnyInput.every(
      (c) => c.name && c.phones.length && c.phones.every((p) => isValidPhone(p)),
    )

    if (!allValid) return t.editChild.validationEmergencyInvalid

    if (!hasAnyInput.some((c) => c.isPrimary)) {
      return t.editChild.validationPrimaryRequired
    }

    const gpHasAny = gpName.trim() || gpClinic.trim() || gpPhones.some((p) => p.value.trim())

    if (gpHasAny) {
      const ok = gpPhones
        .map((p) => p.value.trim())
        .filter(Boolean)
        .every((p) => isValidPhone(p))

      if (!ok) return t.editChild.validationGpInvalid
    }

    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setError('')

    const preErr = validateBeforeSubmit()
    if (preErr) {
      setError(preErr)
      return
    }

    setLoading(true)

    try {
      const cleanNationalId = normalize11Digits(nationalId.trim())

      const body: any = {
        fullName: fullName.trim(),
        birthDate,
        gender,
        nationalId: cleanNationalId || '',
        profileStatus,
        profileStatusReason: profileStatusReason.trim() || undefined,
      }

      if (avatarFile) {
        const mediaDoc = await uploadToMedia(avatarFile)
        body.avatar = mediaDoc?.id
      }

      body.school = {
        schoolName: schoolName.trim() || undefined,
        className: className.trim() || undefined,
        mainTeacher: mainTeacher.trim() || undefined,
      }

      const allergies = parseTags(allergyText)
      const conditions = parseTags(conditionsText)
      const medications = parseTags(medicationsText)
      const notesShort = medicalShort.trim()

      body.medical = {
        bloodType,
        allergies,
        conditions,
        medications,
        notesShort: notesShort ? notesShort.slice(0, 160) : undefined,
      }

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

      body.emergencyContacts = emergencyContacts
        .map((c) => ({
          name: c.name.trim(),
          relation: c.relation || undefined,
          isPrimary: !!c.isPrimary,
          phones: c.phones.map((p) => ({ value: p.value.trim() })).filter((p) => p.value),
        }))
        .filter((c) => c.name && c.phones.length)

      const res = await fetch(`/api/children/${id}`, {
        method: 'PATCH',
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
          t.editChild.updateError

        throw new Error(msg)
      }

      router.push(`/child-info/${id}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || t.editChild.unknownError)
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return <div className={styles.loadingScreen}>{t.editChild.loadingProfile}</div>
  }

  return (
    <div className={styles.screen}>
      <div className={styles.pageShell}>
        <aside className={styles.progressPanel}>
          <div className={styles.breadcrumb}>
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back()
                } else {
                  router.push(`/child-info/${id}`)
                }
              }}
              className={styles.backBtn}
            >
              <ArrowLeft size={15} />
              <span>{t.editChild.back ?? 'Back to Profile'}</span>
            </button>

            <span className={styles.breadcrumbSlash}>/</span>
            <span className={styles.breadcrumbItem}>Children</span>
            <span className={styles.breadcrumbSep}>›</span>
            <span className={styles.breadcrumbItem}>{fullName || 'Child'}</span>
            <span className={styles.breadcrumbSep}>›</span>
            <strong className={styles.breadcrumbCurrent}>Edit Profile</strong>
          </div>

          <div className={styles.progressOffset}>
            <div className={styles.progressCard}>
              <div className={styles.progressTitle}>Profile progress</div>

              <a
                href="#profile-status"
                className={`${styles.progressItem} ${
                  activeSection === 'profile-status' ? styles.progressItemActive : ''
                }`}
              >
                <CircleCheck size={18} />
                <span>Profile status</span>
              </a>

              <a
                href="#basic-info"
                className={`${styles.progressItem} ${
                  activeSection === 'basic-info' ? styles.progressItemActive : ''
                }`}
              >
                <UserRound size={18} />
                <span>{t.editChild.basicTitle}</span>
              </a>

              <a
                href="#school-info"
                className={`${styles.progressItem} ${
                  activeSection === 'school-info' ? styles.progressItemActive : ''
                }`}
              >
                <School size={18} />
                <span>{t.editChild.schoolTitle}</span>
              </a>

              <a
                href="#medical-info"
                className={`${styles.progressItem} ${
                  activeSection === 'medical-info' ? styles.progressItemActive : ''
                }`}
              >
                <HeartPulse size={18} />
                <span>{t.editChild.medicalTitle}</span>
              </a>

              <a
                href="#emergency-info"
                className={`${styles.progressItem} ${
                  activeSection === 'emergency-info' ? styles.progressItemActive : ''
                }`}
              >
                <Phone size={18} />
                <span>{t.editChild.emergencyTitle}</span>
              </a>
            </div>
          </div>
        </aside>

        <main className={styles.mainCol}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{t.editChild.pageTitle}</h1>
            <p className={styles.pageHint}>{t.editChild.pageHint}</p>
          </header>

          <form onSubmit={onSubmit} className={styles.form}>
            {status === 'confirmed' ? (
              <section className={styles.warningBox}>
                <div className={styles.warningTop}>
                  <AlertTriangle size={18} />
                  <strong>{t.editChild.warningTitle}</strong>
                </div>
                <div className={styles.warningText}>{t.editChild.warningText}</div>
              </section>
            ) : null}

            <section id="profile-status" className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <div className={styles.sectionTitle}>Profile status</div>
                  <div className={styles.sectionHint}>
                    Velg om barneprofilen skal være aktiv, inaktiv eller arkivert.
                  </div>
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Status</label>
                  <select
                    value={profileStatus}
                    onChange={(e) => setProfileStatus(e.target.value as ProfileStatus)}
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Reason</label>
                  <input
                    value={profileStatusReason}
                    onChange={(e) => setProfileStatusReason(e.target.value)}
                    disabled={loading}
                    placeholder="Optional reason"
                    maxLength={160}
                  />
                </div>
              </div>
            </section>

            {profileStatus === 'archived' ? (
              <section className={styles.warningBox}>
                <div className={styles.warningTop}>
                  <AlertTriangle size={18} />
                  <strong>Archive profile</strong>
                </div>
                <div className={styles.warningText}>
                  Archived child profiles are kept for history and documentation, but should not be
                  used for the daily co-parenting workflow.
                </div>
              </section>
            ) : null}

            <section id="basic-info" className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <div className={styles.sectionTitle}>{t.editChild.basicTitle}</div>
                  <div className={styles.sectionHint}>{t.editChild.basicHint}</div>
                </div>
              </div>

              <div className={styles.identityGrid}>
                <div className={styles.avatarBlock}>
                  <label className={styles.avatarPicker}>
                    <div className={styles.avatarCircle}>
                      {avatarSrc ? (
                        <img
                          className={styles.avatarImg}
                          src={avatarSrc}
                          alt={t.editChild.avatarAlt}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>{avatarLetter}</div>
                      )}

                      <div className={styles.avatarOverlay}>
                        <div className={styles.avatarOverlayIcon}>📷</div>
                        <div className={styles.avatarOverlayText}>{t.editChild.changePhoto}</div>
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

                  <div className={styles.avatarText}>{t.editChild.avatarHelp}</div>

                  {avatarFile ? (
                    <button
                      type="button"
                      className={styles.smallDanger}
                      onClick={() => setAvatarFile(null)}
                      disabled={loading}
                    >
                      {t.editChild.removeNewPhoto}
                    </button>
                  ) : null}
                </div>

                <div className={styles.fieldsCol}>
                  <div className={styles.field}>
                    <label>{t.editChild.fullName}</label>
                    <input
                      placeholder={t.editChild.fullNamePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label>{t.editChild.birthDate}</label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className={styles.field}>
                      <label>{t.editChild.gender}</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as Gender)}
                        disabled={loading}
                      >
                        <option value="na">{t.editChild.genderNa}</option>
                        <option value="male">{t.editChild.genderMale}</option>
                        <option value="female">{t.editChild.genderFemale}</option>
                        <option value="other">{t.editChild.genderOther}</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>{t.editChild.nationalId}</label>
                    <input
                      inputMode="numeric"
                      placeholder={t.editChild.nationalIdPlaceholder}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      disabled={loading}
                    />
                    <div className={styles.helpText}>{t.editChild.nationalIdHelp}</div>
                  </div>
                </div>
              </div>
            </section>

            <section id="school-info" className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <div className={styles.sectionTitle}>{t.editChild.schoolTitle}</div>
                  <div className={styles.sectionHint}>{t.editChild.schoolHint}</div>
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>{t.editChild.schoolName}</label>
                  <input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.field}>
                  <label>{t.editChild.className}</label>
                  <input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>{t.editChild.mainTeacher}</label>
                <input
                  value={mainTeacher}
                  onChange={(e) => setMainTeacher(e.target.value)}
                  disabled={loading}
                />
              </div>
            </section>

            <section id="medical-info" className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <div className={styles.sectionTitle}>{t.editChild.medicalTitle}</div>
                  <div className={styles.sectionHint}>{t.editChild.medicalHint}</div>
                </div>
              </div>

              <div className={styles.field}>
                <label>{t.editChild.bloodType}</label>

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
                        {b === 'unknown' ? t.editChild.bloodUnknown : b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>{t.editChild.allergies}</label>
                  <input
                    value={allergyText}
                    onChange={(e) => setAllergyText(e.target.value)}
                    disabled={loading}
                  />
                  <div className={styles.helpText}>{t.editChild.tagsHelpComma}</div>
                </div>

                <div className={styles.field}>
                  <label>{t.editChild.conditions}</label>
                  <input
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    disabled={loading}
                  />
                  <div className={styles.helpText}>{t.editChild.tagsHelpShort}</div>
                </div>

                <div className={styles.field}>
                  <label>{t.editChild.medications}</label>
                  <input
                    value={medicationsText}
                    onChange={(e) => setMedicationsText(e.target.value)}
                    disabled={loading}
                    placeholder={t.editChild.medicationsPlaceholder}
                  />
                  <div className={styles.helpText}>{t.editChild.tagsHelpComma}</div>
                </div>
              </div>

              <div className={styles.field}>
                <label>{t.editChild.medicalShort}</label>
                <textarea
                  className={styles.textarea}
                  value={medicalShort}
                  onChange={(e) => setMedicalShort(e.target.value)}
                  disabled={loading}
                  maxLength={160}
                  placeholder={t.editChild.medicalShortPlaceholder}
                />
                <div className={styles.helpText}>
                  {t.editChild.medicalShortHelp} ({medicalShort.length}/160)
                </div>
              </div>

              <div className={styles.divider} />
              <div className={styles.sectionSubTitle}>{t.editChild.gpTitle}</div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>{t.editChild.doctorName}</label>
                  <input
                    value={gpName}
                    onChange={(e) => setGpName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.field}>
                  <label>{t.editChild.clinic}</label>
                  <input
                    value={gpClinic}
                    onChange={(e) => setGpClinic(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldRow}>
                  <button
                    type="button"
                    className={styles.iconCircleBtn}
                    onClick={addGpPhone}
                    disabled={loading}
                    aria-label={t.editChild.addPhone}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                  <label>{t.editChild.phoneNumbers}</label>
                </div>

                <div className={styles.phoneList}>
                  {gpPhones.map((p, i) => (
                    <div key={i} className={styles.phoneRow}>
                      <input
                        placeholder={t.editChild.phoneNumbersPlaceholder}
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

            <section id="emergency-info" className={styles.section}>
              <div className={styles.sectionTop}>
                <div>
                  <div className={styles.sectionTitle}>{t.editChild.emergencyTitle}</div>
                  <div className={styles.sectionHint}>{t.editChild.emergencyHint}</div>
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
                        <span>{t.editChild.primary}</span>
                      </label>

                      {emergencyContacts.length > 1 ? (
                        <button
                          type="button"
                          className={styles.smallDanger}
                          onClick={() => removeContact(idx)}
                          disabled={loading}
                        >
                          {t.editChild.remove}
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.row2}>
                      <div className={styles.field}>
                        <label>{t.editChild.contactName}</label>
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
                        <label>{t.editChild.relation}</label>
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
                          <option value="">{t.editChild.relationSelect}</option>
                          <option value="guardian">{t.editChild.relationGuardian}</option>
                          <option value="grandparent">{t.editChild.relationGrandparent}</option>
                          <option value="mother">{t.editChild.relationMother}</option>
                          <option value="father">{t.editChild.relationFather}</option>
                          <option value="relative">{t.editChild.relationRelative}</option>
                          <option value="babysitter">{t.editChild.relationBabysitter}</option>
                          <option value="other">{t.editChild.relationOther}</option>
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
                          aria-label={t.editChild.addPhone}
                        >
                          <Plus size={18} strokeWidth={2.6} />
                        </button>

                        <label>{t.editChild.phoneNumbers}</label>
                      </div>

                      <div className={styles.phoneList}>
                        {c.phones.map((p, pi) => (
                          <div key={pi} className={styles.phoneRow}>
                            <input
                              placeholder={t.editChild.emergencyPhonePlaceholder}
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
                  {t.editChild.addEmergencyContact}
                </button>
              </div>
            </section>

            <section className={styles.footerCard}>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => router.push(`/child-info/${id}`)}
                  disabled={loading}
                >
                  {t.editChild.cancel}
                </button>

                <button className={styles.primary} type="submit" disabled={!canSubmit}>
                  {loading ? t.editChild.saving : t.editChild.saveChanges}
                </button>
              </div>
            </section>
          </form>
        </main>
      </div>
    </div>
  )
}