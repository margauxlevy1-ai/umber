import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { keep, peek } from '../lib/cache'
import { countdown, shortDate } from '../lib/format'
import { SPACES, num, space as spaceOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { Task } from '../lib/types'
import { Thread } from '../components/Comments'
import { ModuleView } from '../components/Entries'
import { MODULES } from '../lib/modules'
import { FilesPanel } from '../components/Files'
import { TaskDrawer, TaskTable, type TaskGroup } from '../components/Tasks'
import { Avatars, Icon, useToast } from '../components/ui'

type View = 'espace' | 'taches' | 'fichiers' | 'discussion'

export function SpacePage() {
  const { projectId = '', n = '1' } = useParams()
  const sn = Math.min(8, Math.max(1, Number(n) || 1))
  const [params, setParams] = useSearchParams()
  const { projects, clients, canView, canEdit, membersOf, access, spacesFor, staff } = useStore()
  const toast = useToast()
  const project = projects.find((p) => p.id === projectId)
  const client = clients.find((c) => c.id === project?.client_id)
  const sp = spaceOf(sn)
  const isOrga = sn === 1
  const mod = MODULES[sn]
  const defaultView: View = isOrga || !mod ? 'taches' : 'espace'
  const view = (params.get('vue') as View) || defaultView
  const tkey = `tasks:${projectId}:${sn === 1 ? 'all' : sn}`
  const [tasks, setTasks] = useState<Task[] | null>(() => peek<Task[]>(tkey))
  const [hideDone, setHideDone] = useState(false)
  const [counts, setCounts] = useState({ files: 0, msgs: 0 })

  // Dans Orga, la to-do regroupe les tâches de tous les espaces du projet.
  const load = () => api.listTasks(isOrga ? { projectId } : { projectId, space: sn }).then(keep(tkey)).then(setTasks).catch(toast.fail)
  useEffect(() => {
    setTasks(peek<Task[]>(tkey))
    load()
    api.listFiles(projectId, sn).then((f) => setCounts((c) => ({ ...c, files: f.length }))).catch(() => {})
    api.listComments(projectId, sn, null).then((m) => setCounts((c) => ({ ...c, msgs: m.length }))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sn])

  const openId = params.get('tache')
  const open = tasks?.find((t) => t.id === openId) ?? null

  const groups = useMemo<TaskGroup[]>(() => {
    if (!tasks) return []
    const list = hideDone ? tasks.filter((t) => t.status !== 'done') : tasks
    const labels = [...new Set(tasks.map((t) => t.group_label))]
    const editable = canEdit(projectId, sn)
    const out = labels.map((l) => ({
      key: l || '_',
      label: l || (labels.length > 1 ? 'Sans groupe' : ''),
      tasks: list.filter((t) => t.group_label === l),
      add: editable ? { project_id: projectId, space: sn, group_label: l } : undefined,
    }))
    if (out.length === 0 && editable) out.push({ key: '_', label: '', tasks: [], add: { project_id: projectId, space: sn, group_label: '' } })
    return out
  }, [tasks, hideDone, projectId, sn, canEdit])

  const setView = (v: View) => setParams(v === defaultView ? {} : { vue: v })

  if (!project) return <div className="empty">Ce projet n'existe pas, ou tu n'y as pas accès.</div>
  if (!canView(projectId, sn)) {
    return (
      <div className="stack">
        <div className="crumbs"><Link to={`/clients/${project.client_id}?projet=${project.id}`}>{project.name}</Link></div>
        <div className="empty">L'espace {sp.name} n'est pas ouvert pour toi sur ce projet.</div>
      </div>
    )
  }

  const editable = canEdit(projectId, sn)
  const visibleSpaces = staff ? SPACES : SPACES.filter((s) => spacesFor(projectId).includes(s.n))
  const invited = membersOf(projectId, sn)
  const guests = invited.filter((u) => access.some((a) => a.user_id === u.id && a.project_id === projectId && a.space === sn))
  const total = tasks?.length ?? 0
  const doneCount = tasks?.filter((t) => t.status === 'done').length ?? 0

  return (
    <div className="space-scope" style={{ ['--c' as string]: sp.color, ['--t' as string]: sp.tint }}>
      <div className="head space-hero">
        <div>
          <div className="crumbs">
            <Link to={`/clients/${project.client_id}`}>{client?.name}</Link> / <Link to={`/clients/${project.client_id}?projet=${project.id}`}>{project.name}</Link>
            {' · '}{countdown(project.event_date)}{project.event_date ? `, ${shortDate(project.event_date)}` : ''}
          </div>
          <h1><span style={{ color: sp.color }}>{num(sn)}</span> {sp.name}</h1>
          <div className="sub">{sp.hint}</div>
        </div>
        <div className="row">
          {!editable && <span className="tag s-mute"><Icon name="eye" size={12} /> Lecture seule</span>}
          <Avatars people={invited} />
          {staff && <Link className="btn sm" to={`/acces?projet=${project.id}`}>Accès</Link>}
        </div>
      </div>

      <nav className="doors" aria-label="Espaces du projet">
        {visibleSpaces.map((s) => (
          <Link key={s.n} to={`/projets/${projectId}/espaces/${s.n}`} className={'door' + (s.n === sn ? ' active' : '')} style={{ ['--c' as string]: s.color }}>
            <span>{num(s.n)}</span>{s.name}
          </Link>
        ))}
      </nav>

      <div className="views" role="tablist">
        {mod && !isOrga && (
          <button className={'view' + (view === 'espace' ? ' on' : '')} onClick={() => setView('espace')} role="tab" aria-selected={view === 'espace'}>{mod.tab}</button>
        )}
        <button className={'view' + (view === 'taches' ? ' on' : '')} onClick={() => setView('taches')} role="tab" aria-selected={view === 'taches'}>
          {isOrga ? 'To-do du projet' : 'Tâches'}<span className="cnt">{tasks ? `${doneCount}/${total}` : ''}</span>
        </button>
        {mod && isOrga && (
          <button className={'view' + (view === 'espace' ? ' on' : '')} onClick={() => setView('espace')} role="tab" aria-selected={view === 'espace'}>{mod.tab}</button>
        )}
        <button className={'view' + (view === 'fichiers' ? ' on' : '')} onClick={() => setView('fichiers')} role="tab" aria-selected={view === 'fichiers'}>
          Fichiers<span className="cnt">{counts.files || ''}</span>
        </button>
        <button className={'view' + (view === 'discussion' ? ' on' : '')} onClick={() => setView('discussion')} role="tab" aria-selected={view === 'discussion'}>
          Discussion<span className="cnt">{counts.msgs || ''}</span>
        </button>
      </div>

      {view === 'espace' && mod && <ModuleView projectId={projectId} space={sn} />}

      {view === 'taches' && (
        <section className="card">
          {isOrga && (
            <div className="sub" style={{ marginBottom: 8 }}>
              Toutes les tâches du projet. Choisis l'espace d'une tâche dans la colonne « Espace » : elle apparaît aussi dans la to-do de cet espace.
            </div>
          )}
          {tasks === null ? <div className="sub">Chargement…</div> : (
            <>
              {total > 0 && (
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span className="sub">{total - doneCount} ouverte{total - doneCount > 1 ? 's' : ''}, {doneCount} faite{doneCount > 1 ? 's' : ''}</span>
                  <label className="sub row" style={{ gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Masquer les tâches faites
                  </label>
                </div>
              )}
              {total === 0 && !editable ? <div className="empty">Aucune tâche dans cet espace.</div> : (
                <TaskTable
                  groups={groups}
                  onChanged={load}
                  onOpen={(t) => setParams(view === defaultView ? { tache: t.id } : { vue: view, tache: t.id })}
                  showSpace={isOrga}
                  allowNewGroup={editable ? { project_id: projectId, space: sn } : undefined}
                />
              )}
            </>
          )}
        </section>
      )}

      {view === 'fichiers' && (
        <section className="card">
          <FilesPanel projectId={projectId} space={sn} onCount={(n) => setCounts((c) => ({ ...c, files: n }))} />
        </section>
      )}

      {view === 'discussion' && (
        <section className="card" style={{ maxWidth: 760 }}>
          <div className="sub" style={{ marginBottom: 12 }}>
            Les messages de l'espace {sp.name}. Visibles par l'équipe Umber{guests.length ? ' et ' + guests.map((g) => g.full_name.split(' ')[0]).join(', ') : ''}.
          </div>
          <Thread projectId={projectId} space={sn} taskId={null} onCount={(n) => setCounts((c) => ({ ...c, msgs: n }))} />
        </section>
      )}

      {open && <TaskDrawer task={open} onClose={() => setParams(view === defaultView ? {} : { vue: view })} onChanged={load} />}
    </div>
  )
}
