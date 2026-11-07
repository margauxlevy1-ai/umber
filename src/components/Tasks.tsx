import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { isLate, shortDate } from '../lib/format'
import { PRIORITIES, SPACES, STATUSES, num, space as spaceOf, statusOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { NewTask, Task, TaskPatch } from '../lib/types'
import { Thread } from './Comments'
import { Avatar, Icon, useToast } from './ui'

export interface TaskGroup {
  key: string
  label: string
  tasks: Task[]
  add?: Omit<NewTask, 'title'>
}

export function StatusSelect({ t, disabled, onChange }: { t: Task; disabled: boolean; onChange: (p: TaskPatch) => void }) {
  return (
    <select
      className="st-sel"
      style={{ background: statusOf(t.status).color }}
      value={t.status}
      disabled={disabled}
      onChange={(e) => onChange({ status: e.target.value as Task['status'] })}
      aria-label="Statut"
    >
      {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
    </select>
  )
}

export function AssigneeSelect({ t, disabled, onChange }: { t: Task; disabled: boolean; onChange: (p: TaskPatch) => void }) {
  const { membersOf, person } = useStore()
  const people = membersOf(t.project_id, t.space)
  const current = person(t.assignee_id)
  if (current && !people.some((p) => p.id === current.id)) people.push(current)
  return (
    <span className="who">
      <Avatar p={current} />
      <select
        className="cell-sel"
        value={t.assignee_id ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ assignee_id: e.target.value || null })}
        aria-label="Responsable"
      >
        <option value="">Personne</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </select>
    </span>
  )
}

export function SpaceSelect({ t, disabled, onChange }: { t: Task; disabled: boolean; onChange: (p: TaskPatch) => void }) {
  const { canEdit } = useStore()
  const sp = spaceOf(t.space)
  const choices = SPACES.filter((s) => s.n === t.space || canEdit(t.project_id, s.n))
  return (
    <select
      className="cell-sel sp-sel"
      style={{ color: sp.color }}
      value={t.space}
      disabled={disabled}
      onChange={(e) => onChange({ space: Number(e.target.value) })}
      aria-label="Espace"
    >
      {choices.map((s) => <option key={s.n} value={s.n}>{num(s.n)} {s.name}</option>)}
    </select>
  )
}

export function TaskTable({ groups, onChanged, onOpen, showWhere, showSpace, allowNewGroup }: {
  groups: TaskGroup[]
  onChanged: () => void
  onOpen: (t: Task) => void
  showWhere?: boolean
  showSpace?: boolean
  allowNewGroup?: Omit<NewTask, 'title'>
}) {
  const { canEdit, projects } = useStore()
  const toast = useToast()
  const [extra, setExtra] = useState<string[]>([])

  async function patch(t: Task, p: TaskPatch) {
    try {
      await api.updateTask(t.id, p)
      onChanged()
    } catch (e) {
      toast.fail(e)
    }
  }

  const all: TaskGroup[] = [
    ...groups,
    ...extra.filter((x) => !groups.some((g) => g.key === x)).map((x) => ({ key: x, label: x, tasks: [], add: allowNewGroup && { ...allowNewGroup, group_label: x } })),
  ]

  return (
    <div className="stack">
      <div className="wrap">
        <table className="tasks">
          <thead>
            <tr>
              <th>Tâche</th>
              {showWhere && <th>Projet · espace</th>}
              {showSpace && <th>Espace</th>}
              <th>Responsable</th>
              <th>Statut</th>
              <th>Échéance</th>
              <th>Priorité</th>
            </tr>
          </thead>
          <tbody>
            {all.map((g) => (
              <Group key={g.key} g={g} showWhere={showWhere} showSpace={showSpace} onOpen={onOpen} patch={patch} onChanged={onChanged} canEdit={canEdit} projects={projects} />
            ))}
            {all.length === 0 && (
              <tr><td colSpan={5 + (showWhere ? 1 : 0) + (showSpace ? 1 : 0)} style={{ borderTop: 0 }}><div className="empty">Aucune tâche.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {allowNewGroup && (
        <div>
          <button
            className="btn sm"
            onClick={() => {
              const name = prompt('Nom du groupe (ex. Cadrage, Jour J, Devis)')?.trim()
              if (name) setExtra((x) => [...x, name])
            }}
          >+ Nouveau groupe</button>
        </div>
      )}
    </div>
  )
}

function Group({ g, showWhere, showSpace, onOpen, patch, onChanged, canEdit, projects }: {
  g: TaskGroup
  showWhere?: boolean
  showSpace?: boolean
  onOpen: (t: Task) => void
  patch: (t: Task, p: TaskPatch) => void
  onChanged: () => void
  canEdit: (p: string, s: number) => boolean
  projects: { id: string; name: string; client_id: string }[]
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(g.add?.space ?? 1)
  const cols = 5 + (showWhere ? 1 : 0) + (showSpace ? 1 : 0)

  async function add() {
    if (!g.add || !title.trim()) return
    try {
      await api.createTask({ ...g.add, space: showSpace ? target : g.add.space, title: title.trim() })
      setTitle('')
      onChanged()
    } catch (e) {
      toast.fail(e)
    }
  }

  return (
    <>
      {g.label && (
        <tr className="grp"><td colSpan={cols}>{g.label} <span className="sub" style={{ fontWeight: 500 }}>{g.tasks.length}</span></td></tr>
      )}
      {g.tasks.map((t) => {
        const sp = spaceOf(t.space)
        const edit = canEdit(t.project_id, t.space)
        const done = t.status === 'done'
        const pr = projects.find((p) => p.id === t.project_id)
        return (
          <tr key={t.id} className={'t' + (done ? ' done' : '')} style={{ ['--c' as string]: sp.color }}>
            <td className="ttl-cell">
              <button className="ttl-btn" onClick={() => onOpen(t)}>{t.title}</button>
              {t.description && <span className="ic" title="Description"><Icon name="pen" size={13} /></span>}
            </td>
            {showWhere && (
              <td>
                <Link to={`/projets/${t.project_id}/espaces/${t.space}`} style={{ textDecoration: 'none' }}>
                  {pr?.name ?? 'Projet'} <span className="sub">· {num(t.space)} {sp.name}</span>
                </Link>
              </td>
            )}
            {showSpace && <td><SpaceSelect t={t} disabled={!edit} onChange={(p) => patch(t, p)} /></td>}
            <td><AssigneeSelect t={t} disabled={!edit} onChange={(p) => patch(t, p)} /></td>
            <td><StatusSelect t={t} disabled={!edit} onChange={(p) => patch(t, p)} /></td>
            <td>
              {edit ? (
                <input
                  type="date"
                  className={'cell-sel' + (isLate(t.due_date, done) ? ' late' : '')}
                  value={t.due_date ?? ''}
                  onChange={(e) => patch(t, { due_date: e.target.value || null })}
                  aria-label="Échéance"
                />
              ) : (
                <span className={isLate(t.due_date, done) ? 'late' : ''}>{shortDate(t.due_date) || '–'}</span>
              )}
            </td>
            <td>
              <select
                className={'cell-sel pri-' + t.priority}
                value={t.priority}
                disabled={!edit}
                onChange={(e) => patch(t, { priority: e.target.value as Task['priority'] })}
                aria-label="Priorité"
              >
                {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </td>
          </tr>
        )
      })}
      {g.add && (
        <tr className="addrow">
          <td colSpan={cols} style={{ borderLeft: '4px solid transparent' }}>
            <span className="row" style={{ flexWrap: 'nowrap' }}>
            {showSpace && (
              <select className="cell-sel sp-sel" style={{ color: spaceOf(target).color }} value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Espace de la nouvelle tâche">
                {SPACES.filter((s) => canEdit(g.add!.project_id, s.n)).map((s) => <option key={s.n} value={s.n}>{num(s.n)} {s.name}</option>)}
              </select>
            )}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              onBlur={add}
              placeholder="+ Ajouter une tâche (Entrée pour valider)"
              aria-label={`Ajouter une tâche${g.label ? ' dans ' + g.label : ''}`}
            />
            </span>
          </td>
        </tr>
      )}
    </>
  )
}

export function TaskDrawer({ task, onClose, onChanged }: { task: Task; onClose: () => void; onChanged: () => void }) {
  const { canEdit, projects } = useStore()
  const toast = useToast()
  const [t, setT] = useState(task)
  const [title, setTitle] = useState(task.title)
  const [desc, setDesc] = useState(task.description)
  const edit = canEdit(t.project_id, t.space)
  const sp = spaceOf(t.space)
  const pr = projects.find((p) => p.id === t.project_id)

  useEffect(() => {
    setT(task)
    setTitle(task.title)
    setDesc(task.description)
  }, [task])
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function patch(p: TaskPatch) {
    const next = { ...t, ...p }
    setT(next)
    try {
      await api.updateTask(t.id, p)
      onChanged()
    } catch (e) {
      setT(t)
      toast.fail(e)
    }
  }

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={t.title}>
        <div className="row between">
          <span className="tag" style={{ background: sp.tint, color: sp.color }}>{num(sp.n)} {sp.name}{pr ? ` · ${pr.name}` : ''}</span>
          <button className="btn ghost sm" onClick={onClose}>Fermer</button>
        </div>
        <textarea
          className="ttl-in"
          rows={2}
          value={title}
          disabled={!edit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== t.title && patch({ title: title.trim() })}
          aria-label="Titre de la tâche"
        />
        <dl className="kv">
          <dt>Espace</dt><dd><SpaceSelect t={t} disabled={!edit} onChange={patch} /></dd>
          <dt>Statut</dt><dd><StatusSelect t={t} disabled={!edit} onChange={patch} /></dd>
          <dt>Responsable</dt><dd><AssigneeSelect t={t} disabled={!edit} onChange={patch} /></dd>
          <dt>Échéance</dt>
          <dd>
            <input type="date" className="input" style={{ maxWidth: 180 }} value={t.due_date ?? ''} disabled={!edit} onChange={(e) => patch({ due_date: e.target.value || null })} />
            {isLate(t.due_date, t.status === 'done') && <span className="tag s-late">En retard</span>}
          </dd>
          <dt>Priorité</dt>
          <dd>
            <select className="input" style={{ maxWidth: 180 }} value={t.priority} disabled={!edit} onChange={(e) => patch({ priority: e.target.value as Task['priority'] })}>
              {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
          </dd>
          <dt>Groupe</dt>
          <dd>
            <input
              className="input"
              style={{ maxWidth: 240 }}
              defaultValue={t.group_label}
              key={t.id + t.group_label}
              disabled={!edit}
              placeholder="Ex. Cadrage"
              onBlur={(e) => e.target.value.trim() !== t.group_label && patch({ group_label: e.target.value.trim() })}
            />
          </dd>
        </dl>
        <div className="f">
          <label htmlFor="td">Description</label>
          <textarea
            id="td"
            value={desc}
            disabled={!edit}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => desc !== t.description && patch({ description: desc })}
            placeholder={edit ? 'Le détail, les liens utiles, ce qui est attendu…' : ''}
            rows={4}
          />
        </div>
        <div className="stack">
          <h3>Discussion</h3>
          <Thread projectId={t.project_id} space={t.space} taskId={t.id} />
        </div>
        {edit && (
          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
            <button
              className="btn danger sm"
              onClick={async () => {
                if (!confirm('Supprimer cette tâche et sa discussion ?')) return
                try { await api.deleteTask(t.id); onChanged(); onClose() } catch (e) { toast.fail(e) }
              }}
            >Supprimer la tâche</button>
          </div>
        )}
      </aside>
    </>
  )
}
