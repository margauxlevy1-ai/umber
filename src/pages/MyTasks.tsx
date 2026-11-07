import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { keep, peek } from '../lib/cache'
import { isLate } from '../lib/format'
import { useStore } from '../lib/store'
import type { Task } from '../lib/types'
import { TaskDrawer, TaskTable, type TaskGroup } from '../components/Tasks'
import { useToast } from '../components/ui'

export function MyTasks() {
  const { me, staff, profiles, projects, clients } = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const who = params.get('qui') ?? me?.id ?? ''
  const filter = params.get('filtre') ?? 'ouvertes'
  const tkey = `tasks:who:${who}`
  const [tasks, setTasks] = useState<Task[] | null>(() => peek<Task[]>(tkey))
  const [open, setOpen] = useState<Task | null>(null)

  const load = () => api.listTasks(who === 'tous' ? {} : { assigneeId: who }).then(keep(tkey)).then(setTasks).catch(toast.fail)
  useEffect(() => {
    setTasks(peek<Task[]>(tkey))
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [who])

  const groups = useMemo<TaskGroup[]>(() => {
    if (!tasks) return []
    const list = tasks
      .filter((t) => filter === 'toutes' || (filter === 'retard' ? isLate(t.due_date, t.status === 'done') : t.status !== 'done'))
      .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
    return projects
      .map((p) => ({
        key: p.id,
        label: `${p.name} · ${clients.find((c) => c.id === p.client_id)?.name ?? ''}`,
        tasks: list.filter((t) => t.project_id === p.id),
      }))
      .filter((g) => g.tasks.length > 0)
  }, [tasks, filter, projects, clients])

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next)
  }

  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs">Toutes les tâches confiées, tous projets confondus</div>
          <h1>{who === me?.id ? 'Mes tâches' : who === 'tous' ? 'Toutes les tâches' : `Tâches de ${profiles.find((p) => p.id === who)?.full_name.split(' ')[0] ?? ''}`}</h1>
        </div>
        <div className="row">
          {staff && (
            <select className="input" style={{ width: 'auto' }} value={who} onChange={(e) => set('qui', e.target.value)} aria-label="Personne">
              <option value={me?.id}>Moi</option>
              <option value="tous">Tout le monde</option>
              {profiles.filter((p) => p.id !== me?.id && p.role !== 'none').map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="tabs" style={{ padding: 0, border: 0 }}>
        {[['ouvertes', 'À faire'], ['retard', 'En retard'], ['toutes', 'Toutes, y compris faites']].map(([k, l]) => (
          <button key={k} className={'tab' + (filter === k ? ' on' : '')} onClick={() => set('filtre', k)}>{l}</button>
        ))}
      </div>
      <section className="card">
        {tasks === null ? <div className="sub">Chargement…</div> : groups.length === 0 ? (
          <div className="empty">{filter === 'retard' ? 'Rien en retard. Bravo.' : 'Aucune tâche ici.'}</div>
        ) : (
          <TaskTable groups={groups} onChanged={load} onOpen={setOpen} showWhere />
        )}
      </section>
      {open && <TaskDrawer task={open} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  )
}
