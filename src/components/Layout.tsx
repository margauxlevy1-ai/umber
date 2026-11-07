import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, leaveDemo } from '../lib/api'
import { DEMO_PEOPLE, reloadDemo } from '../lib/api-demo'
import { firstName } from '../lib/format'
import { roleOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import { Avatar, Icon } from './ui'
import { NewClientModal } from './Forms'

export function Layout() {
  const { me, clients, projects, unread, staff } = useStore()
  const [open, setOpen] = useState(false)
  const [newClient, setNewClient] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])

  const nav = ({ isActive }: { isActive: boolean }) => 'nav' + (isActive ? ' active' : '')

  return (
    <>
      {api.demo && <DemoBar />}
      <div className="app">
        <nav className={'side' + (open ? ' open' : '')} aria-label="Navigation principale">
          <div className="side-top">
            <NavLink to="/" className="brand">UMBER<span>STUDIO</span></NavLink>
            <button className="btn ghost sm burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
              <Icon name="menu" size={18} />{unread > 0 && <span className="tag s-due">{unread}</span>}
            </button>
          </div>
          <div className="menu">
            <NavLink to="/" end className={nav}><Icon name="home" />Accueil</NavLink>
            <NavLink to="/boite" className={nav}><Icon name="inbox" />Boîte de réception{unread > 0 && <span className="n">{unread}</span>}</NavLink>
            <NavLink to="/taches" className={nav}><Icon name="tasks" />Mes tâches</NavLink>

            <div className="sec">Clients</div>
            {clients.map((c) => {
              const n = projects.filter((p) => p.client_id === c.id && p.status !== 'termine').length
              return (
                <NavLink key={c.id} to={`/clients/${c.id}`} className={nav}>
                  <span className="fl">{c.name.slice(0, 1).toUpperCase()}</span>
                  <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  {n > 0 && <span className="c">{n}</span>}
                </NavLink>
              )
            })}
            {clients.length === 0 && <div className="sub" style={{ padding: '4px 10px' }}>Aucun client pour l'instant</div>}
            {staff && (
              <button className="nav add" onClick={() => setNewClient(true)}><span className="fl dash">+</span>Nouveau client</button>
            )}

            {staff && (
              <>
                <div className="sec">Réglages</div>
                <NavLink to="/acces" className={nav}><Icon name="key" />Accès et membres</NavLink>
              </>
            )}

            <div className="side-foot">
              <NavLink to="/profil" className={({ isActive }) => 'me nav' + (isActive ? ' active' : '')}>
                <Avatar p={me ?? undefined} />
                <span>{me ? firstName(me.full_name) : ''}<small>{me ? roleOf(me.role).label : ''}</small></span>
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="main">
          <Outlet />
        </main>
      </div>
      {newClient && <NewClientModal onClose={() => setNewClient(false)} />}
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
