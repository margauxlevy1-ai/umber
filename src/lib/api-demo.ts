import { isStaffRole } from './spaces'
import { plainText } from './format'
import { seed, type DemoDb } from './demo-data'
import type { Api, FileRec, Notification, Profile } from './types'

const KEY = 'umber-demo-v1'
const WHO = 'umber-demo-user'
const blobs = new Map<string, string>()

function svgFile(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560"><rect width="800" height="560" fill="${bg}"/><text x="400" y="290" font-family="Georgia" font-size="40" text-anchor="middle" fill="#1D1A17">${label}</text></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function freshDb(): DemoDb {
  const db = seed()
  const f = (id: string, project_id: string, space: number, name: string, bg: string, by: string): FileRec => ({
    id, project_id, space, name, path: svgFile(name.replace(/\.svg$/, ''), bg), size: 48_000, mime: 'image/svg+xml', uploaded_by: by,
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  })
  db.files = [
    f('f-1', 'p-presse', 5, 'Coffret presse option 1.svg', '#F2E7D8', 'u-margaux'),
    f('f-2', 'p-presse', 5, 'Coffret presse option 2.svg', '#E4EAF2', 'u-margaux'),
    f('f-3', 'p-presse', 5, 'Coffret presse option 3.svg', '#F4E2E0', 'u-margaux'),
    f('f-4', 'p-presse', 4, 'Plan de salle v2.svg', '#ECE3F0', 'u-tom'),
    f('f-5', 'p-presse', 6, 'Charte More 2026.svg', '#ECEAE6', 'u-sarah'),
  ]
  return db
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    /* stockage indisponible : on repart des données d'exemple */
  }
  return freshDb()
}

const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`
const nowIso = () => new Date().toISOString()
const delay = () => new Promise((r) => setTimeout(r, 60))

export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* rien */
  }
}

export function demoApi(): Api {
  let db = load()
  const listeners = new Set<() => void>()

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* quota dépassé : les données restent en mémoire */
    }
  }
  function who(): string | null {
    try {
      return localStorage.getItem(WHO)
    } catch {
      return null
    }
  }
  function me(): Profile {
    const p = db.profiles.find((x) => x.id === who())
    if (!p) throw new Error('Choisis une personne pour entrer dans la démo.')
    return p
  }
  const staff = () => isStaffRole(me().role)
  const userCanView = (uid: string, p: string, s: number) => {
    const u = db.profiles.find((x) => x.id === uid)
    if (!u) return false
    return isStaffRole(u.role) || db.access.some((a) => a.user_id === uid && a.project_id === p && a.space === s)
  }
  const canView = (p: string, s: number) => userCanView(me().id, p, s)
  const canEdit = (p: string, s: number) =>
    staff() || db.access.some((a) => a.user_id === me().id && a.project_id === p && a.space === s && a.level === 'edit')
  const canViewProject = (p: string) => staff() || db.access.some((a) => a.user_id === me().id && a.project_id === p)
  const deny = () => {
    throw new Error("Tu n'as pas les droits pour faire ça.")
  }
  function notify(n: Omit<Notification, 'id' | 'created_at' | 'read_at'>) {
    db.notifications.unshift({ ...n, id: id('n'), created_at: nowIso(), read_at: null })
  }

  return {
    demo: true,

    async currentUser() {
      const w = who()
      return db.profiles.find((x) => x.id === w) ?? null
    },
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email) {
      const p = db.profiles.find((x) => x.email === email.toLowerCase())
      if (!p) throw new Error('En démo, choisis une des personnes ci-dessous.')
      localStorage.setItem(WHO, p.id)
      listeners.forEach((l) => l())
    },
    async signUp() {
      throw new Error("La création de compte n'existe pas en démo.")
    },
    async sendMagicLink() {
      throw new Error("Pas d'email en démo.")
    },
    async resetPassword() {
      throw new Error("Pas d'email en démo.")
    },
    async updatePassword() {},
    async signOut() {
      localStorage.removeItem(WHO)
      listeners.forEach((l) => l())
    },
    async updateProfile(patch) {
      Object.assign(me(), patch)
      save()
    },
    async updateRole(userId, role) {
      if (me().role !== 'owner') deny()
      const p = db.profiles.find((x) => x.id === userId)
      if (p) p.role = role
      save()
    },

    async listProfiles() {
      await delay()
      const m = me()
      if (staff()) return db.profiles
      const mine = new Set(db.access.filter((a) => a.user_id === m.id).map((a) => a.project_id))
      const shared = new Set(db.access.filter((a) => mine.has(a.project_id)).map((a) => a.user_id))
      return db.profiles.filter((p) => p.id === m.id || isStaffRole(p.role) || shared.has(p.id))
    },
    async listClients() {
      await delay()
      if (staff()) return [...db.clients].sort((a, b) => a.name.localeCompare(b.name))
      return db.clients.filter((c) => db.projects.some((p) => p.client_id === c.id && canViewProject(p.id)))
    },
    async createClient(name, note) {
      if (!staff()) deny()
      const c = { id: id('c'), name, note, created_at: nowIso() }
      db.clients.push(c)
      save()
      return c
    },
    async updateClient(cid, patch) {
      if (!staff()) deny()
      Object.assign(db.clients.find((c) => c.id === cid) ?? {}, patch)
      save()
    },
    async listProjects() {
      await delay()
      return db.projects
        .filter((p) => canViewProject(p.id))
        .sort((a, b) => (a.event_date ?? '9999').localeCompare(b.event_date ?? '9999'))
    },
    async createProject(p) {
      if (!staff()) deny()
      const pr = { ...p, id: id('p'), created_at: nowIso() }
      db.projects.push(pr)
      save()
      return pr
    },
    async updateProject(pid, patch) {
      if (!staff()) deny()
      Object.assign(db.projects.find((p) => p.id === pid) ?? {}, patch)
      save()
    },
    async deleteProject(pid) {
      if (!staff()) deny()
      db.projects = db.projects.filter((p) => p.id !== pid)
      db.tasks = db.tasks.filter((t) => t.project_id !== pid)
      db.comments = db.comments.filter((t) => t.project_id !== pid)
      db.files = db.files.filter((t) => t.project_id !== pid)
      db.access = db.access.filter((t) => t.project_id !== pid)
      db.notifications = db.notifications.filter((t) => t.project_id !== pid)
      save()
    },

    async listAccess() {
      await delay()
      if (staff()) return db.access
      return db.access.filter((a) => a.user_id === me().id || canViewProject(a.project_id))
    },
    async setAccess(projectId, userId, sp, level) {
      if (!staff()) deny()
      db.access = db.access.filter((a) => !(a.project_id === projectId && a.user_id === userId && a.space === sp))
      if (level) db.access.push({ project_id: projectId, user_id: userId, space: sp, level })
      save()
    },
    async invite(email, fullName, role, access) {
      if (!staff()) deny()
      const e = email.toLowerCase()
      const existing = db.profiles.find((p) => p.email === e)
      if (existing) {
        for (const g of access) {
          db.access = db.access.filter((a) => !(a.project_id === g.project_id && a.user_id === existing.id && a.space === g.space))
          db.access.push({ ...g, user_id: existing.id })
        }
        save()
        return 'existing'
      }
      // En démo, la personne invitée « crée son compte » tout de suite.
      const colors = ['#5A3A6B', '#7A4A16', '#2E5B3B', '#615424']
      const p: Profile = { id: id('u'), email: e, full_name: fullName || e.split('@')[0], role, color: colors[db.profiles.length % colors.length] }
      db.profiles.push(p)
      access.forEach((g) => db.access.push({ ...g, user_id: p.id }))
      save()
      return 'invited'
    },
    async listInvitations() {
      return db.invitations
    },
    async cancelInvitation(email) {
      db.invitations = db.invitations.filter((i) => i.email !== email)
      save()
    },

    async listTasks(f) {
      await delay()
      return db.tasks
        .filter((t) => (!f.projectId || t.project_id === f.projectId) && (!f.space || t.space === f.space))
        .filter((t) => !f.assigneeId || t.assignee_id === f.assigneeId)
        .filter((t) => canView(t.project_id, t.space))
        .sort((a, b) => a.position - b.position)
    },
    async createTask(t) {
      if (!canEdit(t.project_id, t.space)) deny()
      const task = {
        description: '', status: 'todo' as const, assignee_id: null, due_date: null, priority: 'normale' as const, group_label: '',
        ...t, id: id('t'), position: Date.now() / 1000, created_at: nowIso(),
      }
      db.tasks.push(task)
      if (task.assignee_id && task.assignee_id !== me().id) {
        notify({ user_id: task.assignee_id, actor_id: me().id, kind: 'assigned', project_id: task.project_id, space: task.space, task_id: task.id, excerpt: task.title })
      }
      save()
      return task
    },
    async updateTask(tid, patch) {
      const t = db.tasks.find((x) => x.id === tid)
      if (!t || !canEdit(t.project_id, t.space)) deny()
      const before = t!.assignee_id
      Object.assign(t!, patch)
      if (t!.assignee_id && t!.assignee_id !== before && t!.assignee_id !== me().id) {
        notify({ user_id: t!.assignee_id, actor_id: me().id, kind: 'assigned', project_id: t!.project_id, space: t!.space, task_id: t!.id, excerpt: t!.title })
      }
      save()
    },
    async deleteTask(tid) {
      const t = db.tasks.find((x) => x.id === tid)
      if (!t || !canEdit(t.project_id, t.space)) deny()
      db.tasks = db.tasks.filter((x) => x.id !== tid)
      db.comments = db.comments.filter((x) => x.task_id !== tid)
      save()
    },

    async listComments(projectId, sp, taskId) {
      await delay()
      if (!canView(projectId, sp)) return []
      return db.comments
        .filter((c) => c.project_id === projectId && c.space === sp && c.task_id === taskId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },
    async addComment(c) {
      if (!canView(c.project_id, c.space)) deny()
      const author = me().id
      db.comments.push({ ...c, id: id('cm'), author_id: author, created_at: nowIso() })
      const excerpt = plainText(c.body).slice(0, 180)
      for (const m of c.mentions) {
        if (m !== author && userCanView(m, c.project_id, c.space)) {
          notify({ user_id: m, actor_id: author, kind: 'mention', project_id: c.project_id, space: c.space, task_id: c.task_id, excerpt })
        }
      }
      if (c.task_id) {
        const a = db.tasks.find((t) => t.id === c.task_id)?.assignee_id
        if (a && a !== author && !c.mentions.includes(a)) {
          notify({ user_id: a, actor_id: author, kind: 'comment', project_id: c.project_id, space: c.space, task_id: c.task_id, excerpt })
        }
      }
      save()
    },
    async deleteComment(cid) {
      const c = db.comments.find((x) => x.id === cid)
      if (!c || (c.author_id !== me().id && !staff())) deny()
      db.comments = db.comments.filter((x) => x.id !== cid)
      save()
    },

    async listFiles(projectId, sp) {
      await delay()
      return db.files
        .filter((f) => f.project_id === projectId && (!sp || f.space === sp) && canView(f.project_id, f.space))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
    async uploadFile(projectId, sp, file) {
      if (!canEdit(projectId, sp)) deny()
      const fid = id('f')
      let path = 'mem:' + fid
      if (file.size < 400_000) {
        path = await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(String(r.result))
          r.onerror = () => rej(new Error('Lecture du fichier impossible'))
          r.readAsDataURL(file)
        })
      } else {
        blobs.set(path, URL.createObjectURL(file))
      }
      db.files.push({ id: fid, project_id: projectId, space: sp, name: file.name, path, size: file.size, mime: file.type, uploaded_by: me().id, created_at: nowIso() })
      save()
    },
    async fileUrl(f) {
      if (f.path.startsWith('mem:')) {
        const u = blobs.get(f.path)
        if (!u) throw new Error('En démo, les gros fichiers ne restent pas après un rechargement de la page.')
        return u
      }
      return f.path
    },
    async deleteFile(f) {
      if (!canEdit(f.project_id, f.space)) deny()
      db.files = db.files.filter((x) => x.id !== f.id)
      save()
    },

    async listNotifications() {
      await delay()
      return db.notifications.filter((n) => n.user_id === me().id)
    },
    async markRead(ids) {
      const t = nowIso()
      db.notifications.forEach((n) => {
        if (ids.includes(n.id) && n.user_id === me().id) n.read_at = t
      })
      save()
    },
  }
}

export const DEMO_PEOPLE = seed().profiles

export function reloadDemo() {
  resetDemo()
  window.location.reload()
}
