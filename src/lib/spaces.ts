import type { Priority, ProjectStatus, Role, TaskStatus } from './types'

export interface SpaceDef {
  n: number
  name: string
  hint: string
  color: string
  tint: string
}

export const SPACES: SpaceDef[] = [
  { n: 1, name: 'Orga', hint: 'Planning, intervenants, membres', color: '#2B4566', tint: '#E4EAF2' },
  { n: 2, name: 'Budget', hint: 'Factures, achats, devis', color: '#2E5B3B', tint: '#E2EEE5' },
  { n: 3, name: 'Logistique', hint: 'Trajets, hébergement, montage', color: '#7A4A16', tint: '#F3E7D8' },
  { n: 4, name: 'Lieu', hint: 'Visites, plans, contraintes', color: '#5A3A6B', tint: '#ECE3F0' },
  { n: 5, name: 'DA et goodies', hint: 'Moodboards, propositions, goodies', color: '#8A3530', tint: '#F4E2E0' },
  { n: 6, name: 'Ressources', hint: 'Les fichiers utiles à tout moment', color: '#47423D', tint: '#ECEAE6' },
  { n: 7, name: 'Partenariats', hint: 'Inbound, outbound, négociation', color: '#22605F', tint: '#DFEEEE' },
  { n: 8, name: 'Prestataires', hint: 'Devis, contrats, contacts', color: '#615424', tint: '#EFEBDA' },
]

// Couleur stable par client (pastille de la barre latérale, page client)
export function clientTone(name: string): SpaceDef {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const pool = [SPACES[0], SPACES[1], SPACES[2], SPACES[3], SPACES[4], SPACES[6], SPACES[7]]
  return pool[h % pool.length]
}

export const space = (n: number) => SPACES[n - 1] ?? SPACES[0]
export const num = (n: number) => String(n).padStart(2, '0')

export const STATUSES: { v: TaskStatus; label: string; color: string }[] = [
  { v: 'todo', label: 'À faire', color: '#9C9389' },
  { v: 'doing', label: 'En cours', color: '#B87A22' },
  { v: 'blocked', label: 'Bloqué', color: '#A9473B' },
  { v: 'review', label: 'À valider', color: '#5A3A6B' },
  { v: 'done', label: 'Fait', color: '#3E7F5A' },
]
export const statusOf = (v: TaskStatus) => STATUSES.find((s) => s.v === v) ?? STATUSES[0]

export const PRIORITIES: { v: Priority; label: string }[] = [
  { v: 'haute', label: 'Haute' },
  { v: 'normale', label: 'Normale' },
  { v: 'basse', label: 'Basse' },
]

export const PROJECT_STATUSES: { v: ProjectStatus; label: string }[] = [
  { v: 'cadrage', label: 'En cadrage' },
  { v: 'en_cours', label: 'En cours' },
  { v: 'termine', label: 'Terminé' },
]

export const ROLES: { v: Role; label: string; cls: string }[] = [
  { v: 'owner', label: 'Propriétaire', cls: 'ro-o' },
  { v: 'team', label: 'Équipe', cls: 'ro-t' },
  { v: 'freelance', label: 'Freelance', cls: 'ro-p' },
  { v: 'client', label: 'Client', cls: 'ro-c' },
  { v: 'none', label: 'Sans accès', cls: 'ro-n' },
]
export const roleOf = (v: Role) => ROLES.find((r) => r.v === v) ?? ROLES[4]
export const isStaffRole = (r: Role | undefined) => r === 'owner' || r === 'team'
