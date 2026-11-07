import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { fileExt, fileSize, timeAgo } from '../lib/format'
import { space as spaceOf, num } from '../lib/spaces'
import { FILE_FOLDERS } from '../lib/modules'
import { useStore } from '../lib/store'
import type { FileRec } from '../lib/types'
import { useToast } from './ui'

const MAX = 50 * 1024 * 1024

export function FilesPanel({ projectId, space, onCount, showSpace }: {
  projectId: string
  space?: number
  onCount?: (n: number) => void
  showSpace?: boolean
}) {
  const { canEdit, person } = useStore()
  const toast = useToast()
  const [files, setFiles] = useState<FileRec[] | null>(null)
  const [hot, setHot] = useState(false)
  const [busy, setBusy] = useState(0)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [folder, setFolder] = useState('')
  const [everything, setEverything] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const editable = space && !everything ? canEdit(projectId, space) : false
  const allSpaces = showSpace || everything

  async function load() {
    const f = await api.listFiles(projectId, everything ? undefined : space)
    setFiles(f)
    onCount?.(f.length)
    const t: Record<string, string> = {}
    await Promise.all(
      f.filter((x) => x.mime.startsWith('image/')).slice(0, 24).map(async (x) => {
        try { t[x.id] = await api.fileUrl(x) } catch { /* pas d'aperçu */ }
      }),
    )
    setThumbs(t)
  }
  useEffect(() => {
    setFiles(null)
    load().catch(toast.fail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, space, everything])

  async function upload(list: FileList | File[]) {
    if (!space) return
    const arr = [...list]
    for (const f of arr) {
      if (f.size > MAX) { toast.fail(`${f.name} dépasse 50 Mo.`); continue }
      setBusy((b) => b + 1)
      try {
        await api.uploadFile(projectId, space, f, folder)
      } catch (e) {
        toast.fail(e)
      } finally {
        setBusy((b) => b - 1)
      }
    }
    await load()
    if (arr.length) toast.ok(arr.length > 1 ? `${arr.length} fichiers ajoutés` : 'Fichier ajouté')
  }

  async function open(f: FileRec) {
    try {
      window.open(await api.fileUrl(f), '_blank', 'noopener')
    } catch (e) {
      toast.fail(e)
    }
  }

  const folders = [...new Set([...(space ? FILE_FOLDERS[space] ?? [] : []), ...(files ?? []).map((f) => f.category).filter(Boolean)])]
  const shown = (files ?? []).filter((f) => !folder || f.category === folder)

  return (
    <div className="stack" style={{ gap: 14 }}>
      {(folders.length > 0 || space === 6) && (
        <div className="row">
          {space === 6 && (
            <>
              <button className={'tab' + (!everything ? ' on' : '')} onClick={() => setEverything(false)}>Ressources</button>
              <button className={'tab' + (everything ? ' on' : '')} onClick={() => { setEverything(true); setFolder('') }}>Tous les fichiers du projet</button>
              {folders.length > 0 && !everything && <span style={{ width: 1, height: 22, background: 'var(--line)' }} />}
            </>
          )}
          {!everything && folders.length > 0 && (
            <>
              <button className={'tab' + (!folder ? ' on' : '')} onClick={() => setFolder('')}>Tout · {files?.length ?? 0}</button>
              {folders.map((d) => (
                <button key={d} className={'tab' + (folder === d ? ' on' : '')} onClick={() => setFolder(d)}>
                  {d} · {(files ?? []).filter((f) => f.category === d).length}
                </button>
              ))}
            </>
          )}
        </div>
      )}
      {editable && (
        <div
          className={'drop' + (hot ? ' hot' : '')}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setHot(true) }}
          onDragLeave={() => setHot(false)}
          onDrop={(e) => { e.preventDefault(); setHot(false); upload(e.dataTransfer.files) }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        >
          {busy > 0 ? 'Envoi en cours…' : `Glisse tes fichiers ici, ou clique pour en choisir (50 Mo max par fichier)${folder ? `. Ils iront dans « ${folder} ».` : ''}`}
          <input ref={input} type="file" multiple hidden onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = '' }} />
        </div>
      )}
      {files === null ? (
        <div className="sub">Chargement…</div>
      ) : shown.length === 0 ? (
        <div className="empty">Aucun fichier ici pour l'instant.</div>
      ) : (
        <div className="files">
          {shown.map((f) => (
            <div key={f.id} className="file">
              <button className="prev" onClick={() => open(f)} style={{ border: 0, padding: 0, cursor: 'pointer', width: '100%' }} aria-label={`Ouvrir ${f.name}`}>
                {thumbs[f.id] ? <img src={thumbs[f.id]} alt="" /> : <span className="fi">{fileExt(f.name)}</span>}
              </button>
              <div className="meta">
                <b title={f.name}>{f.name}</b>
                <span className="sub" style={{ fontSize: 11 }}>
                  {allSpaces && <>{num(f.space)} {spaceOf(f.space).name} · </>}
                  {fileSize(f.size)} · {person(f.uploaded_by)?.full_name.split(' ')[0] ?? '–'}, {timeAgo(f.created_at)}
                </span>
                {canEdit(f.project_id, f.space) && folders.length > 0 && !allSpaces && (
                  <select className="cell-sel" style={{ fontSize: 12, padding: '2px 0', color: 'var(--muted)' }} value={f.category}
                    onChange={async (e) => { try { await api.updateFile(f.id, { category: e.target.value }); await load() } catch (x) { toast.fail(x) } }}
                    aria-label={`Dossier de ${f.name}`}>
                    <option value="">Sans dossier</option>
                    {folders.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {canEdit(f.project_id, f.space) && (
                  <button
                    className="btn ghost sm danger"
                    style={{ alignSelf: 'flex-start', padding: '2px 0', marginTop: 2 }}
                    onClick={async () => {
                      if (!confirm(`Supprimer ${f.name} ?`)) return
                      try { await api.deleteFile(f); await load() } catch (e) { toast.fail(e) }
                    }}
                  >Supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
