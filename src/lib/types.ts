export type Role = 'owner' | 'team' | 'freelance' | 'client' | 'none'
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'review' | 'done'
export type Level = 'view' | 'edit'
export type Priority = 'basse' | 'normale' | 'haute'
export type ProjectStatus = 'cadrage' | 'en_cours' | 'termine'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  color: string
}

export interface Client {
  id: string
  name: string
  note: string
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  event_date: string | null
  place: string
  status: ProjectStatus
  created_at: string
}

export interface SpaceAccess {
  project_id: string
  user_id: string
  space: number
  level: Level
}

export interface Task {
  id: string
  project_id: string
  space: number
  title: string
  description: string
  status: TaskStatus
  assignee_id: string | null
  due_date: string | null
  priority: Priority
  group_label: string
  position: number
  created_at: string
}

export interface Comment {
  id: string
  project_id: string
  space: number
  task_id: string | null
  author_id: string | null
  body: string
  mentions: string[]
  created_at: string
}

export interface Entry {
  id: string
  project_id: string
  space: number
  kind: string
  title: string
  data: Record<string, unknown>
  position: number
  created_at: string
}

export type EntryPatch = Partial<Pick<Entry, 'title' | 'data' | 'position'>>

export interface FileRec {
  id: string
  project_id: string
  space: number
  category: string
  name: string
  path: string
  size: number
  mime: string
  uploaded_by: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  kind: 'mention' | 'assigned' | 'comment'
  project_id: string | null
  space: number | null
  task_id: string | null
  excerpt: string
  read_at: string | null
  created_at: string
}

export interface AccessGrant {
  project_id: string
  space: number
  level: Level
}

export interface Invitation {
  email: string
  full_name: string
  role: Role
  access: AccessGrant[]
  created_at: string
}

export type NewTask = Pick<Task, 'project_id' | 'space' | 'title'> &
  Partial<Pick<Task, 'description' | 'status' | 'assignee_id' | 'due_date' | 'priority' | 'group_label'>>

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'status' | 'assignee_id' | 'due_date' | 'priority' | 'group_label' | 'position' | 'space'>
>

export interface TaskFilter {
  projectId?: string
  space?: number
  assigneeId?: string
}

export interface Api {
  readonly demo: boolean
  currentUser(): Promise<Profile | null>
  onAuthChange(cb: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, fullName: string): Promise<'session' | 'confirm'>
  sendMagicLink(email: string): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
  updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'color'>>): Promise<void>
  updateRole(userId: string, role: Role): Promise<void>

  listProfiles(): Promise<Profile[]>
  listClients(): Promise<Client[]>
  createClient(name: string, note: string): Promise<Client>
  updateClient(id: string, patch: Partial<Pick<Client, 'name' | 'note'>>): Promise<void>
  listProjects(): Promise<Project[]>
  createProject(p: Pick<Project, 'client_id' | 'name' | 'event_date' | 'place' | 'status'>): Promise<Project>
  updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'event_date' | 'place' | 'status'>>): Promise<void>
  deleteProject(id: string): Promise<void>

  listAccess(): Promise<SpaceAccess[]>
  setAccess(projectId: string, userId: string, space: number, level: Level | null): Promise<void>
  invite(email: string, fullName: string, role: Role, access: AccessGrant[]): Promise<'existing' | 'invited'>
  listInvitations(): Promise<Invitation[]>
  cancelInvitation(email: string): Promise<void>

  listTasks(f: TaskFilter): Promise<Task[]>
  createTask(t: NewTask): Promise<Task>
  updateTask(id: string, patch: TaskPatch): Promise<void>
  deleteTask(id: string): Promise<void>

  listComments(projectId: string, space: number, taskId: string | null): Promise<Comment[]>
  addComment(c: Pick<Comment, 'project_id' | 'space' | 'task_id' | 'body' | 'mentions'>): Promise<void>
  deleteComment(id: string): Promise<void>

  listFiles(projectId: string, space?: number): Promise<FileRec[]>
  uploadFile(projectId: string, space: number, file: File, category?: string): Promise<FileRec>
  updateFile(id: string, patch: { category: string }): Promise<void>
  fileUrl(f: FileRec): Promise<string>
  deleteFile(f: FileRec): Promise<void>

  listEntries(projectId: string, space?: number): Promise<Entry[]>
  createEntry(e: Pick<Entry, 'project_id' | 'space' | 'kind' | 'title' | 'data'>): Promise<Entry>
  updateEntry(id: string, patch: EntryPatch): Promise<void>
  deleteEntry(id: string): Promise<void>

  listNotifications(): Promise<Notification[]>
  markRead(ids: string[]): Promise<void>
}
