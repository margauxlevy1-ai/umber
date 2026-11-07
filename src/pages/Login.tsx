import { useState, type FormEvent } from 'react'
import { api, enterDemo, supabaseReady } from '../lib/api'
import { DEMO_PEOPLE } from '../lib/api-demo'
import { roleOf } from '../lib/spaces'
import { Avatar } from '../components/ui'

type Mode = 'login' | 'signup' | 'magic' | 'reset'

export function Login() {
  if (api.demo) return <DemoLogin />
  return <RealLogin />
}

function DemoLogin() {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">UMBER<span>STUDIO</span></div>
        <div className="card stack" style={{ gap: 14 }}>
          <h1 style={{ fontSize: 30 }}>Démo</h1>
          <p className="sub" style={{ margin: 0 }}>
            Choisis qui tu es pour visiter l'outil. Chaque personne voit seulement les espaces auxquels elle a accès.
            {!supabaseReady && ' Supabase n’est pas encore branché : les données restent dans ce navigateur.'}
          </p>
          <div className="people">
            {DEMO_PEOPLE.map((p) => (
              <button key={p.id} className="person" onClick={() => api.signIn(p.email, '')}>
                <Avatar p={p} lg />
                <span>{p.full_name}<small>{roleOf(p.role).label}</small></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RealLogin() {
  // Lien d'invitation : /?invitation=email ouvre directement la création de compte
  const invited = new URLSearchParams(window.location.search).get('invitation') ?? ''
  const [mode, setMode] = useState<Mode>(invited ? 'signup' : 'login')
  const [email, setEmail] = useState(invited)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    setBusy(true)
    try {
      if (mode === 'login') await api.signIn(email, password)
      if (mode === 'signup') {
        const r = await api.signUp(email, password, name)
        if (r === 'confirm') setOk('Compte créé. Ouvre l’email de confirmation pour entrer (pense à regarder dans les indésirables).')
      }
      if (mode === 'magic') {
        await api.sendMagicLink(email)
        setOk('Lien envoyé. Ouvre ton email sur cet appareil.')
      }
      if (mode === 'reset') {
        await api.resetPassword(email)
        setOk('Email envoyé. Suis le lien pour choisir un nouveau mot de passe.')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const label = { login: 'Se connecter', signup: 'Créer mon compte', magic: 'Recevoir un lien', reset: 'Envoyer le lien' }[mode]

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">UMBER<span>STUDIO</span></div>
        <form className="card stack" style={{ gap: 14 }} onSubmit={submit}>
          <div className="auth-tabs">
            <button type="button" className={'view' + (mode === 'login' || mode === 'magic' || mode === 'reset' ? ' on' : '')} onClick={() => setMode('login')}>Connexion</button>
            <button type="button" className={'view' + (mode === 'signup' ? ' on' : '')} onClick={() => setMode('signup')}>J'ai une invitation</button>
          </div>
          {mode === 'signup' && (
            <>
              <p className="sub" style={{ margin: 0 }}>Crée ton compte avec l'email qui a reçu l'invitation. Tes accès apparaîtront tout de suite.</p>
              <div className="f"><label htmlFor="n">Prénom et nom</label><input id="n" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></div>
            </>
          )}
          {mode === 'magic' && <p className="sub" style={{ margin: 0 }}>Tu reçois un lien de connexion par email, sans mot de passe.</p>}
          {mode === 'reset' && <p className="sub" style={{ margin: 0 }}>Tu reçois un lien pour choisir un nouveau mot de passe.</p>}
          <div className="f"><label htmlFor="e">Email</label><input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
          {(mode === 'login' || mode === 'signup') && (
            <div className="f">
              <label htmlFor="p">Mot de passe</label>
              <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          )}
          {err && <div className="err">{err}</div>}
          {ok && <div className="ok">{ok}</div>}
          <button className="btn dark" style={{ justifyContent: 'center' }} disabled={busy}>{busy ? '…' : label}</button>
          {mode !== 'signup' && (
            <div className="row between" style={{ fontSize: 13 }}>
              {mode === 'login' ? <a href="#" onClick={(e) => { e.preventDefault(); setMode('magic') }}>Recevoir un lien par email</a> : <a href="#" onClick={(e) => { e.preventDefault(); setMode('login') }}>Retour</a>}
              {mode === 'login' && <a href="#" onClick={(e) => { e.preventDefault(); setMode('reset') }}>Mot de passe oublié</a>}
            </div>
          )}
        </form>
        <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={enterDemo}>Visiter la démo</button>
      </div>
    </div>
  )
}

export function NoAccess() {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">UMBER<span>STUDIO</span></div>
        <div className="card stack">
          <h1 style={{ fontSize: 30 }}>Bienvenue</h1>
          <p className="sub" style={{ margin: 0 }}>
            Ton compte existe, mais aucun projet ne t'a encore été ouvert. Demande à Umber de t'inviter avec cet email, puis recharge la page.
          </p>
          <div className="row">
            <button className="btn" onClick={() => window.location.reload()}>Recharger</button>
            <button className="btn ghost" onClick={() => api.signOut()}>Se déconnecter</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SetPassword() {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="stack" style={{ maxWidth: 420 }}>
      <h1>Nouveau mot de passe</h1>
      <form
        className="card stack"
        onSubmit={async (e) => {
          e.preventDefault()
          setErr('')
          try {
            await api.updatePassword(pw)
            setMsg('Mot de passe enregistré.')
            setPw('')
          } catch (x) {
            setErr(x instanceof Error ? x.message : String(x))
          }
        }}
      >
        <div className="f"><label htmlFor="np">Mot de passe (8 caractères minimum)</label><input id="np" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
        {err && <div className="err">{err}</div>}
        {msg && <div className="ok">{msg}</div>}
        <button className="btn dark">Enregistrer</button>
      </form>
    </div>
  )
}
