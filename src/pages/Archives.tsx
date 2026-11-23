import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { shortDate } from '../lib/format'
import { clientTone } from '../lib/spaces'
import { useStore } from '../lib/store'
import { Icon, useToast } from '../components/ui'

// Tous les projets archivés, client par client, avec de quoi les rouvrir ou les restaurer.
export function Archives() {
  const { projects, clients, staff, refresh } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const archived = projects
    .filter((p) => p.archived_at)
    .sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''))
  const byClient = clients.filter((c) => archived.some((p) => p.client_id === c.id))

  async function restore(id: string, name: string) {
    setBusy(id)
    try {
      await api.updateProject(id, { archived_at: null })
      await refresh()
      toast.ok(`« ${name} » est de retour dans les projets en cours`)
    } catch (e) {
      toast.fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="head">
        <div>
          <div className="crumbs">Réglages</div>
          <h1>Archives</h1>
          <div className="sub">Les projets archivés restent consultables en lecture seule. Restaure-les pour les modifier à nouveau.</div>
        </div>
      </div>
      {archived.length === 0 && (
        <div className="empty">
          Aucun projet archivé. Pour archiver un projet terminé, ouvre-le depuis la page de son client et clique sur « Archiver ».
        </div>
      )}
      {byClient.map((c) => {
        const tone = clientTone(c.name)
        return (
          <section key={c.id} className="card">
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="fl" style={{ background: tone.tint, color: tone.color }}>{c.name.slice(0, 1).toUpperCase()}</span>
              <h2>{c.name}</h2>
            </div>
            {archived.filter((p) => p.client_id === c.id).map((p) => (
              <div key={p.id} className="li" style={{ flexWrap: 'wrap' }}>
                <span className="grow">
                  <Link to={`/clients/${c.id}?projet=${p.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{p.name}</Link>
                  <span className="sub" style={{ display: 'block', fontSize: 12 }}>
                    {[p.event_date && `événement du ${shortDate(p.event_date)}`, p.place, `archivé le ${shortDate(p.archived_at!.slice(0, 10))}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <Link className="btn sm" to={`/clients/${c.id}?projet=${p.id}`}>Ouvrir</Link>
                  {staff && (
                    <button className="btn sm" disabled={busy === p.id} onClick={() => restore(p.id, p.name)}>
                      <Icon name="archive" size={14} /> Restaurer
                    </button>
                  )}
                </span>
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}
