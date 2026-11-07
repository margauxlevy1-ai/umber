import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, leaveDemo } from '../lib/api'
import { DEMO_PEOPLE, reloadDemo } from '../lib/api-demo'
import { firstName } from '../lib/format'
import { clientTone, roleOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import { Avatar, Icon } from './ui'
import { NewClientModal } from './Forms'
import { Note } from './Note'

export function Layout() {
  const { me, clients, projects, unread, staff } = useStore()
  const [sheet, setSheet] = useState(false)
  const [newClient, setNewClient] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    setSheet(false)
    window.scrollTo(0, 0)
  }, [loc.pathname])

  const nav = ({ isActive }: { isActive: boolean }) => 'nav' + (isActive ? ' active' : '')
  const tab = ({ isActive }: { isActive: boolean }) => 'tb' + (isActive ? ' active' : '')
  const inClients = /^\/(clients|projets|acces)/.test(loc.pathname)

  // Liste des clients : barre latérale sur ordinateur, panneau « Clients » sur téléphone
  const clientLinks = (
    <>
      {clients.map((c) => {
        const n = projects.filter((p) => p.client_id === c.id && p.status !== 'termine').length
        return (
          <NavLink key={c.id} to={`/clients/${c.id}`} className={nav}>
            <span className="fl" style={{ background: clientTone(c.name).tint, color: clientTone(c.name).color }}>{c.name.slice(0, 1).toUpperCase()}</span>
            <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {n > 0 && <span className="c">{n}</span>}
          </NavLink>
        )
      })}
      {clients.length === 0 && <div className="sub" style={{ padding: '4px 10px' }}>Aucun client pour l'instant</div>}
      {staff && (
        <button className="nav add" onClick={() => { setSheet(false); setNewClient(true) }}><span className="fl dash">+</span>Nouveau client</button>
      )}
      {staff && (
        <>
          <div className="sec">Réglages</div>
          <NavLink to="/acces" className={nav}><Icon name="key" />Accès et membres</NavLink>
        </>
      )}
    </>
  )

  return (
    <>
      {api.demo && <DemoBar />}
      <div className="app">
        <nav className="side" aria-label="Navigation principale">
          <NavLink to="/" className="brand">UMBER<span>STUDIO</span></NavLink>
          <NavLink to="/" end className={nav}><Icon name="home" />Accueil</NavLink>
          <NavLink to="/boite" className={nav}><Icon name="inbox" />Boîte de réception{unread > 0 && <span className="n">{unread}</span>}</NavLink>
          <NavLink to="/taches" className={nav}><Icon name="tasks" />Mes tâches</NavLink>
          <div className="sec">Clients</div>
          {clientLinks}
          <div className="side-foot">
            <NavLink to="/profil" className={({ isActive }) => 'me nav' + (isActive ? ' active' : '')}>
              <Avatar p={me ?? undefined} />
              <span>{me ? firstName(me.full_name) : ''}<small>{me ? roleOf(me.role).label : ''}</small></span>
            </NavLink>
          </div>
        </nav>

        <header className="mtop">
          <NavLink to="/" className="brand">UMBER<span>STUDIO</span></NavLink>
          <NavLink to="/profil" aria-label="Mon profil"><Avatar p={me ?? undefined} lg /></NavLink>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Navigation">
        <NavLink to="/" end className={tab}><Icon name="home" /><span>Accueil</span></NavLink>
        <NavLink to="/boite" className={tab}>
          <span className="tbi"><Icon name="inbox" />{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}</span>
          <span>Boîte</span>
        </NavLink>
        <NavLink to="/taches" className={tab}><Icon name="tasks" /><span>Tâches</span></NavLink>
        <button className={'tb' + (inClients || sheet ? ' active' : '')} onClick={() => setSheet((x) => !x)} aria-expanded={sheet}>
          <Icon name="folder" /><span>Clients</span>
        </button>
      </nav>

      {sheet && (
        <div className="msheet-bg" onClick={() => setSheet(false)}>
          <div className="msheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Clients">
            <div className="grip" />
            <div className="sec" style={{ paddingTop: 4 }}>Clients</div>
            {clientLinks}
          </div>
        </div>
      )}
      {newClient && <NewClientModal onClose={() => setNewClient(false)} />}
      <Note />
    </>
  )
}

function DemoBar() {
  const { me } = useStore()
  return (
    <div className="demo-bar">
      <span>Mode démo, données d'exemple.</span>
      <label>
        Voir l'outil comme{' '}
        <select
          value={me?.id ?? ''}
          onChange={async (e) => {
            const p = DEMO_PEOPLE.find((x) => x.id === e.target.value)
            if (p) await api.signIn(p.email, '')
          }}
        >
          {DEMO_PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({roleOf(p.role).label})</option>)}
        </select>
      </label>
      <button onClick={reloadDemo}>Remettre à zéro</button>
      <button onClick={leaveDemo}>Quitter la démo</button>
    </div>
  )
}
