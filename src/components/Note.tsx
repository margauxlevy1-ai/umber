import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { timeAgo } from '../lib/format'

const OPEN_KEY = 'umber-note-open'

// Pense-bête personnel : un bouton toujours visible, une note qui s'ouvre et se referme.
// Enregistrement automatique, visible par soi seul.
export function Note() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
  })
  const [body, setBody] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.getNote().then(setBody).catch(() => setBody(''))
  }, [])

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch { /* rien */ }
    if (open) requestAnimationFrame(() => area.current?.focus())
  }, [open])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
      // Ctrl/Cmd + J ouvre ou ferme le pense-bête
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((o) => !o) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  async function flush() {
    window.clearTimeout(timer.current)
    const v = pending.current
    if (v === null) return
    pending.current = null
    setState('saving')
    try {
      await api.saveNote(v)
      setState('saved')
      setSavedAt(new Date().toISOString())
    } catch {
      pending.current = v
      setState('error')
    }
  }

  // Ne rien perdre en fermant l'onglet
  useEffect(() => {
    const before = () => { if (pending.current !== null) api.saveNote(pending.current) }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [])

  function change(v: string) {
    setBody(v)
    pending.current = v
    setState('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, 700)
  }

  function close() {
    flush()
    setOpen(false)
  }

  const filled = (body ?? '').trim().length > 0

  return (
    <>
      <button
        className={'note-fab' + (open ? ' on' : '') + (filled ? ' filled' : '')}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? 'Fermer mon pense-bête' : 'Ouvrir mon pense-bête'}
        title="Mon pense-bête (Ctrl + J)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v11l-5 5H5z" /><path d="M14 20v-5h5" /><path d="M8 9h8M8 12.5h5" /></svg>
      </button>
      {open && (
        <aside className="note" role="dialog" aria-label="Mon pense-bête">
          <div className="note-head">
            <span className="note-ttl">Mon pense-bête</span>
            <span className="note-st">
              {state === 'saving' ? 'Enregistrement…' : state === 'error' ? 'Pas enregistré, réessai à la prochaine frappe' : savedAt ? `Enregistré ${timeAgo(savedAt)}` : 'Visible par toi uniquement'}
            </span>
            <button className="note-x" onClick={close} aria-label="Fermer">×</button>
          </div>
          <textarea
            ref={area}
            value={body ?? ''}
            disabled={body === null}
            onChange={(e) => change(e.target.value)}
            onBlur={flush}
            placeholder={body === null ? 'Chargement…' : 'Rappeler le traiteur, idée de déco pour More, prix vu chez…'}
            aria-label="Mon pense-bête"
          />
        </aside>
      )}
    </>
  )
}
