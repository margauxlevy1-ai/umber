import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'
import { num, space as spaceOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { Notification } from '../lib/types'
import { Avatar, useToast } from '../components/ui'

const KIND = {
  mention: 'te mentionne',
  assigned: 'te confie une tâche',
  comment: 'a commenté ta tâche',
}

export function InboxList({ items, compact }: { items: Notification[]; compact?: boolean }) {
  const { person, projects, refreshInbox } = useStore()
  const nav = useNavigate()
  if (items.length === 0) return <div className="sub" style={{ padding: '10px 16px 16px' }}>Rien de nouveau.</div>
  return (
    <div>
      {items.map((n) => {
        const a = person(n.actor_id)
        const p = projects.find((x) => x.id === n.project_id)
        const sp = n.space ? spaceOf(n.space) : null
        return (
          <button
            key={n.id}
            className={'it' + (n.read_at ? '' : ' unread')}
            onClick={async () => {
              if (!n.read_at) {
                await api.markRead([n.id]).catch(() => {})
                refreshInbox()
              }
              if (n.project_id && n.space) nav(`/projets/${n.project_id}/espaces/${n.space}${n.task_id ? `?tache=${n.task_id}` : '?vue=discussion'}`)
            }}
          >
            <Avatar p={a} lg />
            <span style={{ minWidth: 0 }}>
              <b>{a?.full_name.split(' ')[0] ?? 'Quelqu’un'}</b> {KIND[n.kind]}
              {!compact && p && sp && <span className="sub"> · {p.name}, <span style={{ color: sp.color }}>{num(sp.n)} {sp.name}</span></span>}
              <span className="ex2" style={{ display: '-webkit-box' }}>{n.excerpt}</span>
            </span>
            <span className="tm">{timeAgo(n.created_at)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Inbox() {
  const { notifications, refreshInbox } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState<'all' | 'unread' | 'mention' | 'assigned'>('all')
  const items = notifications.filter((n) =>
    tab === 'all' ? true : tab === 'unread' ? !n.read_at : tab === 'mention' ? n.kind === 'mention' : n.kind === 'assigned',
  )
  const unread = notifications.filter((n) => !n.read_at)
  return (
    <>
      <div className="head">
        <div><div className="crumbs">Ta boîte</div><h1>Boîte de réception</h1></div>
        {unread.length > 0 && (
          <button className="btn" onClick={async () => {
            try { await api.markRead(unread.map((n) => n.id)); await refreshInbox() } catch (e) { toast.fail(e) }
          }}>Tout marquer comme lu</button>
        )}
      </div>
      <div className="card flush">
        <div className="tabs">
          {([['all', 'Tout'], ['unread', `Non lus (${unread.length})`], ['mention', 'Mentions'], ['assigned', 'Tâches confiées']] as const).map(([k, l]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <InboxList items={items} />
      </div>
    </>
  )
}
