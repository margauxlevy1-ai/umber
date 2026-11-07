import { useState } from 'react'
import { api } from '../lib/api'
import { roleOf } from '../lib/spaces'
import { useStore } from '../lib/store'
import { Avatar, useToast } from '../components/ui'
import { SetPassword } from './Login'

const COLORS = ['#1D1A17', '#2B4566', '#22605F', '#2E5B3B', '#7A4A16', '#8A3530', '#5A3A6B', '#615424']

export function Profile() {
  const { me, refresh } = useStore()
  const toast = useToast()
  const [name, setName] = useState(me?.full_name ?? '')
  if (!me) return null
  return (
    <>
      <div className="head"><div><div className="crumbs">Ton compte</div><h1>Profil</h1></div></div>
      <section className="card stack" style={{ maxWidth: 520 }}>
        <div className="row"><Avatar p={me} lg /><span>{me.email} <span className={'role ' + roleOf(me.role).cls}>{roleOf(me.role).label}</span></span></div>
        <div className="f"><label htmlFor="pn">Prénom et nom</label><input id="pn" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="f">
          <span className="l">Couleur de ta pastille</span>
          <div className="row">
            {COLORS.map((c) => (
              <button key={c} aria-label={c} onClick={async () => { await api.updateProfile({ color: c }).catch(toast.fail); refresh() }}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: me.color === c ? '3px solid #D9B98A' : '2px solid #fff', cursor: 'pointer', boxShadow: '0 0 0 1px #E4DED6' }} />
            ))}
          </div>
        </div>
        <div className="row">
          <button className="btn dark" disabled={!name.trim() || name === me.full_name} onClick={async () => {
            try { await api.updateProfile({ full_name: name.trim() }); await refresh(); toast.ok('Enregistré') } catch (e) { toast.fail(e) }
          }}>Enregistrer</button>
          <button className="btn ghost" onClick={() => api.signOut()}>Se déconnecter</button>
        </div>
      </section>
      {!api.demo && <SetPassword />}
    </>
  )
}
