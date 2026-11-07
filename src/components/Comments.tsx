import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { api } from '../lib/api'
import { MENTION_RE, firstName, mentionIds, timeAgo } from '../lib/format'
import { useStore } from '../lib/store'
import type { Comment, Profile } from '../lib/types'
import { Avatar, useToast } from './ui'

export function renderBody(body: string): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of body.matchAll(MENTION_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push(body.slice(last, i))
    out.push(<span key={i} className="men">@{m[1]}</span>)
    last = i + m[0].length
  }
  if (last < body.length) out.push(body.slice(last))
  return out.map((x, i) => <Fragment key={i}>{x}</Fragment>)
}

// Champ de saisie avec mentions : taper @ ouvre la liste des membres.
// Le texte affiché garde « @Prénom » ; on le convertit en @[Prénom](id) à l'envoi.
export function MentionBox({ people, onSend, placeholder, disabled }: {
  people: Profile[]
  onSend: (body: string, mentions: string[]) => Promise<void>
  placeholder?: string
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<Profile[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [hi, setHi] = useState(0)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const caret = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (caret.current === null || !ref.current) return
    ref.current.focus()
    ref.current.setSelectionRange(caret.current, caret.current)
    caret.current = null
  }, [text])

  const matches = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return people.filter((p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().startsWith(q)).slice(0, 6)
  }, [query, people])

  function onChange(v: string) {
    setText(v)
    const pos = ref.current?.selectionStart ?? v.length
    const m = v.slice(0, pos).match(/(^|\s)@([^\s@]{0,20})$/)
    setQuery(m ? m[2] : null)
    setHi(0)
  }

  function choose(p: Profile) {
    const el = ref.current
    const pos = el?.selectionStart ?? text.length
    const before = text.slice(0, pos).replace(/@([^\s@]{0,20})$/, '@' + firstName(p.full_name) + ' ')
    const next = before + text.slice(pos)
    setText(next)
    setPicked((x) => (x.some((y) => y.id === p.id) ? x : [...x, p]))
    setQuery(null)
    caret.current = before.length
  }

  function encode(): string {
    let body = text
    for (const p of picked) {
      const name = firstName(p.full_name)
      body = body.replace(new RegExp('@' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\wÀ-ÿ])', 'g'), `@[${name}](${p.id})`)
    }
    return body.trim()
  }

  async function send() {
    const body = encode()
    if (!body || busy) return
    setBusy(true)
    try {
      await onSend(body, mentionIds(body))
      setText('')
      setPicked([])
    } catch {
      /* l'erreur est déjà affichée, on garde le texte */
    } finally {
      setBusy(false)
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % matches.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + matches.length) % matches.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(matches[hi]); return }
      if (e.key === 'Escape') { setQuery(null); return }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
  }

  return (
    <div className="composer">
      {matches.length > 0 && (
        <div className="pop" role="listbox">
          {matches.map((p, i) => (
            <button key={p.id} type="button" className={i === hi ? 'hi' : ''} onMouseDown={(e) => { e.preventDefault(); choose(p) }}>
              <Avatar p={p} /> {p.full_name}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        className="input"
        value={text}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder ?? 'Écris un message. Tape @ pour mentionner quelqu’un.'}
        aria-label="Message"
      />
      <div className="row between">
        <span className="sub" style={{ fontSize: 12 }}>@ pour mentionner, Ctrl + Entrée pour envoyer</span>
        <button className="btn dark sm" onClick={send} disabled={busy || !text.trim() || disabled}>Envoyer</button>
      </div>
    </div>
  )
}

export function Thread({ projectId, space, taskId, onCount }: {
  projectId: string
  space: number
  taskId: string | null
  onCount?: (n: number) => void
}) {
  const { person, membersOf, me, staff, refreshInbox } = useStore()
  const toast = useToast()
  const [items, setItems] = useState<Comment[] | null>(null)

  async function load() {
    const c = await api.listComments(projectId, space, taskId)
    setItems(c)
    onCount?.(c.length)
  }
  useEffect(() => {
    setItems(null)
    load().catch(toast.fail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, space, taskId])

  const people = membersOf(projectId, space).filter((p) => p.id !== me?.id)

  return (
    <div className="stack" style={{ gap: 16 }}>
      {items === null ? (
        <div className="sub">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="sub">Aucun message pour l'instant.</div>
      ) : (
        <div className="cmts">
          {items.map((c) => {
            const a = person(c.author_id)
            return (
              <div key={c.id} className="cmt">
                <Avatar p={a} lg />
                <div>
                  <div className="by">
                    <b>{a?.full_name ?? 'Ancien membre'}</b>
                    <span>{timeAgo(c.created_at)}</span>
                    {(c.author_id === me?.id || staff) && (
                      <button
                        onClick={async () => {
                          if (!confirm('Supprimer ce message ?')) return
                          try { await api.deleteComment(c.id); await load() } catch (e) { toast.fail(e) }
                        }}
                      >Supprimer</button>
                    )}
                  </div>
                  <div className="bub">{renderBody(c.body)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <MentionBox
        people={people}
        onSend={async (body, mentions) => {
          try {
            await api.addComment({ project_id: projectId, space, task_id: taskId, body, mentions })
            await load()
            refreshInbox()
          } catch (e) {
            toast.fail(e)
            throw e
          }
        }}
      />
    </div>
  )
}
