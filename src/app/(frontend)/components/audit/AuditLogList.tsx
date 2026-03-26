'use client'

import { useMemo, useState } from 'react'
import styles from './auditLogList.module.css'
import type { AuditLog } from './auditTypes'

import {
  actionLabel,
  actionTone,
  actorDisplayName,
  auditPretty,
  entityLabel,
  fieldLabel,
  fmtDateTime,
  groupAuditLogsByDay,
  isImportantAudit,
  renderChangeValue,
  getActionIcon,
  formatDayLabel,
} from './auditLogUtils'

type ChildOption = {
  id: string | number
  fullName: string
}

type Props = {
  audits: AuditLog[]
  children?: ChildOption[]
  title?: string
  compact?: boolean
  allowFilter?: boolean
  defaultImportantOnly?: boolean
}

function getAuditChildId(a: AuditLog) {
  const metaChildId = a?.meta?.childId
  if (metaChildId !== undefined && metaChildId !== null && String(metaChildId).trim()) {
    return String(metaChildId)
  }

  const child = a?.child
  if (typeof child === 'string' || typeof child === 'number') {
    return String(child)
  }

  if (child && typeof child === 'object' && child.id !== undefined && child.id !== null) {
    return String(child.id)
  }

  return ''
}

function getAuditChildName(a: AuditLog) {
  const metaChildName = String(a?.meta?.childName || '').trim().toLowerCase()
  if (metaChildName) return metaChildName

  const snapshot = String(a?.childNameSnapshot || '').trim().toLowerCase()
  if (snapshot) return snapshot

  const child = a?.child
  if (child && typeof child === 'object') {
    const fullName = String(child?.fullName || child?.name || '').trim().toLowerCase()
    if (fullName) return fullName
  }

  return ''
}

function matchesSearch(a: AuditLog, q: string) {
  const query = q.trim().toLowerCase()
  if (!query) return true

  const haystack = [
    a.summary,
    a.targetLabel,
    a.actorName,
    a.action,
    a.entityType,
    a.meta?.title,
    a.meta?.documentTitle,
    a.meta?.childName,
    a.childNameSnapshot,
  ]
    .map((v) => String(v || '').toLowerCase())
    .join(' ')

  return haystack.includes(query)
}

export default function AuditLogList({
  audits,
  children = [],
  title = 'Activity timeline',
  compact = false,
  allowFilter = true,
  defaultImportantOnly = false,
}: Props) {
  const [entityFilter, setEntityFilter] = useState<
    'all' | 'document' | 'event' | 'post' | 'other'
  >('all')

  const [childFilter, setChildFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')
  const [importantOnly, setImportantOnly] = useState(defaultImportantOnly)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const showChildFilter = children.length > 1

  const selectedChildName = useMemo(() => {
    if (childFilter === 'all') return ''

    const found = children.find((child) => String(child.id) === String(childFilter))
    return String(found?.fullName || '').trim().toLowerCase()
  }, [childFilter, children])

  const filtered = useMemo(() => {
    let next = [...audits]

    next = next.filter((a) => a.visibleInFamilyTimeline !== false)

    if (importantOnly) {
      next = next.filter(
        (a) =>
          a.severity === 'important' ||
          a.severity === 'critical' ||
          (!a.severity && isImportantAudit(a)),
      )
    }

    if (entityFilter !== 'all') {
      next = next.filter((a) => a.entityType === entityFilter)
    }

    if (childFilter !== 'all') {
      next = next.filter((a) => {
        const auditChildId = getAuditChildId(a)
        const auditChildName = getAuditChildName(a)

        if (auditChildId && String(auditChildId) === String(childFilter)) {
          return true
        }

        if (selectedChildName && auditChildName === selectedChildName) {
          return true
        }

        return false
      })
    }

    if (search.trim()) {
      next = next.filter((a) => matchesSearch(a, search))
    }

    return next
  }, [audits, entityFilter, childFilter, importantOnly, search, selectedChildName])

  const groups = useMemo(() => groupAuditLogsByDay(filtered), [filtered])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className={styles.wrapper}>
      {!compact && (
        <div className={styles.topbar}>
          <div className={styles.topbarText}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>
              Track changes, updates, and important actions in one clean timeline
            </p>
          </div>

          <div className={styles.countBadge}>
            <span>{filtered.length}</span>
            <small>activities</small>
          </div>
        </div>
      )}

      {allowFilter && !compact && (
        <div className={styles.filterCard}>
          <div className={styles.searchRow}>
            <label className={styles.searchField}>
              <span className={styles.filterLabel}>Search</span>
              <input
                className={styles.input}
                type="text"
                placeholder="Search by title, child, actor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.filterRow}>
            <label className={styles.filterItem}>
              <span className={styles.filterLabel}>Type</span>
              <select
                className={styles.select}
                value={entityFilter}
                onChange={(e) =>
                  setEntityFilter(
                    e.target.value as 'all' | 'document' | 'event' | 'post' | 'other',
                  )
                }
              >
                <option value="all">All</option>
                <option value="document">Document</option>
                <option value="event">Event</option>
                <option value="post">Post</option>
                <option value="other">Other</option>
              </select>
            </label>

            {showChildFilter ? (
              <label className={styles.filterItem}>
                <span className={styles.filterLabel}>Child</span>
                <select
                  className={styles.select}
                  value={childFilter}
                  onChange={(e) => setChildFilter(e.target.value)}
                >
                  <option value="all">All children</option>
                  {children.map((child) => (
                    <option key={String(child.id)} value={String(child.id)}>
                      {child.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={styles.checkCard}>
              <input
                type="checkbox"
                checked={importantOnly}
                onChange={(e) => setImportantOnly(e.target.checked)}
              />
              <span>Important only</span>
            </label>
          </div>

          <div className={styles.resultCount}>
            Showing <strong>{filtered.length}</strong> matching activities
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>No activity found</div>
          <div className={styles.emptyText}>Try changing filters or search keywords.</div>
        </div>
      ) : (
        <div className={styles.groupList}>
          {groups.map((group) => (
            <section key={group.date} className={styles.group}>
              {!compact && (
                <div className={styles.groupTitleWrap}>
                  <div className={styles.groupTitle}>{formatDayLabel(group.date)}</div>
                </div>
              )}

              <div className={styles.auditList}>
                {group.items.map((a) => {
                  const Icon = getActionIcon(a.action)
                  const who = actorDisplayName(a)
                  const pretty = auditPretty(a)
                  const changes = Array.isArray(a.changes) ? a.changes : []

                  const expanded = !!expandedIds[String(a.id)]
                  const showExpandButton = changes.length > 0 && !compact

                  return (
                    <div
                      key={String(a.id)}
                      className={`${styles.auditRow} ${
                        styles[`auditRow--${actionTone(a.action)}`] || ''
                      }`}
                    >
                      <div className={styles.auditIcon}>
                        <Icon size={20} strokeWidth={2} />
                      </div>

                      <div className={styles.auditBody}>
                        <div className={styles.auditHeader}>
                          <div className={styles.auditSentence}>
                            <strong>{who}</strong> {pretty.sentence}
                            {pretty.target && (
                              <>
                                {' '}
                                <strong>{pretty.target}</strong>
                              </>
                            )}
                          </div>

                          <span
                            className={`${styles.actionBadge} ${
                              styles[`actionBadge--${actionTone(a.action)}`] || ''
                            }`}
                          >
                            {actionLabel(a.action)}
                          </span>
                        </div>

                        <div className={styles.auditMeta}>
                          <span>{fmtDateTime(a.createdAt)}</span>

                          <span className={styles.dot}>•</span>
                          <span>{entityLabel(a.entityType)}</span>

                          {pretty.sub && (
                            <>
                              <span className={styles.dot}>•</span>
                              <span>{pretty.sub}</span>
                            </>
                          )}
                        </div>

                        {showExpandButton && (
                          <button
                            type="button"
                            className={styles.expandBtn}
                            onClick={() => toggleExpanded(String(a.id))}
                          >
                            {expanded ? 'Hide details' : 'View details'}
                          </button>
                        )}

                        {expanded && changes.length > 0 && (
                          <div className={styles.auditChanges}>
                            {changes.map((c, idx) => (
                              <div
                                key={`${a.id}-change-${idx}`}
                                className={styles.auditChangeRow}
                              >
                                <div className={styles.auditChangeField}>
                                  {fieldLabel(c.field)}
                                </div>

                                <div className={styles.auditChangeValues}>
                                  <span className={styles.auditChangeFrom}>
                                    {renderChangeValue(c.from)}
                                  </span>

                                  <span className={styles.auditChangeArrow}>→</span>

                                  <span className={styles.auditChangeTo}>
                                    {renderChangeValue(c.to)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}