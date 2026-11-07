import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { keep, peek } from '../lib/cache'
import { shortDate } from '../lib/format'
import { MODULES, euros, num, type Collection, type Field, type Sheet, type Tone } from '../lib/modules'
import { useStore } from '../lib/store'
import type { Entry, FileRec } from '../lib/types'
import { Avatar, useToast } from './ui'

const TONE: Record<Tone, string> = { ok: 's-ok', due: 's-due', late: 's-late', mute: 's-mute', info: 's-info' }

export function Pill({ field, value }: { field: Field; value: unknown }) {
  const v = String(value ?? '')
  if (!v) return <span className="sub">–</span>
  const tone = field.tones?.[v]
  return <span className={'tag ' + (tone ? TONE[tone] : 's-mute')}>{v}</span>
}

interface Ctx {
  editable: boolean
  files: FileRec[]
  projectId: string
  space: number
  onUpload: (f: File) => Promise<FileRec | null>
  openFile: (id: string) => void
}

function FileChip({ id, ctx }: { id: string; ctx: Ctx }) {
  const f = ctx.files.find((x) => x.id === id)
  if (!f) return <span className="sub">Fichier supprimé</span>
  return (
    <button type="button" className="fchip" onClick={() => ctx.openFile(id)} title={f.name}>
      <span className="ext">{(f.name.match(/\.([a-z0-9]{1,4})$/i)?.[1] ?? 'fich').toUpperCase()}</span>
      <span className="nm">{f.name}</span>
    </button>
  )
}

// Valeur affichée (lecture seule)
export function Show({ field, value, ctx }: { field: Field; value: unknown; ctx: Ctx }) {
  const { person } = useStore()
  if (value === undefined || value === null || value === '') return <span className="sub">–</span>
  switch (field.type) {
    case 'money': return <>{euros(num(value))}</>
    case 'date': return <>{shortDate(String(value))}</>
    case 'select': return <Pill field={field} value={value} />
    case 'person': {
      const p = person(String(value))
      return <span className="who"><Avatar p={p} />{p?.full_name.split(' ')[0]}</span>
    }
    case 'file': return <FileChip id={String(value)} ctx={ctx} />
    case 'url': return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="link-cut">{String(value).replace(/^https?:\/\//, '')}</a>
    default: return <>{String(value)}</>
  }
}

// Champ modifiable
export function Edit({ field, value, ctx, onSave, block }: {
  field: Field
  value: unknown
  ctx: Ctx
  onSave: (v: unknown) => void
  block?: boolean
}) {
  const { membersOf } = useStore()
  const [local, setLocal] = useState(value ?? '')
  const [focus, setFocus] = useState(false)
  const fileIn = useRef<HTMLInputElement>(null)
  useEffect(() => setLocal(value ?? ''), [value])
  const cls = block ? 'input' : 'cell-in'

  const commit = (v: unknown) => {
    const clean = field.type === 'money' || field.type === 'number' ? (String(v).trim() === '' ? null : num(v)) : v
    if (clean !== (value ?? (field.type === 'money' || field.type === 'number' ? null : ''))) onSave(clean)
  }

  switch (field.type) {
    case 'select':
      return (
        <select className={block ? 'input' : 'cell-sel'} value={String(local)} onChange={(e) => { setLocal(e.target.value); onSave(e.target.value) }} aria-label={field.label}>
          <option value="">–</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    case 'person':
      return (
        <select className={block ? 'input' : 'cell-sel'} value={String(local)} onChange={(e) => { setLocal(e.target.value); onSave(e.target.value || null) }} aria-label={field.label}>
          <option value="">Personne</option>
          {membersOf(ctx.projectId, ctx.space).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      )
    case 'date':
      return <input type="date" className={cls} value={String(local)} onChange={(e) => { setLocal(e.target.value); onSave(e.target.value || null) }} aria-label={field.label} />
    case 'longtext':
      return (
        <textarea className="input" rows={4} value={String(local)} placeholder={field.placeholder}
          onChange={(e) => setLocal(e.target.value)} onBlur={() => commit(local)} aria-label={field.label} />
      )
    case 'file':
      return (
        <span className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
          {value ? <FileChip id={String(value)} ctx={ctx} /> : null}
          <select
            className={block ? 'input' : 'cell-sel'}
            style={value && !block ? { width: 26, padding: '5px 2px' } : undefined}
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (v === '__up') fileIn.current?.click()
              else if (v === '__none') onSave(null)
              else if (v) onSave(v)
            }}
            aria-label={field.label}
          >
            <option value="">{value ? '' : 'Joindre…'}</option>
            <option value="__up">Envoyer un fichier…</option>
            {ctx.files.length > 0 && (
              <optgroup label="Fichiers de l’espace">
                {ctx.files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
            )}
            {value ? <option value="__none">Retirer le fichier</option> : null}
          </select>
          <input ref={fileIn} type="file" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const rec = await ctx.onUpload(f)
            if (rec) onSave(rec.id)
          }} />
        </span>
      )
    default: {
      const isNum = field.type === 'money' || field.type === 'number'
      const input = (
        <input
          className={cls + (isNum ? ' num' : '')}
          type={field.type === 'url' ? 'url' : 'text'}
          inputMode={isNum ? 'decimal' : undefined}
          value={String(local ?? '')}
          style={field.type === 'money' && !focus && local !== '' && local !== null ? { color: 'transparent' } : undefined}
          placeholder={field.placeholder ?? (field.type === 'money' ? '0 €' : '')}
          onFocus={() => setFocus(true)}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => { setFocus(false); commit(local) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label={field.label}
        />
      )
      if (field.type !== 'money') return input
      // Montant affiché « 2 400 € » par-dessus le champ, sans toucher à sa valeur
      return (
        <span className={'money-wrap' + (block ? ' block' : '')}>
          {input}
          {!focus && local !== '' && local !== null && <span className="money-show" aria-hidden="true">{euros(num(local))}</span>}
        </span>
      )
    }
  }
}

// ---------------------------------------------------------------- vue d'un espace

export function ModuleView({ projectId, space }: { projectId: string; space: number }) {
  const { canEdit } = useStore()
  const toast = useToast()
  const mod = MODULES[space]
  const ekey = `entries:${projectId}:${space}`
  const [entries, setEntriesRaw] = useState<Entry[] | null>(() => peek<Entry[]>(ekey))
  const setEntries = (v: Entry[] | null | ((l: Entry[] | null) => Entry[] | null)) =>
    setEntriesRaw((cur) => {
      const next = typeof v === 'function' ? v(cur) : v
      if (next) keep<Entry[]>(ekey)(next)
      return next
    })
  const [files, setFiles] = useState<FileRec[]>(() => peek<FileRec[]>(`files:${projectId}:${space}`) ?? [])
  const [open, setOpen] = useState<{ e: Entry; c: Collection } | null>(null)
  const editable = canEdit(projectId, space)

  const loadFiles = () => api.listFiles(projectId, space).then(keep(`files:${projectId}:${space}`)).then(setFiles).catch(() => setFiles([]))
  useEffect(() => {
    setEntriesRaw(peek<Entry[]>(ekey))
    api.listEntries(projectId, space).then(setEntries).catch(toast.fail)
    loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, space])

  const ctx: Ctx = {
    editable, files, projectId, space,
    onUpload: async (f) => {
      try {
        const rec = await api.uploadFile(projectId, space, f)
        await loadFiles()
        return rec
      } catch (e) {
        toast.fail(e)
        return null
      }
    },
    openFile: async (id) => {
      const f = files.find((x) => x.id === id)
      if (!f) return
      try { window.open(await api.fileUrl(f), '_blank', 'noopener') } catch (e) { toast.fail(e) }
    },
  }

  async function save(e: Entry, patch: { title?: string; key?: string; value?: unknown }) {
    const next: Entry = { ...e, title: patch.title ?? e.title, data: patch.key ? { ...e.data, [patch.key]: patch.value } : e.data }
    setEntries((list) => list?.map((x) => (x.id === e.id ? next : x)) ?? null)
    setOpen((o) => (o && o.e.id === e.id ? { ...o, e: next } : o))
    try {
      await api.updateEntry(e.id, { title: next.title, data: next.data })
    } catch (err) {
      toast.fail(err)
      setEntries((list) => list?.map((x) => (x.id === e.id ? e : x)) ?? null)
    }
  }
  async function add(c: Collection, title: string, data: Record<string, unknown> = {}) {
    try {
      const e = await api.createEntry({ project_id: projectId, space, kind: c.kind, title, data })
      setEntries((list) => [...(list ?? []), e])
      return e
    } catch (err) {
      toast.fail(err)
      return null
    }
  }
  async function remove(e: Entry) {
    if (!confirm(`Supprimer « ${e.title || 'cette ligne'} » ?`)) return
    try {
      await api.deleteEntry(e.id)
      setEntries((list) => list?.filter((x) => x.id !== e.id) ?? null)
      setOpen(null)
    } catch (err) {
      toast.fail(err)
    }
  }

  if (!mod) return null
  if (entries === null) return <div className="card sub">Chargement…</div>

  return (
    <div className="stack" style={{ gap: 16 }}>
      {space === 2 && <BudgetStats entries={entries} />}
      {mod.sheet && (
        <SheetBlock sheet={mod.sheet} entry={entries.find((e) => e.kind === mod.sheet!.kind)} ctx={ctx}
          onSave={async (key, value) => {
            const cur = entries.find((e) => e.kind === mod.sheet!.kind)
            if (cur) save(cur, { key, value })
            else await add({ kind: mod.sheet!.kind } as Collection, mod.sheet!.label, { [key]: value })
          }} />
      )}
      {mod.collections.map((c) => {
        const list = entries.filter((e) => e.kind === c.kind)
        const props = { c, list, ctx, onSave: save, onAdd: add, onOpen: (e: Entry) => setOpen({ e, c }) }
        return (
          <section key={c.kind} className="card">
            <div className="row between" style={{ marginBottom: 8 }}>
              <div><h2>{c.label} <span className="sub" style={{ fontWeight: 500 }}>{list.length || ''}</span></h2>{c.hint && <div className="sub">{c.hint}</div>}</div>
            </div>
            {c.view === 'kanban' ? <Kanban {...props} /> : c.view === 'cards' ? <Cards {...props} /> : <Table {...props} />}
          </section>
        )
      })}
      {open && (
        <EntryDrawer entry={open.e} c={open.c} ctx={ctx} onClose={() => setOpen(null)}
          onSave={(p) => save(open.e, p)} onDelete={() => remove(open.e)} />
      )}
    </div>
  )
}

function BudgetStats({ entries }: { entries: Entry[] }) {
  const total = num(entries.find((e) => e.kind === 'budget')?.data.total)
  const lines = entries.filter((e) => e.kind === 'line')
  const committed = lines.reduce((a, e) => a + num(e.data.committed), 0)
  const paid = lines.reduce((a, e) => a + num(e.data.paid), 0)
  const pct = total ? Math.round((committed / total) * 100) : null
  return (
    <div className="stats">
      <div className="card stat"><div className="k">Budget du projet</div><div className="v">{total ? euros(total) : '–'}</div><div className="sub">HT</div></div>
      <div className="card stat"><div className="k">Engagé</div><div className="v" style={{ color: total && committed > total ? 'var(--late)' : undefined }}>{euros(committed)}</div><div className="sub">{pct !== null ? `${pct} % du budget` : 'sur les lignes'}</div></div>
      <div className="card stat"><div className="k">Payé</div><div className="v">{euros(paid)}</div><div className="sub">{euros(committed - paid)} restent à payer</div></div>
      <div className="card stat"><div className="k">Reste à engager</div><div className="v">{total ? euros(total - committed) : '–'}</div><div className="sub">{total ? (committed > total ? 'Budget dépassé' : 'disponible') : 'Saisis le budget plus bas'}</div></div>
    </div>
  )
}

function SheetBlock({ sheet, entry, ctx, onSave }: { sheet: Sheet; entry?: Entry; ctx: Ctx; onSave: (key: string, v: unknown) => void }) {
  return (
    <section className="card">
      <h2 style={{ marginBottom: 10 }}>{sheet.label}</h2>
      <div className="sheet">
        {sheet.fields.map((f) => (
          <div key={f.key} className={'f' + (f.wide ? ' wide' : '')}>
            <span className="l">{f.label}</span>
            {ctx.editable ? <Edit field={f} value={entry?.data[f.key]} ctx={ctx} onSave={(v) => onSave(f.key, v)} block />
              : <span style={{ fontSize: 15 }}><Show field={f} value={entry?.data[f.key]} ctx={ctx} /></span>}
          </div>
        ))}
      </div>
    </section>
  )
}

interface ListProps {
  c: Collection
  list: Entry[]
  ctx: Ctx
  onSave: (e: Entry, p: { title?: string; key?: string; value?: unknown }) => void
  onAdd: (c: Collection, title: string, data?: Record<string, unknown>) => Promise<Entry | null>
  onOpen: (e: Entry) => void
}

function AddLine({ label, onAdd }: { label: string; onAdd: (t: string) => Promise<unknown> }) {
  const [t, setT] = useState('')
  const go = async () => {
    const v = t.trim()
    if (!v) return
    setT('')
    await onAdd(v)
  }
  return (
    <input className="add-in" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} onBlur={go}
      placeholder={`+ ${label} (Entrée pour valider)`} aria-label={label} />
  )
}

function Filter({ c, list, value, set }: { c: Collection; list: Entry[]; value: string; set: (v: string) => void }) {
  const f = c.fields.find((x) => x.key === c.filterKey)
  if (!f?.options) return null
  const used = f.options.filter((o) => list.some((e) => e.data[f.key] === o))
  if (used.length < 2 && !value) return null
  return (
    <div className="row" style={{ marginBottom: 10 }}>
      <button className={'tab' + (!value ? ' on' : '')} onClick={() => set('')}>Tout · {list.length}</button>
      {used.map((o) => (
        <button key={o} className={'tab' + (value === o ? ' on' : '')} onClick={() => set(o)}>
          {o} · {list.filter((e) => e.data[f.key] === o).length}
        </button>
      ))}
    </div>
  )
}

function Table({ c, list, ctx, onSave, onAdd, onOpen }: ListProps) {
  const [filter, setFilter] = useState('')
  const cols = c.fields.filter((f) => !f.hideInTable)
  const hasMore = c.fields.some((f) => f.hideInTable)
  const shown = filter && c.filterKey ? list.filter((e) => e.data[c.filterKey!] === filter) : list
  return (
    <>
      {c.filterKey && <Filter c={c} list={list} value={filter} set={setFilter} />}
      <div className="wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>{c.titleLabel}</th>
              {cols.map((f) => <th key={f.key} className={f.type === 'money' || f.type === 'number' ? 'r' : ''}>{f.label}</th>)}
              {c.computed && <th className="r">{c.computed.label}</th>}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td className="t-title" data-label={c.titleLabel}>
                  {ctx.editable ? (
                    <Edit field={{ key: 'title', label: c.titleLabel, type: 'text' }} value={e.title} ctx={ctx} onSave={(v) => onSave(e, { title: String(v ?? '') })} />
                  ) : <b>{e.title}</b>}
                </td>
                {cols.map((f) => (
                  <td key={f.key} data-label={f.label} className={(f.type === 'money' || f.type === 'number' ? 'r ' : '') + (f.wide ? 'w' : '')}>
                    {ctx.editable ? <Edit field={f} value={e.data[f.key]} ctx={ctx} onSave={(v) => onSave(e, { key: f.key, value: v })} />
                      : <Show field={f} value={e.data[f.key]} ctx={ctx} />}
                  </td>
                ))}
                {c.computed && (
                  <td className="r" data-label={c.computed.label}>
                    {(() => { const v = c.computed!.value(e); return v === null ? '–' : c.computed!.money ? euros(v) : v })()}
                  </td>
                )}
                <td className="r acts">
                  <button className="btn ghost sm" onClick={() => onOpen(e)}>{hasMore ? 'Détails' : 'Ouvrir'}</button>
                </td>
              </tr>
            ))}
            {c.totals && shown.length > 0 && (
              <tr className="tot">
                <td>Total</td>
                {cols.map((f) => (
                  <td key={f.key} className="r">{c.totals!.includes(f.key) ? euros(shown.reduce((a, e) => a + num(e.data[f.key]), 0)) : ''}</td>
                ))}
                {c.computed && <td />}
                <td />
              </tr>
            )}
            {c.computed?.money && shown.length > 0 && !c.totals && (
              <tr className="tot">
                <td>Total</td>
                {cols.map((f) => <td key={f.key} />)}
                <td className="r">{euros(shown.reduce((a, e) => a + (c.computed!.value(e) ?? 0), 0))}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && !ctx.editable && <div className="empty">Rien pour l'instant.</div>}
      {ctx.editable && <AddLine label={c.addLabel} onAdd={(t) => onAdd(c, t, filter && c.filterKey ? { [c.filterKey]: filter } : {})} />}
    </>
  )
}

function Kanban({ c, list, ctx, onSave, onAdd, onOpen }: ListProps) {
  const { person } = useStore()
  const [filter, setFilter] = useState('')
  const [over, setOver] = useState<string | null>(null)
  const stage = c.fields.find((f) => f.key === c.stageKey)!
  const dir = c.fields.find((f) => f.key === c.filterKey)
  const offer = c.fields.find((f) => f.key === 'offer')
  const shown = filter && c.filterKey ? list.filter((e) => e.data[c.filterKey!] === filter) : list
  const stages = stage.options ?? []
  return (
    <>
      {dir?.options && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={'tab' + (!filter ? ' on' : '')} onClick={() => setFilter('')}>Tous · {list.length}</button>
          {dir.options.map((o) => (
            <button key={o} className={'tab' + (filter === o ? ' on' : '')} onClick={() => setFilter(o)}>{o} · {list.filter((e) => e.data[dir.key] === o).length}</button>
          ))}
        </div>
      )}
      <div className="kanban">
        {stages.map((s, i) => {
          const items = shown.filter((e) => (e.data[stage.key] ?? stages[0]) === s)
          return (
            <div key={s} className={'kcol' + (over === s ? ' over' : '')}
              onDragOver={(ev) => { if (ctx.editable) { ev.preventDefault(); setOver(s) } }}
              onDragLeave={() => setOver(null)}
              onDrop={(ev) => {
                ev.preventDefault()
                setOver(null)
                const e = list.find((x) => x.id === ev.dataTransfer.getData('text/plain'))
                if (e && e.data[stage.key] !== s) onSave(e, { key: stage.key, value: s })
              }}>
              <div className="khead"><span>{s}</span><span className="sub">{items.length}</span></div>
              {items.map((e) => {
                const owner = person(String(e.data.owner ?? ''))
                return (
                  <button key={e.id} className="kcard" draggable={ctx.editable}
                    onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)} onClick={() => onOpen(e)}>
                    {dir && e.data[dir.key] ? <span className="kdir">{String(e.data[dir.key])}</span> : null}
                    <b>{e.title}</b>
                    {offer && e.data.offer ? <span className="sub">{String(e.data.offer)}</span> : null}
                    <span className="row between" style={{ width: '100%' }}>
                      <span className="sub" style={{ fontSize: 11 }}>{e.data.next ? `Prochaine étape ${shortDate(String(e.data.next))}` : ''}</span>
                      {owner && <Avatar p={owner} />}
                    </span>
                  </button>
                )
              })}
              {ctx.editable && i === 0 && (
                <AddLine label={c.addLabel} onAdd={(t) => onAdd(c, t, { [stage.key]: s, ...(filter && c.filterKey ? { [c.filterKey]: filter } : {}) })} />
              )}
            </div>
          )
        })}
      </div>
      {ctx.editable && <div className="sub" style={{ marginTop: 8 }}>Glisse une carte d'une colonne à l'autre pour changer d'étape, ou ouvre-la pour tout modifier.</div>}
    </>
  )
}

function Cards({ c, list, ctx, onSave, onAdd, onOpen }: ListProps) {
  const [filter, setFilter] = useState('')
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const status = c.fields.find((f) => f.key === 'status')
  const visualKey = c.fields.find((f) => f.type === 'file')?.key ?? ''
  const shown = filter && c.filterKey ? list.filter((e) => e.data[c.filterKey!] === filter) : list
  const ids = useMemo(() => list.map((e) => String(e.data[visualKey] ?? '')).filter(Boolean).join(','), [list, visualKey])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const t: Record<string, string> = {}
      for (const id of ids.split(',').filter(Boolean)) {
        const f = ctx.files.find((x) => x.id === id)
        if (f && f.mime.startsWith('image/')) {
          try { t[id] = await api.fileUrl(f) } catch { /* pas d'aperçu */ }
        }
      }
      if (alive) setThumbs(t)
    })()
    return () => { alive = false }
  }, [ids, ctx.files])

  return (
    <>
      {c.filterKey && <Filter c={c} list={list} value={filter} set={setFilter} />}
      <div className="pcards">
        {shown.map((e) => {
          const vid = String(e.data[visualKey] ?? '')
          const f = ctx.files.find((x) => x.id === vid)
          return (
            <div key={e.id} className="pcard">
              <button className="pprev" onClick={() => onOpen(e)} aria-label={`Ouvrir ${e.title}`}>
                {thumbs[vid] ? <img src={thumbs[vid]} alt="" /> : <span className="fi">{f ? (f.name.match(/\.([a-z0-9]{1,4})$/i)?.[1] ?? 'fich').toUpperCase() : 'Visuel'}</span>}
              </button>
              <div className="pbody">
                <b>{e.title}</b>
                <span className="sub" style={{ fontSize: 12 }}>{[e.data.folder, e.data.version].filter(Boolean).join(' · ')}</span>
                <div className="row between">
                  {status && <Pill field={status} value={e.data.status} />}
                  {ctx.editable && status && e.data.status !== 'Validé' && (
                    <span className="row" style={{ gap: 4 }}>
                      <button className="btn sm" onClick={() => onSave(e, { key: 'status', value: 'À revoir' })}>À revoir</button>
                      <button className="btn dark sm" onClick={() => onSave(e, { key: 'status', value: 'Validé' })}>Valider</button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {ctx.editable && (
          <div className="pcard new">
            <AddLine label={c.addLabel} onAdd={(t) => onAdd(c, t, { status: 'Brouillon', ...(filter && c.filterKey ? { [c.filterKey]: filter } : {}) })} />
          </div>
        )}
      </div>
      {shown.length === 0 && !ctx.editable && <div className="empty">Aucune proposition pour l'instant.</div>}
    </>
  )
}

function EntryDrawer({ entry, c, ctx, onClose, onSave, onDelete }: {
  entry: Entry
  c: Collection
  ctx: Ctx
  onClose: () => void
  onSave: (p: { title?: string; key?: string; value?: unknown }) => void
  onDelete: () => void
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const rows: ReactNode[] = c.fields.map((f) => (
    <div key={f.key} className="f">
      <span className="l">{f.label}</span>
      {ctx.editable ? <Edit field={f} value={entry.data[f.key]} ctx={ctx} onSave={(v) => onSave({ key: f.key, value: v })} block />
        : <span style={{ whiteSpace: 'pre-wrap' }}><Show field={f} value={entry.data[f.key]} ctx={ctx} /></span>}
    </div>
  ))
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={entry.title}>
        <div className="row between">
          <span className="sub">{c.label}</span>
          <button className="btn ghost sm" onClick={onClose}>Fermer</button>
        </div>
        {ctx.editable ? (
          <input className="ttl-in" defaultValue={entry.title} key={entry.id} aria-label={c.titleLabel}
            onBlur={(e) => e.target.value.trim() !== entry.title && onSave({ title: e.target.value.trim() })} />
        ) : <h2 className="serif" style={{ fontSize: 28 }}>{entry.title}</h2>}
        <div className="stack" style={{ gap: 14 }}>{rows}</div>
        {ctx.editable && (
          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
            <button className="btn danger sm" onClick={onDelete}>Supprimer</button>
          </div>
        )}
      </aside>
    </>
  )
}
