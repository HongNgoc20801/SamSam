'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './newChild.module.css'
import {
  ArrowLeft,
  Contact,
  GraduationCap,
  HeartPulse,
  Plus,
  Trash2,
  User,
} from 'lucide-react'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

const BLOOD_MAIN = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const
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

type StepId = 'basic' | 'school' | 'medical' | 'emergency'
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
  const [medicationsText, setMedicationsText] = useState('')
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
  const [activeStep, setActiveStep] = useState<StepId>('basic')

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && agree && !loading
  }, [fullName, birthDate, agree, loading])

  const completedSteps = useMemo(
    () => ({
      basic: !!fullName.trim() && !!birthDate,
      school: !!schoolName.trim() || !!className.trim() || !!mainTeacher.trim(),
      medical:
        bloodType !== 'unknown' ||
        !!allergyText.trim() ||
        !!conditionsText.trim() ||
        !!medicationsText.trim() ||
        !!medicalShort.trim() ||
        !!gpName.trim() ||
        !!gpClinic.trim() ||
        gpPhones.some((p) => p.value.trim()),
      emergency: emergencyContacts.some(
        (c) => c.name.trim() && c.phones.some((p) => p.value.trim()),
      ),
    }),
    [
      fullName,
      birthDate,
      schoolName,
      className,
      mainTeacher,
      bloodType,
      allergyText,
      conditionsText,
      medicationsText,
      medicalShort,
      gpName,
      gpClinic,
      gpPhones,
      emergencyContacts,
    ],
  )

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

  useEffect(() => {
    const sectionIds: StepId[] = ['basic', 'school', 'medical', 'emergency']

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        const id = visible?.target?.id as StepId | undefined

        if (id && sectionIds.includes(id)) {
          setActiveStep(id)
        }
      },
      {
        threshold: [0.25, 0.4, 0.6],
        rootMargin: '-120px 0px -45% 0px',
      },
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  function getStepClass(step: StepId) {
    return `${styles.stepItem} ${activeStep === step ? styles.stepActive : ''} ${
      completedSteps[step] ? styles.stepDone : ''
    }`
  }

  function getSectionClass(step: StepId) {
    return `${styles.formBlock} ${activeStep === step ? styles.formBlockActive : ''}`
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/child-info')
    }
  }

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

  function removeGpPhone(index: number) {
    setGpPhones((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function validateBeforeSubmit(): string | null {
    const cleanNationalId = normalize11Digits(nationalId.trim())

    if (cleanNationalId && !/^\d{11}$/.test(cleanNationalId)) {
      return t.newChild.validationNationalId
    }

    const normalizedContacts = emergencyContacts.map((c) => {
      const name = c.name.trim()
      const phones = c.phones.map((p) => p.value.trim()).filter(Boolean)
      return { ...c, name, phones }
    })

    const contactsWithInput = normalizedContacts.filter((c) => c.name || c.phones.length)

    if (!contactsWithInput.length) {
      return t.newChild.validationEmergencyRequired
    }

    const emergencyValid = contactsWithInput.every(
      (c) => c.name && c.phones.length && c.phones.every((p) => isValidPhone(p)),
    )

    if (!emergencyValid) {
      return t.newChild.validationEmergencyInvalid
    }

    if (!contactsWithInput.some((c) => c.isPrimary)) {
      return t.newChild.validationPrimaryRequired
    }

    const gpHasAny = gpName.trim() || gpClinic.trim() || gpPhones.some((p) => p.value.trim())

    if (gpHasAny) {
      const gpPhonesValid = gpPhones
        .map((p) => p.value.trim())
        .filter(Boolean)
        .every((p) => isValidPhone(p))

      if (!gpPhonesValid) {
        return t.newChild.validationGpInvalid
      }
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
      const medications = parseTags(medicationsText)
      const notesShort = medicalShort.trim()

      const gpPhoneClean = gpPhones
        .map((p) => ({ value: p.value.trim() }))
        .filter((p) => p.value)

      const hasMedical =
        bloodType !== 'unknown' ||
        allergies.length ||
        conditions.length ||
        medications.length ||
        notesShort ||
        gpName.trim() ||
        gpClinic.trim() ||
        gpPhoneClean.length

      if (hasMedical) {
        body.medical = {}

        if (bloodType !== 'unknown') body.medical.bloodType = bloodType
        if (allergies.length) body.medical.allergies = allergies
        if (conditions.length) body.medical.conditions = conditions
        if (medications.length) body.medical.medications = medications
        if (notesShort) body.medical.notesShort = notesShort.slice(0, 160)

        if (gpName.trim() || gpClinic.trim() || gpPhoneClean.length) {
          body.medical.gp = {
            name: gpName.trim() || undefined,
            clinic: gpClinic.trim() || undefined,
            phones: gpPhoneClean.length ? gpPhoneClean : undefined,
          }
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
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <button
          type="button"
          onClick={goBack}
          className={styles.backBtn}
          aria-label={t.newChild.backAriaLabel}
        >
          <ArrowLeft size={15} />
          <span>{t.newChild.back ?? 'Back to Profile'}</span>
        </button>

        <span className={styles.breadcrumbSlash}>/</span>
        <span className={styles.breadcrumbItem}>Children</span>
        <span className={styles.breadcrumbSep}>›</span>
        <strong className={styles.breadcrumbCurrent}>{t.newChild.pageTitle}</strong>
      </div>

      <div className={styles.pageHero}>
        <h1>{t.newChild.pageTitle}</h1>
        <p>{t.newChild.pageHint}</p>
      </div>

      <aside className={styles.sidePanel}>
        <div className={styles.quickCard}>
          <div className={styles.quickTitle}>Profile progress</div>

          <div className={styles.progressList}>
            <a href="#basic" className={getStepClass('basic')}>
              <span className={styles.stepIcon}>
                <User size={16} />
              </span>
              <span>Basic Info</span>
            </a>

            <a href="#school" className={getStepClass('school')}>
              <span className={styles.stepIcon}>
                <GraduationCap size={16} />
              </span>
              <span>School</span>
            </a>

            <a href="#medical" className={getStepClass('medical')}>
              <span className={styles.stepIcon}>
                <HeartPulse size={16} />
              </span>
              <span>Medical</span>
            </a>

            <a href="#emergency" className={getStepClass('emergency')}>
              <span className={styles.stepIcon}>
                <Contact size={16} />
              </span>
              <span>Emergency</span>
            </a>
          </div>
        </div>
      </aside>

      <form onSubmit={onSubmit} className={styles.content}>
        <section id="basic" className={getSectionClass('basic')}>
          <div className={styles.blockHead}>
            <User size={18} />
            <span>{t.newChild.basicTitle}</span>
          </div>

          <div className={styles.card}>
            <div className={styles.basicGrid}>
              <div className={styles.avatarArea}>
                <label className={styles.avatarPicker}>
                  <div className={styles.avatarCircle} aria-label={t.newChild.avatarAriaLabel}>
                    {filePreview ? (
                      <img className={styles.avatarImg} src={filePreview} alt="Child avatar" />
                    ) : (
                      <>
                        <div className={styles.avatarPlaceholder}>{avatarLetter}</div>
                        <div className={styles.avatarUploadText}>{t.newChild.addPhoto}</div>
                      </>
                    )}
                  </div>

                  <input
                    className={styles.fileInputHidden}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                    disabled={loading}
                  />
                </label>

                <div className={styles.avatarHelp}>{t.newChild.avatarHelp}</div>

                {avatarFile ? (
                  <button
                    type="button"
                    className={styles.linkDanger}
                    onClick={() => setAvatarFile(null)}
                    disabled={loading}
                  >
                    {t.newChild.removePhoto}
                  </button>
                ) : null}
              </div>

              <div className={styles.field}>
                <label>{t.newChild.fullName}</label>
                <input
                  placeholder={t.newChild.fullNamePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label>Nickname</label>
                <input placeholder="e.g. LJ" disabled={loading} />
              </div>

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

              <div className={`${styles.field} ${styles.fullField}`}>
                <label>{t.newChild.nationalId}</label>
                <input
                  inputMode="numeric"
                  placeholder={t.newChild.nationalIdPlaceholder}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={loading}
                />
                <small>{t.newChild.nationalIdHelp}</small>
              </div>
            </div>
          </div>
        </section>

        <section id="school" className={getSectionClass('school')}>
          <div className={styles.blockHead}>
            <GraduationCap size={18} />
            <span>{t.newChild.schoolTitle}</span>
          </div>

          <div className={styles.card}>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label>{t.newChild.schoolName}</label>
                <input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label>{t.newChild.className}</label>
                <input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label>{t.newChild.mainTeacher}</label>
                <input
                  value={mainTeacher}
                  onChange={(e) => setMainTeacher(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="medical" className={getSectionClass('medical')}>
          <div className={styles.blockHead}>
            <HeartPulse size={18} />
            <span>{t.newChild.medicalTitle}</span>
          </div>

          <div className={styles.card}>
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

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>{t.newChild.allergies}</label>
                <input
                  value={allergyText}
                  onChange={(e) => setAllergyText(e.target.value)}
                  disabled={loading}
                />
                <small>{t.newChild.tagsHelpComma}</small>
              </div>

              <div className={styles.field}>
                <label>{t.newChild.conditions}</label>
                <input
                  value={conditionsText}
                  onChange={(e) => setConditionsText(e.target.value)}
                  disabled={loading}
                />
                <small>{t.newChild.tagsHelpShort}</small>
              </div>

              <div className={styles.field}>
                <label>{t.newChild.medications}</label>
                <input
                  value={medicationsText}
                  onChange={(e) => setMedicationsText(e.target.value)}
                  disabled={loading}
                  placeholder={t.newChild.medicationsPlaceholder}
                />
                <small>{t.newChild.tagsHelpComma}</small>
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
              <small>
                {t.newChild.medicalShortHelp} ({medicalShort.length}/160)
              </small>
            </div>

            <div className={styles.divider} />

            <div className={styles.grid3}>
              <div className={styles.field}>
                <label>{t.newChild.doctorName}</label>
                <input
                  value={gpName}
                  onChange={(e) => setGpName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <label>{t.newChild.clinic}</label>
                <input
                  value={gpClinic}
                  onChange={(e) => setGpClinic(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label>{t.newChild.phoneNumbers}</label>
                  <button
                    type="button"
                    className={styles.miniAdd}
                    onClick={addGpPhone}
                    disabled={loading}
                  >
                    <Plus size={14} />
                  </button>
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
                        className={styles.removeBtn}
                        onClick={() => removeGpPhone(i)}
                        disabled={loading || gpPhones.length === 1}
                      >
                        −
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="emergency" className={getSectionClass('emergency')}>
          <div className={styles.blockHeadRow}>
            <div className={styles.blockHead}>
              <Contact size={18} />
              <span>{t.newChild.emergencyTitle}</span>
            </div>

            <button
              type="button"
              className={styles.addContactBtn}
              onClick={addContact}
              disabled={loading}
            >
              <Plus size={15} />
              {t.newChild.addEmergencyContact}
            </button>
          </div>

          <div className={styles.contactGrid}>
            {emergencyContacts.map((c, idx) => (
              <div
                key={idx}
                className={`${styles.contactCard} ${c.isPrimary ? styles.primaryContactCard : ''}`}
              >
                <div className={styles.contactTop}>
                  <label className={styles.primaryPick}>
                    <input
                      type="radio"
                      name="primaryEmergency"
                      checked={c.isPrimary}
                      onChange={() => setPrimaryContact(idx)}
                      disabled={loading}
                    />
                    <span>{c.isPrimary ? t.newChild.primary : 'Secondary contact'}</span>
                  </label>

                  {emergencyContacts.length > 1 ? (
                    <button
                      type="button"
                      className={styles.trashBtn}
                      onClick={() => removeContact(idx)}
                      disabled={loading}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>

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

                <div className={styles.grid2}>
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

                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label>{t.newChild.phoneNumbers}</label>
                      <button
                        type="button"
                        className={styles.miniAdd}
                        onClick={() => addPhoneToContact(idx)}
                        disabled={loading}
                      >
                        <Plus size={14} />
                      </button>
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
                            className={styles.removeBtn}
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
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
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
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={goBack}
              disabled={loading}
            >
              {t.newChild.cancel}
            </button>

            <button className={styles.primary} type="submit" disabled={!canSubmit}>
              {loading ? t.newChild.saving : t.newChild.saveProfile}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}