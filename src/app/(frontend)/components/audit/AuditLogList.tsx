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

type Props = {
  audits: AuditLog[]
  title?: string
  compact?: boolean
  allowFilter?: boolean
  defaultImportantOnly?: boolean
}

export default function AuditLogList({
  audits,
  title = 'Historikk',
  compact = false,
  allowFilter = true,
  defaultImportantOnly = false,
}: Props) {
  const [entityFilter, setEntityFilter] = useState<
    'all' | 'child' | 'document' | 'event' | 'post' | 'other'
  >('all')

  const [importantOnly, setImportantOnly] = useState(defaultImportantOnly)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

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

  return next
}, [audits, entityFilter, importantOnly])

  const groups = useMemo(() => groupAuditLogsByDay(filtered), [filtered])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (groups.length === 0) {
    return <div className={styles.empty}>No activity yet.</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topbar}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {!compact && (
            <p className={styles.subtitle}>
              System recorded activity and changes in the family.
            </p>
          )}
        </div>

        {!compact && (
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{audits.length}</div>
              <div className={styles.statLabel}>Total</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statValue}>
                {audits.filter(isImportantAudit).length}
              </div>
              <div className={styles.statLabel}>Important</div>
            </div>
          </div>
        )}
      </div>

      {allowFilter && !compact && (
        <div className={styles.filters}>
          <label className={styles.filterItem}>
            <span>Type</span>

            <select
              className={styles.select}
              value={entityFilter}
              onChange={(e) =>
                setEntityFilter(
                  e.target.value as
                    | 'all'
                    | 'child'
                    | 'document'
                    | 'event'
                    | 'post'
                    | 'other',
                )
              }
            >
              <option value="all">All</option>
              <option value="child">Child</option>
              <option value="document">Document</option>
              <option value="event">Event</option>
              <option value="post">Post</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
            />
            <span>Important changes only</span>
          </label>
        </div>
      )}

      <div className={styles.groupList}>
        {groups.map((group) => (
          <section key={group.date} className={styles.group}>
            {!compact && (
              <div className={styles.groupTitle}>{formatDayLabel(group.date)}</div>
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
                      <div className={styles.auditSentence}>
                        <strong>{who}</strong> {pretty.sentence}
                        {pretty.target && (
                          <>
                            {' '}
                            <strong>{pretty.target}</strong>
                          </>
                        )}
                      </div>

                      <div className={styles.auditMeta}>
                        <span>{fmtDateTime(a.createdAt)}</span>

                        <span className={styles.dot}>•</span>
                        <span>{entityLabel(a.entityType)}</span>

                        <span className={styles.dot}>•</span>
                        <span>{actionLabel(a.action)}</span>

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
                          {expanded ? 'Hide details' : 'Show details'}
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
    </div>
  )
}