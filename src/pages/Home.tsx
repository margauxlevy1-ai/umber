import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { countdown, daysUntil, firstName, isLate, shortDate, today } from '../lib/format'
import { num, space as spaceOf, statusOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { Task } from '../lib/types'
import { TaskDrawer } from '../components/Tasks'
import { useToast } from '../components/ui'
import { InboxList } from './Inbox'

export function Home() {
  const { me, projects, clients, notifications, staff } = useStore()
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [open, setOpen] = useState<Task | null>(null)

  const load = () => api.listTasks({}).then(setTasks).catch(toast.fail)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = projects.filter((p) => p.status !== 'termine')
  const upcoming = active.filter((p) => (daysUntil(p.event_date) ?? 9999) >= 0).slice(0, 6)
  const mine = (tasks ?? []).filter((t) => t.assignee_id === me?.id && t.status !== 'done')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const late = (tasks ?? []).filter((t) => isLate(t.due_date, t.status === 'done'))
  const toValidate = (tasks ?? []).filter((t) => t.status === 'review')
  const week = (tasks ?? []).filter((t) => t.status !== 'done' && t.due_date && t.due_date >= today() && (daysUntil(t.due_date) ?? 99) <= 7)
  const unread = notifications.filter((n) => !n.read_at)
  const hour = new Date().getHours()

  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{hour < 18 ? 'Bonjour' : 'Bonsoir'} {me ? firstName(me.full_name) : ''}</h1>
        </div>
      </div>

      <div className="stats">
        <div className="card stat"><div className="k">Projets en cours</div><div className="v">{active.length}</div><div className="sub">{clients.length} client{clients.length > 1 ? 's' : ''}</div></div>
        <div className="card stat"><div className="k">Mes tâches ouvertes</div><div className="v">{tasks ? mine.length : '…'}</div><div className="sub">{week.filter((t) => t.assignee_id === me?.id).length} cette semaine</div></div>
        <div className="card stat"><div className="k">En retard</div><div className="v" style={{ color: late.length ? 'var(--late)' : undefined }}>{tasks ? late.length : '…'}</div><div className="sub">{staff ? 'sur tous les projets' : 'dans tes espaces'}</div></div>
        <div className="card stat"><div className="k">À valider</div><div className="v">{tasks ? toValidate.length : '…'}</div><div className="sub">{unread.length} message{unread.length > 1 ? 's' : ''} non lu{unread.length > 1 ? 's' : ''}</div></div>
      </div>

      <div className="cols">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <div className="row between" style={{ marginBottom: 6 }}>
              <h2>Mes prochaines tâches</h2>
              <Link to="/taches" style={{ fontSize: 13 }}>Tout voir</Link>
            </div>
            {tasks === null ? <div className="sub">Chargement…</div> : mine.length === 0 ? (
              <div className="sub" style={{ padding: '10px 0' }}>Rien d'assigné pour l'instant.</div>
            ) : mine.slice(0, 8).map((t) => {
              const p = projects.find((x) => x.id === t.project_id)
              const sp = spaceOf(t.space)
              return (
                <button key={t.id} className="li" style={{ width: '100%', background: 'none', border: 0, borderTop: '1px solid var(--line2)', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen(t)}>
                  <span className="grow">
                    <span className="ttl" style={{ fontWeight: 500 }}>{t.title}</span>
                    <span className="sub" style={{ display: 'block', fontSize: 12 }}>{p?.name} · <span style={{ color: sp.color }}>{num(sp.n)} {sp.name}</span></span>
                  </span>
                  <span className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className="tag" style={{ background: statusOf(t.status).color, color: '#fff' }}>{statusOf(t.status).label}</span>
                    <span className={isLate(t.due_date, false) ? 'late' : 'sub'} style={{ minWidth: 56, textAlign: 'right' }}>{shortDate(t.due_date) || '–'}</span>
                  </span>
                </button>
              )
            })}
          </section>

          <section className="card flush">
            <div className="row between" style={{ padding: '14px 16px 4px' }}>
              <h2>Derniers messages</h2>
              <Link to="/boite" style={{ fontSize: 13 }}>Boîte de réception</Link>
            </div>
            <InboxList items={notifications.slice(0, 5)} compact />
          </section>
        </div>

        <section className="card">
          <h2 style={{ marginBottom: 6 }}>Prochains événements</h2>
          {upcoming.length === 0 && <div className="sub" style={{ padding: '10px 0' }}>Aucun événement daté à venir.</div>}
          {upcoming.map((p) => {
            const c = clients.find((x) => x.id === p.client_id)
            const open = (tasks ?? []).filter((t) => t.project_id === p.id && t.status !== 'done').length
            return (
              <Link key={p.id} className="li" to={`/clients/${p.client_id}?projet=${p.id}`}>
                <span className="grow">
                  <span className="ttl" style={{ fontWeight: 600 }}>{p.name}</span>
                  <span className="sub" style={{ display: 'block', fontSize: 12 }}>{c?.name} · {shortDate(p.event_date)}{p.place ? ` · ${p.place}` : ''}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="serif" style={{ fontSize: 24, color: 'var(--gold)', display: 'block', lineHeight: 1 }}>{countdown(p.event_date)}</span>
                  <span className="sub" style={{ fontSize: 11 }}>{tasks ? `${open} tâche${open > 1 ? 's' : ''} ouverte${open > 1 ? 's' : ''}` : ''}</span>
                </span>
              </Link>
            )
          })}
          {active.filter((p) => !p.event_date).map((p) => (
            <Link key={p.id} className="li" to={`/clients/${p.client_id}?projet=${p.id}`}>
              <span className="ttl" style={{ fontWeight: 600 }}>{p.name}</span><span className="sub">Date à fixer</span>
            </Link>
          ))}
        </section>
      </div>
      {open && <TaskDrawer task={open} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  )
}
