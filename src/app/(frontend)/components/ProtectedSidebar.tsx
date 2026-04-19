'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from '../(protected)/protectedLayout.module.css'
import Brand from './Brand/Brand'
import CopyButton from '../../(frontend)/components/CopyButton'
import LogoutButton from '../../(frontend)/components/LogoutButton'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

function Icon({
  type,
}: {
  type: 'dash' | 'cal' | 'posts' | 'money' | 'child' | 'profile' | 'settings'
}) {
  const common = { className: styles.icon, viewBox: '0 0 24 24', fill: 'none' as const }

  switch (type) {
    case 'dash':
      return (
        <svg {...common}>
          <path
            d="M4 13h7V4H4v9zM13 20h7V11h-7v9zM4 20h7v-5H4v5zM13 4h7v5h-7V4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )
    case 'cal':
      return (
        <svg {...common}>
          <path
            d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'posts':
      return (
        <svg {...common}>
          <path
            d="M7 7h10M7 11h10M7 15h7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-4 2v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'money':
      return (
        <svg {...common}>
          <path d="M3 7h18v10H3V7z" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7 12h.01M17 12h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )
    case 'child':
      return (
        <svg {...common}>
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 21a8 8 0 0 1 16 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'profile':
      return (
        <svg {...common}>
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M6 21a6 6 0 0 1 12 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.6H11l-.3 2.6a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.9 7.9 0 0 0-.1 1c0 .34.03.67.1 1l-2 1.5 2 3.5 2.4-1c.52.4 1.1.74 1.7 1l.3 2.6h4l.3-2.6c.6-.26 1.18-.6 1.7-1l2.4 1 2-3.5-2-1.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

export default function ProtectedSidebar({
  user,
  inviteCode,
}: {
  user: any
  inviteCode: string | null
}) {
  const pathname = usePathname()
  const t = useTranslations()

  const firstName = user?.firstName ?? '—'
  const lastName = user?.lastName ?? ''
  const role = user?.familyRole ?? '-'
  const email = user?.email ?? '-'

  const links = [
    { href: '/dashboard', label: t.sidebar.dashboard, icon: 'dash' as const },
    { href: '/calendar', label: t.sidebar.calendar, icon: 'cal' as const },
    { href: '/oppdateringer', label: t.sidebar.updates, icon: 'posts' as const },
    { href: '/economy', label: t.sidebar.economy, icon: 'money' as const },
    { href: '/child-info', label: t.sidebar.childInfo, icon: 'child' as const },
    { href: '/audit-logs', label: t.sidebar.history, icon: 'posts' as const },
    { href: '/profile', label: t.sidebar.profile, icon: 'profile' as const },
    { href: '/settings', label: t.sidebar.settings, icon: 'settings' as const },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.brandWrap}>
        <Brand />
      </div>

      <nav className={styles.nav} aria-label={t.sidebar.navAria}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`${styles.navItem} ${isActive(l.href) ? styles.navItemActive : ''}`}
          >
            <Icon type={l.icon} />
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>

      <section className={styles.sidebarCard} aria-label={t.sidebar.inviteCodeTitle}>
        <div className={styles.sectionTitle}>{t.sidebar.inviteCodeTitle}</div>
        {inviteCode ? (
          <div className={styles.inviteRow}>
            <span className={styles.codePill}>{inviteCode}</span>
            <CopyButton value={inviteCode} />
          </div>
        ) : (
          <div className={styles.miniText}>{t.sidebar.noInviteCode}</div>
        )}
      </section>

      <section className={styles.sidebarCard} aria-label={t.sidebar.signedInAs}>
        <div className={styles.sectionTitle}>{t.sidebar.signedInAs}</div>
        <div className={styles.userRow}>
          <div className={styles.avatar} aria-hidden="true">
            {(firstName?.[0] ?? 'U').toUpperCase()}
            {(lastName?.[0] ?? '').toUpperCase()}
          </div>
          <div>
            <div className={styles.userName}>
              {firstName} {lastName}
            </div>
            <div className={styles.miniText}>{role}</div>
            <div className={styles.miniText}>{email}</div>
          </div>
        </div>

        <div className={styles.logoutRow}>
          <LogoutButton />
        </div>
      </section>
    </aside>
  )
}