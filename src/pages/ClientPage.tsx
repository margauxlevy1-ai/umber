import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { keep, peek } from '../lib/cache'
import { countdown, isLate, shortDate } from '../lib/format'
import { PROJECT_STATUSES, SPACES, num } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { Entry, FileRec, Task } from '../lib/types'
import { MODULES } from '../lib/modules'
import { ProjectModal } from '../components/Forms'
import { Avatars, Icon, useToast } from '../components/ui'

export function ClientPage() {
  const { clientId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { clients, projects, staff, membersOf, spacesFor, access, profiles } = useStore()
  const toast = useToast()
  const client = clients.find((c) => c.id === clientId)
  const list = projects.filter((p) => p.client_id === clientId)
  const [showDone, setShowDone] = useState(false)
  const shown = list.filter((p) => showDone || p.status !== 'termine' || p.id === params.get('projet'))
  const project = list.find((p) => p.id === params.get('projet')) ?? shown[0] ?? list[0]
  const [tasks, setTasks] = useState<Task[]>([])
  const [files, setFiles] = useState<FileRec[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [modal, setModal] = useState<'new' | 'edit' | null>(null)

  useEffect(() => {
    if (!project) return
    const k = project.id
    setTasks(peek<Task[]>(`ctasks:${k}`) ?? [])
    setFiles(peek<FileRec[]>(`cfiles:${k}`) ?? [])
    setEntries(peek<Entry[]>(`centries:${k}`) ?? [])
    api.listTasks({ projectId: k }).then(keep(`ctasks:${k}`)).then(setTasks).catch(toast.fail)
    api.listFiles(k).then(keep(`cfiles:${k}`)).then(setFiles).catch(() => setFiles([]))
    api.listEntries(k).then(keep(`centries:${k}`)).then(setEntries).catch(() => setEntries([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!client) return <div className="empty">Ce client n'existe pas, ou tu n'y as pas accès.</div>

  const people = profiles.filter((u) => access.some((a) => a.user_id === u.id && list.some((p) => p.id === a.project_id)))
  const done = list.filter((p) => p.status === 'termine').length
  const visible = project ? spacesFor(project.id) : []

  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs"><Link to="/">Accueil</Link> / Clients</div>
          <h1>{client.name}</h1>
          <div className="sub">
            {[client.note, `${list.length} projet${list.length > 1 ? 's' : ''}`, staff && `${people.length} personne${people.length > 1 ? 's' : ''} avec accès`].filter(Boolean).join(' · ')}
          </div>
        </div>
        {staff && (
          <div className="row">
            <Avatars people={people} />
            <Link className="btn" to={`/acces?client=${client.id}`}>Accès</Link>
          </div>
        )}
      </div>

      <section>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2>Les projets {client.name}</h2>
          {done > 0 && (
            <button className="btn ghost sm" onClick={() => setShowDone((x) => !x)}>
              {showDone ? 'Masquer' : 'Afficher'} les terminés ({done})
            </button>
          )}
        </div>
        <div className="suites">
          {shown.map((p) => {
            const st = PROJECT_STATUSES.find((s) => s.v === p.status)?.label
            return (
              <button key={p.id} className={'suite' + (p.id === project?.id ? ' on' : '')} onClick={() => setParams({ projet: p.id })}>
                <span className="num">{p.status === 'termine' ? 'Fini' : countdown(p.event_date)}</span>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span className="sub">{[shortDate(p.event_date), p.place, st].filter(Boolean).join(' · ')}</span>
              </button>
            )
          })}
          {staff && <button className="suite new" onClick={() => setModal('new')}>+ Nouveau projet {client.name}</button>}
        </div>
        {list.length === 0 && !staff && <div className="empty">Aucun projet pour l'instant.</div>}
      </section>

      {project && (
        <section className="plan">
          <div className="row between">
            <h2>{project.name} : {visible.length === 8 ? 'ses 8 espaces' : `tes ${visible.length} espace${visible.length > 1 ? 's' : ''}`}</h2>
            <div className="row">
              {(() => {
                const l = tasks.filter((t) => isLate(t.due_date, t.status === 'done')).length
                return l > 0 ? <span className="tag s-late">{l} tâche{l > 1 ? 's' : ''} en retard</span> : <span className="tag s-ok">Rien en retard</span>
              })()}
              {staff && <button className="btn sm" onClick={() => setModal('edit')}>Modifier</button>}
            </div>
          </div>
          <div className="rooms">
            {SPACES.filter((s) => staff || visible.includes(s.n)).map((s) => {
              const ts = s.n === 1 ? tasks : tasks.filter((t) => t.space === s.n)
              const summary = MODULES[s.n]?.summary?.(entries.filter((e) => e.space === s.n)) ?? null
              const open = ts.filter((t) => t.status !== 'done')
              const late = open.filter((t) => isLate(t.due_date, false)).length
              const review = open.filter((t) => t.status === 'review').length
              const nf = files.filter((f) => f.space === s.n).length
              const mem = membersOf(project.id, s.n).filter((u) => access.some((a) => a.user_id === u.id && a.project_id === project.id && a.space === s.n))
              const restricted = staff && mem.length === 0
              return (
                <Link key={s.n} className="room" to={`/projets/${project.id}/espaces/${s.n}`} style={{ ['--c' as string]: s.color }}>
                  {restricted && <svg className="lock" viewBox="0 0 24 24" role="img" aria-label="Espace réservé à l'équipe"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
                  <div className="plq"><span className="rn">{num(s.n)}</span><b>{s.name}</b></div>
                  <div className="st">
                    {summary ? <>{summary}<span className="sub"> · </span></> : null}
                    {ts.length === 0 ? (summary ? <span className="sub">aucune tâche</span> : 'Pas encore de tâche') : `${open.length} tâche${open.length > 1 ? 's' : ''} ouverte${open.length > 1 ? 's' : ''}${s.n === 1 ? ' sur le projet' : ''}`}
                    {nf > 0 && <span className="sub"> · {nf} fichier{nf > 1 ? 's' : ''}</span>}
                  </div>
                  <div className="sub">{s.hint}</div>
                  <div className="ft">
                    <Avatars people={mem} max={4} />
                    {late > 0 ? <span className="tag s-late">{late} retard{late > 1 ? 's' : ''}</span>
                      : review > 0 ? <span className="tag s-due">{review} à valider</span>
                      : restricted ? <span className="tag s-mute">Équipe</span> : null}
                  </div>
                </Link>
              )
            })}
          </div>
          {staff && (
            <div className="sub row" style={{ gap: 6 }}>
              <Icon name="lock" size={14} /> Le cadenas signale un espace que seule l'équipe Umber voit.
            </div>
          )}
        </section>
      )}

      {modal === 'new' && <ProjectModal clientId={client.id} onClose={() => setModal(null)} />}
      {modal === 'edit' && project && <ProjectModal clientId={client.id} project={project} onClose={() => setModal(null)} />}
    </>
  )
}
