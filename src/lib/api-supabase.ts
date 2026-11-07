import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js'
import type { Api, Client, Profile, Project, Task } from './types'

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

function one<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  if (!res.data) throw new Error('Enregistrement impossible')
  return res.data
}

function safeName(name: string): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
  return base.slice(-80) || 'fichier'
}

export function supabaseApi(url: string, key: string): Api {
  const sb: SupabaseClient = createSupabase(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  const redirect = () => window.location.origin + '/'

  async function uid(): Promise<string> {
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new Error('Session expirée, reconnecte-toi.')
    return id
  }

  return {
    demo: false,

    async currentUser() {
      const { data } = await sb.auth.getSession()
      const id = data.session?.user.id
      if (!id) return null
      const res = await sb.from('profiles').select('*').eq('id', id).maybeSingle()
      return (res.data as Profile | null) ?? null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(cb, 0)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
    },
    async signUp(email, password, fullName) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: redirect() },
      })
      if (error) throw new Error(error.message)
      return data.session ? 'session' : 'confirm'
    },
    async sendMagicLink(email) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirect() },
      })
      if (error) throw new Error(error.message)
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/mot-de-passe' })
      if (error) throw new Error(error.message)
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async updateProfile(patch) {
      check(await sb.from('profiles').update(patch).eq('id', await uid()))
    },
    async updateRole(userId, role) {
      check(await sb.from('profiles').update({ role }).eq('id', userId))
    },

    async listProfiles() {
      return check(await sb.from('profiles').select('*').order('created_at')) ?? []
    },
    async listClients() {
      return check(await sb.from('clients').select('*').order('name')) ?? []
    },
    async createClient(name, note) {
      return one<Client>(await sb.from('clients').insert({ name, note }).select().single())
    },
    async updateClient(id, patch) {
      check(await sb.from('clients').update(patch).eq('id', id))
    },
    async listProjects() {
      return check(await sb.from('projects').select('*').order('event_date', { nullsFirst: false })) ?? []
    },
    async createProject(p) {
      return one<Project>(await sb.from('projects').insert(p).select().single())
    },
    async updateProject(id, patch) {
      check(await sb.from('projects').update(patch).eq('id', id))
    },
    async deleteProject(id) {
      const files = check(await sb.from('files').select('path').eq('project_id', id)) ?? []
      if (files.length) await sb.storage.from('files').remove(files.map((f: { path: string }) => f.path))
      check(await sb.from('projects').delete().eq('id', id))
    },

    async listAccess() {
      return check(await sb.from('space_access').select('*')) ?? []
    },
    async setAccess(projectId, userId, space, level) {
      if (level === null) {
        check(await sb.from('space_access').delete().match({ project_id: projectId, user_id: userId, space }))
      } else {
        check(await sb.from('space_access').upsert({ project_id: projectId, user_id: userId, space, level }))
      }
    },
    async invite(email, fullName, role, access) {
      return check(
        await sb.rpc('invite_member', { p_email: email, p_full_name: fullName, p_role: role, p_access: access }),
      ) as 'existing' | 'invited'
    },
    async listInvitations() {
      return check(await sb.from('invitations').select('*').order('created_at', { ascending: false })) ?? []
    },
    async cancelInvitation(email) {
      check(await sb.from('invitations').delete().eq('email', email))
    },

    async listTasks(f) {
      let q = sb.from('tasks').select('*')
      if (f.projectId) q = q.eq('project_id', f.projectId)
      if (f.space) q = q.eq('space', f.space)
      if (f.assigneeId) q = q.eq('assignee_id', f.assigneeId)
      return check(await q.order('position').order('created_at')) ?? []
    },
    async createTask(t) {
      return one<Task>(await sb.from('tasks').insert({ ...t, position: Date.now() / 1000 }).select().single())
    },
    async updateTask(id, patch) {
      check(await sb.from('tasks').update(patch).eq('id', id))
    },
    async deleteTask(id) {
      check(await sb.from('tasks').delete().eq('id', id))
    },

    async listComments(projectId, space, taskId) {
      let q = sb.from('comments').select('*').eq('project_id', projectId).eq('space', space)
      q = taskId ? q.eq('task_id', taskId) : q.is('task_id', null)
      return check(await q.order('created_at')) ?? []
    },
    async addComment(c) {
      check(await sb.from('comments').insert({ ...c, author_id: await uid() }))
    },
    async deleteComment(id) {
      check(await sb.from('comments').delete().eq('id', id))
    },

    async listFiles(projectId, space) {
      let q = sb.from('files').select('*').eq('project_id', projectId)
      if (space) q = q.eq('space', space)
      return check(await q.order('created_at', { ascending: false })) ?? []
    },
    async uploadFile(projectId, space, file) {
      const path = `${projectId}/${space}/${crypto.randomUUID()}-${safeName(file.name)}`
      const up = await sb.storage.from('files').upload(path, file, { contentType: file.type || undefined })
      if (up.error) throw new Error(up.error.message)
      const res = await sb.from('files').insert({
        project_id: projectId,
        space,
        name: file.name,
        path,
        size: file.size,
        mime: file.type,
      })
      if (res.error) {
        await sb.storage.from('files').remove([path])
        throw new Error(res.error.message)
      }
    },
    async fileUrl(f) {
      const { data, error } = await sb.storage.from('files').createSignedUrl(f.path, 3600)
      if (error || !data) throw new Error(error?.message ?? 'Lien indisponible')
      return data.signedUrl
    },
    async deleteFile(f) {
      check(await sb.from('files').delete().eq('id', f.id))
      await sb.storage.from('files').remove([f.path])
    },

    async listNotifications() {
      return check(await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(200)) ?? []
    },
    async markRead(ids) {
      if (!ids.length) return
      check(await sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids))
    },
  }
}
