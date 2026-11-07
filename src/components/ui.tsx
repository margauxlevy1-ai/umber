import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { initials } from '../lib/format'
import type { Profile } from '../lib/types'

export function Avatar({ p, lg, title }: { p?: Profile; lg?: boolean; title?: string }) {
  if (!p) return <span className={'av empty' + (lg ? ' lg' : '')} title={title ?? 'Personne'}>?</span>
  return (
    <span className={'av' + (lg ? ' lg' : '')} style={{ background: p.color }} title={title ?? p.full_name}>
      {initials(p.full_name)}
    </span>
  )
}

export function Avatars({ people, max = 5 }: { people: Profile[]; max?: number }) {
  return (
    <span className="avs">
      {people.slice(0, max).map((p) => <Avatar key={p.id} p={p} />)}
      {people.length > max && <span className="av" style={{ background: '#B5AA9D' }}>+{people.length - max}</span>}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">Fermer</button>
        </div>
        {children}
      </div>
    </div>
  )
}

type Toast = { text: string; bad?: boolean } | null
const ToastCtx = createContext<(text: string, bad?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast>(null)
  useEffect(() => {
    if (!t) return
    const id = setTimeout(() => setT(null), 3500)
    return () => clearTimeout(id)
  }, [t])
  const show = useCallback((text: string, bad?: boolean) => setT({ text, bad }), [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={'toast' + (t.bad ? ' bad' : '')} role="status">{t.text}</div>}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const show = useContext(ToastCtx)
  return {
    ok: (text: string) => show(text),
    fail: (e: unknown) => show(e instanceof Error ? e.message : String(e), true),
  }
}

const paths: Record<string, ReactNode> = {
  home: <path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z" />,
  tasks: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  key: (<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M14 9l2 2" /></>),
  lock: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  pen: <path d="M4 20h4L20 8l-4-4L4 16zM14 6l4 4" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  clip: <path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
}

export function Icon({ name, size }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={size ? { width: size, height: size } : undefined}
      fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}
