import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PROJECT_STATUSES } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { Project, ProjectStatus } from '../lib/types'
import { Modal, useToast } from './ui'

export function NewClientModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const c = await api.createClient(name.trim(), note.trim())
      await refresh()
      onClose()
      nav(`/clients/${c.id}`)
    } catch (err) {
      toast.fail(err)
      setBusy(false)
    }
  }

  return (
    <Modal title="Nouveau client" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="f"><label htmlFor="cn">Nom</label><input id="cn" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. More" required /></div>
        <div className="f"><label htmlFor="cno">Note (facultatif)</label><input id="cno" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. client récurrent, contact principal…" /></div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn dark" disabled={busy || !name.trim()}>Créer le client</button>
        </div>
      </form>
    </Modal>
  )
}

export function ProjectModal({ clientId, project, onClose, onSaved }: {
  clientId: string
  project?: Project
  onClose: () => void
  onSaved?: (p: Project) => void
}) {
  const { refresh, clients } = useStore()
  const toast = useToast()
  const nav = useNavigate()
  const [client, setClient] = useState(project?.client_id ?? clientId)
  const [name, setName] = useState(project?.name ?? '')
  const [date, setDate] = useState(project?.event_date ?? '')
  const [place, setPlace] = useState(project?.place ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'cadrage')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const fields = { name: name.trim(), event_date: date || null, place: place.trim(), status }
      if (project) {
        await api.updateProject(project.id, fields)
        await refresh()
        onSaved?.({ ...project, ...fields })
        onClose()
      } else {
        const p = await api.createProject({ ...fields, client_id: client })
        await refresh()
        onClose()
        nav(`/clients/${client}?projet=${p.id}`)
      }
    } catch (err) {
      toast.fail(err)
      setBusy(false)
    }
  }

  async function remove() {
    if (!project) return
    if (!confirm(`Supprimer « ${project.name} » et tout son contenu (tâches, fichiers, discussions) ? Cette action est définitive.`)) return
    try {
      await api.deleteProject(project.id)
      await refresh()
      onClose()
      nav(`/clients/${project.client_id}`)
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <Modal title={project ? 'Modifier le projet' : 'Nouveau projet'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        {!project && (
          <div className="f"><label htmlFor="pc">Client</label>
            <select id="pc" value={client} onChange={(e) => setClient(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="f"><label htmlFor="pn">Nom du projet</label><input id="pn" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Soirée presse" required /></div>
        <div className="grid2">
          <div className="f"><label htmlFor="pd">Date de l'événement</label><input id="pd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="f"><label htmlFor="ps">Statut</label>
            <select id="ps" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="f"><label htmlFor="pl">Lieu ou ville</label><input id="pl" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex. Paris 3e" /></div>
        {!project && <div className="sub">Le projet est créé avec ses 8 espaces, vides. Tu donnes ensuite les accès dans « Accès et membres ».</div>}
        <div className="row between">
          {project ? <button type="button" className="btn danger" onClick={remove}>Supprimer le projet</button> : <span />}
          <div className="row">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn dark" disabled={busy || !name.trim()}>{project ? 'Enregistrer' : 'Créer le projet'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
