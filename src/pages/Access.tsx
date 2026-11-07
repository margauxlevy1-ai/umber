import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { firstName } from '../lib/format'
import { ROLES, SPACES, isStaffRole, num, roleOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import type { AccessGrant, Invitation, Level, Profile, Role } from '../lib/types'
import { Avatar, Icon, Modal, useToast } from '../components/ui'

const NEXT: Record<string, Level | null> = { none: 'view', view: 'edit', edit: null }

function Key({ level, onClick, disabled, label }: { level: Level | 'none'; onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button className={'key k-' + level} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      {level === 'edit' && <Icon name="pen" />}
      {level === 'view' && <Icon name="eye" />}
    </button>
  )
}

export function Access() {
  const { me, profiles, projects, clients, access, staff, refresh } = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const clientFilter = params.get('client')
  const choices = projects.filter((p) => !clientFilter || p.client_id === clientFilter)
  const projectId = params.get('projet') ?? choices.find((p) => p.status !== 'termine')?.id ?? choices[0]?.id ?? ''
  const project = projects.find((p) => p.id === projectId)
  const [inviting, setInviting] = useState(false)
  const [invites, setInvites] = useState<Invitation[]>([])
  const [busy, setBusy] = useState(false)

  const loadInvites = () => api.listInvitations().then(setInvites).catch(() => setInvites([]))
  useEffect(() => {
    if (staff) loadInvites()
  }, [staff])

  if (!staff) return <div className="empty">Cette page est réservée à l'équipe Umber.</div>

  const guests = profiles.filter((p) => !isStaffRole(p.role))
  const team = profiles.filter((p) => isStaffRole(p.role))
  const level = (u: string, s: number): Level | 'none' =>
    access.find((a) => a.project_id === projectId && a.user_id === u && a.space === s)?.level ?? 'none'

  async function cycle(u: Profile, s: number) {
    if (busy) return
    setBusy(true)
    try {
      await api.setAccess(projectId, u.id, s, NEXT[level(u.id, s)])
      await refresh()
    } catch (e) {
      toast.fail(e)
    } finally {
      setBusy(false)
    }
  }

  async function setRow(u: Profile, l: Level | null) {
    setBusy(true)
    try {
      for (const s of SPACES) await api.setAccess(projectId, u.id, s.n, l)
      await refresh()
    } catch (e) {
      toast.fail(e)
    } finally {
      setBusy(false)
    }
  }

  const onProject = guests.filter((g) => access.some((a) => a.user_id === g.id && a.project_id === projectId))
  const others = guests.filter((g) => !onProject.includes(g))
  const [adding, setAdding] = [params.get('ajout') === '1', (v: boolean) => { const n = new URLSearchParams(params); if (v) n.set('ajout', '1'); else n.delete('ajout'); setParams(n) }]

  return (
    <>
      <div className="head">
        <div><div className="crumbs">Réglages</div><h1>Accès et membres</h1><div className="sub">Qui voit quoi, projet par projet et espace par espace.</div></div>
        <button className="btn dark" onClick={() => setInviting(true)}>+ Inviter quelqu'un</button>
      </div>

      <section className="card stack" style={{ gap: 14 }}>
        <div className="row between">
          <div className="row">
            <h2>Accès au projet</h2>
            <select className="input" style={{ width: 'auto' }} value={projectId} onChange={(e) => setParams({ projet: e.target.value })} aria-label="Projet">
              {clients.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {projects.filter((p) => p.client_id === c.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="leg">
            <span><Key level="edit" disabled label="Modifie" /> Modifie</span>
            <span><Key level="view" disabled label="Consulte" /> Consulte</span>
            <span><Key level="none" disabled label="Pas d'accès" /> Pas d'accès</span>
          </div>
        </div>
        {!project ? <div className="empty">Crée d'abord un client et un projet.</div> : (
          <div className="wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Personne</th>
                  {SPACES.map((s) => <th key={s.n}><span className="rn" style={{ color: s.color }}>{num(s.n)}</span>{s.name}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {team.map((u) => (
                  <tr key={u.id}>
                    <td><span className="row" style={{ flexWrap: 'nowrap' }}><Avatar p={u} lg /> <span>{u.full_name}<br /><span className={'role ' + roleOf(u.role).cls}>{roleOf(u.role).label}</span></span></span></td>
                    {SPACES.map((s) => <td key={s.n}><Key level="edit" disabled label="L'équipe Umber a accès à tout" /></td>)}
                    <td className="sub" style={{ fontSize: 12 }}>Accès à tout</td>
                  </tr>
                ))}
                {onProject.map((u) => (
                  <tr key={u.id}>
                    <td><span className="row" style={{ flexWrap: 'nowrap' }}><Avatar p={u} lg /> <span>{u.full_name}<br /><span className={'role ' + roleOf(u.role).cls}>{roleOf(u.role).label}</span></span></span></td>
                    {SPACES.map((s) => {
                      const l = level(u.id, s.n)
                      return (
                        <td key={s.n}>
                          <Key level={l} disabled={busy} onClick={() => cycle(u, s.n)}
                            label={`${firstName(u.full_name)}, ${s.name} : ${l === 'edit' ? 'modifie' : l === 'view' ? 'consulte' : "pas d'accès"}. Cliquer pour changer.`} />
                        </td>
                      )
                    })}
                    <td><button className="btn ghost sm danger" disabled={busy} onClick={() => confirm(`Retirer ${u.full_name} de ${project.name} ?`) && setRow(u, null)}>Retirer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {project && (
          <div className="row">
            <span className="sub">Clique sur une case pour passer de « pas d'accès » à « consulte », puis « modifie ».</span>
            {others.length > 0 && !adding && <button className="btn sm" onClick={() => setAdding(true)}>+ Ouvrir ce projet à un membre existant</button>}
            {adding && (
              <select className="input" style={{ width: 'auto' }} defaultValue="" onChange={async (e) => {
                const u = others.find((o) => o.id === e.target.value)
                if (!u) return
                setBusy(true)
                try { await api.setAccess(projectId, u.id, 1, 'view'); await refresh(); setAdding(false) } catch (x) { toast.fail(x) } finally { setBusy(false) }
              }} aria-label="Membre à ajouter">
                <option value="" disabled>Choisir une personne…</option>
                {others.map((o) => <option key={o.id} value={o.id}>{o.full_name} ({roleOf(o.role).label})</option>)}
              </select>
            )}
          </div>
        )}
      </section>

      <section className="card stack" style={{ gap: 6 }}>
        <h2>Tous les membres</h2>
        <div className="wrap">
          <table className="matrix" style={{ minWidth: 560 }}>
            <thead><tr><th>Personne</th><th style={{ textAlign: 'left' }}>Email</th><th style={{ textAlign: 'left' }}>Rôle</th><th style={{ textAlign: 'left' }}>Projets ouverts</th></tr></thead>
            <tbody>
              {profiles.map((u) => {
                const n = new Set(access.filter((a) => a.user_id === u.id).map((a) => a.project_id)).size
                return (
                  <tr key={u.id}>
                    <td><span className="row" style={{ flexWrap: 'nowrap' }}><Avatar p={u} lg /> {u.full_name}{u.id === me?.id ? ' (toi)' : ''}</span></td>
                    <td style={{ textAlign: 'left' }} className="sub">{u.email}</td>
                    <td style={{ textAlign: 'left' }}>
                      {me?.role === 'owner' && u.id !== me.id ? (
                        <select className="cell-sel" value={u.role} onChange={async (e) => {
                          try { await api.updateRole(u.id, e.target.value as Role); await refresh() } catch (x) { toast.fail(x) }
                        }} aria-label={`Rôle de ${u.full_name}`}>
                          {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
                        </select>
                      ) : <span className={'role ' + roleOf(u.role).cls}>{roleOf(u.role).label}</span>}
                    </td>
                    <td style={{ textAlign: 'left' }} className="sub">{isStaffRole(u.role) ? 'Tous' : n}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="sub">L'équipe (propriétaire et équipe) voit tous les clients et tous les espaces. Les freelances et les clients voient seulement ce que tu leur ouvres.</div>
      </section>

      {invites.length > 0 && (
        <section className="card stack" style={{ gap: 6 }}>
          <h2>Invitations en attente</h2>
          {invites.map((i) => (
            <div key={i.email} className="li">
              <span>{i.full_name || i.email} <span className="sub">{i.email}</span> <span className={'role ' + roleOf(i.role).cls}>{roleOf(i.role).label}</span></span>
              <button className="btn ghost sm danger" onClick={async () => { await api.cancelInvitation(i.email).catch(toast.fail); loadInvites() }}>Annuler</button>
            </div>
          ))}
        </section>
      )}

      {inviting && <InviteModal defaultProject={projectId} onClose={() => setInviting(false)} onDone={() => { refresh(); loadInvites() }} />}
    </>
  )
}

const PRESETS: { label: string; grants: Record<number, Level> }[] = [
  { label: 'Client : suivre le projet', grants: { 1: 'view', 4: 'view', 5: 'edit', 6: 'view' } },
  { label: 'Freelance : logistique et lieu', grants: { 1: 'view', 3: 'edit', 4: 'edit', 6: 'view', 8: 'edit' } },
  { label: 'Tout en lecture', grants: { 1: 'view', 2: 'view', 3: 'view', 4: 'view', 5: 'view', 6: 'view', 7: 'view', 8: 'view' } },
]

function InviteModal({ defaultProject, onClose, onDone }: { defaultProject: string; onClose: () => void; onDone: () => void }) {
  const { me, projects, clients } = useStore()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('client')
  const [projectId, setProjectId] = useState(defaultProject)
  const [grants, setGrants] = useState<Record<number, Level>>(PRESETS[0].grants)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'existing' | 'invited' | null>(null)
  const staffRole = isStaffRole(role)
  const roles = ROLES.filter((r) => r.v !== 'none' && (r.v !== 'owner' || me?.role === 'owner'))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const list: AccessGrant[] = staffRole || !projectId ? [] : Object.entries(grants).map(([s, level]) => ({ project_id: projectId, space: Number(s), level }))
      setDone(await api.invite(email.trim(), name.trim(), role, list))
      onDone()
    } catch (x) {
      toast.fail(x)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const link = window.location.origin
    return (
      <Modal title="C'est fait" onClose={onClose}>
        {done === 'existing' ? (
          <p style={{ margin: 0 }}>{name || email} avait déjà un compte : ses nouveaux accès sont actifs tout de suite.</p>
        ) : api.demo ? (
          <p style={{ margin: 0 }}>En démo, le compte de {name || email} est créé directement. Choisis cette personne dans la barre du haut pour voir l'outil avec ses yeux.</p>
        ) : (
          <>
            <p style={{ margin: 0 }}>L'invitation est enregistrée. Envoie ce message à {name || email} :</p>
            <div className="bub" style={{ userSelect: 'all' }}>
              Bonjour{name ? ' ' + firstName(name) : ''}, je t'ai ouvert un accès à Umber Studio. Va sur {link}, clique sur « J'ai une invitation » et crée ton compte avec l'adresse {email}.
            </div>
          </>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn dark" onClick={onClose}>Fermer</button></div>
      </Modal>
    )
  }

  return (
    <Modal title="Inviter quelqu'un" onClose={onClose} wide>
      <form className="stack" onSubmit={submit}>
        <div className="grid2">
          <div className="f"><label htmlFor="ie">Email</label><input id="ie" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
          <div className="f"><label htmlFor="in">Prénom et nom</label><input id="in" value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <div className="f">
          <span className="l">Rôle</span>
          <div className="row">
            {roles.map((r) => (
              <button type="button" key={r.v} className={'tab' + (role === r.v ? ' on' : '')} onClick={() => setRole(r.v)}>{r.label}</button>
            ))}
          </div>
          <span className="sub" style={{ fontSize: 12 }}>
            {staffRole ? "L'équipe voit et modifie tous les clients et tous les espaces." : 'Choisis ci-dessous le projet et les espaces à ouvrir. Tu pourras en ajouter ensuite.'}
          </span>
        </div>
        {!staffRole && (
          <>
            <div className="f">
              <label htmlFor="ip">Projet</label>
              <select id="ip" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {clients.map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    {projects.filter((p) => p.client_id === c.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="f">
              <span className="l">Espaces ouverts</span>
              <div className="row">
                {PRESETS.map((p) => <button type="button" key={p.label} className="btn sm" onClick={() => setGrants(p.grants)}>{p.label}</button>)}
              </div>
              <div className="spacepick">
                {SPACES.map((s) => (
                  <label key={s.n} className="rc">
                    <span className="serif" style={{ color: s.color, fontSize: 16 }}>{num(s.n)}</span> {s.name}
                    <select
                      value={grants[s.n] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value as Level | ''
                        setGrants((g) => {
                          const next = { ...g }
                          if (v) next[s.n] = v
                          else delete next[s.n]
                          return next
                        })
                      }}
                    >
                      <option value="">Pas d'accès</option>
                      <option value="view">Consulte</option>
                      <option value="edit">Modifie</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn dark" disabled={busy}>Inviter</button>
        </div>
      </form>
    </Modal>
  )
}
