import styles from './childDetail.module.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'

type Child = {
  id: string
  fullName: string
  birthDate: string
  status?: 'pending' | 'confirmed' | string
  createdBy?: any
  confirmedBy?: any
  confirmedAt?: string | null
}

function calcAge(birthDate: string) {
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function formatBirth(birthDate: string) {
  const s = String(birthDate || '').slice(0, 10)
  return s || '—'
}

function formatConfirmedAt(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const res = await serverFetch(`/api/children/${id}`)
  if (!res.ok) return notFound()

  const child: Child | null = await res.json().catch(() => null)
  if (!child?.id) return notFound()

  const age = calcAge(child.birthDate)
  const status = child.status || 'pending'
  const confirmedAtText = formatConfirmedAt(child.confirmedAt)

  // Mock UI data giữ nguyên
  const topChildren = [
    { id: child.id, name: child.fullName.split(' ').slice(-1)[0] ?? 'An', active: true },
    { id: 'mock-2', name: 'Linh', active: false },
    { id: 'mock-3', name: 'Tùng', active: false },
  ]

  const quickChips = [
    { label: 'Nhóm 0+', tone: 'danger' as const },
    { label: 'Dị ứng Lạc', tone: 'warning' as const },
  ]

  const recentDocs = [
    { id: 'd1', title: 'Giấy khai sinh.pdf', meta: '2.4 MB • 12/10/2023 • ME', type: 'pdf' as const },
    { id: 'd2', title: 'Bảo hiểm y tế.jpg', meta: '1.8 MB • 15/01/2024 • Bố', type: 'img' as const },
    { id: 'd3', title: 'Sổ tiêm chủng.pdf', meta: '5.1 MB • 20/02/2024 • ME', type: 'pdf' as const },
  ]

  const categories = [
    { id: 'c1', title: 'Học bạ', sub: '4 tài liệu', icon: 'folder' as const },
    { id: 'c2', title: 'Sức khoẻ', sub: '12 tài liệu', icon: 'heart' as const },
    { id: 'c3', title: 'Giấy tờ tuỳ thân', sub: '2 tài liệu', icon: 'id' as const },
    { id: 'c4', title: 'Khác', sub: '0 tài liệu', icon: 'dots' as const },
  ]

  return (
    <div className={styles.screen}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <Link href="/child-info" className={styles.backBtn} aria-label="Tilbake">
            ←
          </Link>
          <div className={styles.topbarTitle}>Hồ sơ con</div>
        </div>
        <button className={styles.iconBtn} aria-label="Settings">
          ⚙
        </button>
      </header>

      {/* Horizontal child selector */}
      <section className={styles.childStrip} aria-label="Children">
        {topChildren.map((c) => (
          <div key={c.id} className={`${styles.childPill} ${c.active ? styles.childPillActive : ''}`}>
            <div className={styles.childAvatarSmall} aria-hidden="true">
              {c.name.slice(0, 1).toUpperCase()}
            </div>
            <div className={styles.childNameSmall}>{c.name}</div>
          </div>
        ))}
        <button className={styles.addChildBtn} aria-label="Add child">
          +
        </button>
      </section>

      {/* Profile hero */}
      <section className={styles.hero} aria-label="Child profile">
        <div className={styles.avatarWrap}>
          <div className={styles.avatarLarge} aria-hidden="true">
            {(child.fullName?.[0] ?? 'C').toUpperCase()}
          </div>
          <span className={styles.onlineDot} aria-hidden="true" />
        </div>

        <div className={styles.heroName}>{child.fullName}</div>

        {/* STATUS */}
        <div className={styles.heroStatusRow}>
          {status === 'pending' ? (
            <span className={styles.statusPillPending}>⏳ Pending confirmation</span>
          ) : (
            <span className={styles.statusPillConfirmed}>✅ Confirmed</span>
          )}

          {status === 'confirmed' && confirmedAtText ? (
            <span className={styles.confirmedMeta}>Confirmed at {confirmedAtText}</span>
          ) : null}
        </div>

        <div className={styles.heroMeta}>
          {age !== null ? `${age} Tuổi` : '—'} • Sinh {formatBirth(child.birthDate)} • Lớp 3A
        </div>

        {/* CONFIRM BUTTON (client component) */}
        <ConfirmChildButton childId={child.id} status={status} createdBy={child.createdBy} />

        <div className={styles.chipsRow} aria-label="Highlights">
          {quickChips.map((chip) => (
            <span
              key={chip.label}
              className={`${styles.chip} ${chip.tone === 'danger' ? styles.chipDanger : styles.chipWarning}`}
            >
              {chip.label}
            </span>
          ))}
          <span className={`${styles.chip} ${styles.chipPrimary}`}>Khẩn cấp</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Profile tabs">
          <button className={styles.tabBtn} role="tab" aria-selected="false">
            Y tế
          </button>
          <button className={styles.tabBtn} role="tab" aria-selected="false">
            Học tập
          </button>
          <button className={`${styles.tabBtn} ${styles.tabBtnActive}`} role="tab" aria-selected="true">
            Tài liệu
          </button>
        </div>
      </section>

      {/* Recent */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Gần đây</div>
          <button className={styles.linkBtn}>Xem tất cả</button>
        </div>

        <div className={styles.cardList}>
          {recentDocs.map((d) => (
            <div key={d.id} className={styles.docCard}>
              <div className={`${styles.docIcon} ${d.type === 'pdf' ? styles.docPdf : styles.docImg}`}>
                {d.type === 'pdf' ? 'PDF' : 'IMG'}
              </div>
              <div className={styles.docBody}>
                <div className={styles.docTitle}>{d.title}</div>
                <div className={styles.docMeta}>{d.meta}</div>
              </div>
              <button className={styles.moreBtn} aria-label="More">
                ⋯
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Danh mục</div>

        <div className={styles.grid}>
          {categories.map((c) => (
            <button key={c.id} className={styles.gridCard}>
              <div className={styles.gridIcon} aria-hidden="true">
                {c.icon === 'folder' ? '📁' : c.icon === 'heart' ? '❤️' : c.icon === 'id' ? '🪪' : '⋯'}
              </div>
              <div className={styles.gridTitle}>{c.title}</div>
              <div className={styles.gridSub}>{c.sub}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Floating Action Button */}
      <button className={styles.fab} aria-label="Add document">
        +
      </button>
    </div>
  )
}