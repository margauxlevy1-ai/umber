import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { clearCache } from './cache'
import { isStaffRole } from './spaces'
import type { Client, Notification, Profile, Project, SpaceAccess } from './types'

interface Store {
  me: Profile | null
  loading: boolean
  profiles: Profile[]
  clients: Client[]
  projects: Project[]
  access: SpaceAccess[]
  notifications: Notification[]
  unread: number
  staff: boolean
  refresh: () => Promise<void>
  refreshInbox: () => Promise<void>
  person: (id: string | null) => Profile | undefined
  canView: (projectId: string, space: number) => boolean
  canEdit: (projectId: string, space: number) => boolean
  spacesFor: (projectId: string) => number[]
  membersOf: (projectId: string, space?: number) => Profile[]
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [access, setAccess] = useState<SpaceAccess[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const refreshInbox = useCallback(async () => {
    try {
      setNotifications(await api.listNotifications())
    } catch {
      /* boîte indisponible : on garde l'ancienne */
    }
  }, [])

  const refresh = useCallback(async () => {
    const user = await api.currentUser().catch(() => null)
    setMe((prev) => {
      if (prev?.id !== user?.id) clearCache()
      return user
    })
    if (user && user.role !== 'none') {
      const [p, c, pr, a, n] = await Promise.all([
        api.listProfiles(),
        api.listClients(),
        api.listProjects(),
        api.listAccess(),
        api.listNotifications(),
      ])
      setProfiles(p)
      setClients(c)
      setProjects(pr)
      setAccess(a)
      setNotifications(n)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const off = api.onAuthChange(() => {
      setLoading(true)
      refresh()
    })
    const t = setInterval(refreshInbox, 60_000)
    return () => {
      off()
      clearInterval(t)
    }
  }, [refresh, refreshInbox])

  const value = useMemo<Store>(() => {
    const staff = isStaffRole(me?.role)
    const mine = access.filter((a) => a.user_id === me?.id)
    const person = (id: string | null) => profiles.find((p) => p.id === id)
    const canView = (p: string, s: number) => staff || mine.some((a) => a.project_id === p && a.space === s)
    const canEdit = (p: string, s: number) => staff || mine.some((a) => a.project_id === p && a.space === s && a.level === 'edit')
    const spacesFor = (p: string) => [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => canView(p, s))
    const membersOf = (p: string, s?: number) =>
      profiles.filter(
        (u) =>
          isStaffRole(u.role) ||
          access.some((a) => a.user_id === u.id && a.project_id === p && (s === undefined || a.space === s)),
      )
    return {
      me, loading, profiles, clients, projects, access, notifications,
      unread: notifications.filter((n) => !n.read_at).length,
      staff, refresh, refreshInbox, person, canView, canEdit, spacesFor, membersOf,
    }
  }, [me, loading, profiles, clients, projects, access, notifications, refresh, refreshInbox])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider manquant')
  return s
}
