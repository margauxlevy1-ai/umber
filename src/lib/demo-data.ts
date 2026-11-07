import { addDays } from './format'
import type { Client, Comment, FileRec, Invitation, Notification, Profile, Project, SpaceAccess, Task, TaskStatus } from './types'

export interface DemoDb {
  profiles: Profile[]
  clients: Client[]
  projects: Project[]
  access: SpaceAccess[]
  tasks: Task[]
  comments: Comment[]
  files: FileRec[]
  notifications: Notification[]
  invitations: Invitation[]
}

const now = () => new Date().toISOString()
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

export function seed(): DemoDb {
  const profiles: Profile[] = [
    { id: 'u-margaux', email: 'margaux@umber.studio', full_name: 'Margaux Levy', role: 'owner', color: '#1D1A17' },
    { id: 'u-sarah', email: 'sarah@umber.studio', full_name: 'Sarah Benali', role: 'team', color: '#2B4566' },
    { id: 'u-tom', email: 'tom@exemple.fr', full_name: 'Tom Garnier', role: 'freelance', color: '#22605F' },
    { id: 'u-julie', email: 'julie@more.fr', full_name: 'Julie Martin', role: 'client', color: '#8A3530' },
  ]
  const clients: Client[] = [
    { id: 'c-more', name: 'More', note: 'Client récurrent', created_at: now() },
    { id: 'c-celeste', name: 'Maison Céleste', note: '', created_at: now() },
    { id: 'c-oree', name: 'Cabinet Orée', note: '', created_at: now() },
  ]
  const projects: Project[] = [
    { id: 'p-presse', client_id: 'c-more', name: 'Soirée presse', event_date: addDays(35), place: 'Paris 3e', status: 'en_cours', created_at: now() },
    { id: 'p-printemps', client_id: 'c-more', name: 'Lancement printemps', event_date: addDays(132), place: 'Paris', status: 'cadrage', created_at: now() },
    { id: 'p-popup', client_id: 'c-more', name: 'Tournée pop-up', event_date: addDays(160), place: 'Lyon, Bordeaux, Lille', status: 'cadrage', created_at: now() },
    { id: 'p-celeste', client_id: 'c-celeste', name: 'Dîner clients', event_date: addDays(21), place: 'Bordeaux', status: 'en_cours', created_at: now() },
    { id: 'p-oree', client_id: 'c-oree', name: 'Séminaire équipe', event_date: addDays(-40), place: 'Annecy', status: 'termine', created_at: now() },
  ]
  const access: SpaceAccess[] = []
  const grant = (user_id: string, project_id: string, edit: number[], view: number[]) => {
    edit.forEach((space) => access.push({ project_id, user_id, space, level: 'edit' }))
    view.forEach((space) => access.push({ project_id, user_id, space, level: 'view' }))
  }
  grant('u-tom', 'p-presse', [3, 4, 8], [1, 6])
  grant('u-julie', 'p-presse', [5], [1, 4, 6])
  grant('u-julie', 'p-printemps', [], [1, 5, 6])

  const tasks: Task[] = []
  let pos = 1
  const t = (
    project_id: string,
    space: number,
    group_label: string,
    title: string,
    assignee_id: string | null,
    due: number | null,
    status: TaskStatus = 'todo',
    priority: Task['priority'] = 'normale',
    description = '',
  ) => {
    const id = `t-${pos}`
    tasks.push({
      id,
      project_id,
      space,
      title,
      description,
      status,
      assignee_id,
      due_date: due === null ? null : addDays(due),
      priority,
      group_label,
      position: pos++,
      created_at: now(),
    })
    return id
  }
  // Soirée presse
  t('p-presse', 1, 'Cadrage', 'Valider le rétroplanning avec Julie', 'u-margaux', -3, 'review', 'haute')
  t('p-presse', 1, 'Cadrage', 'Liste des invités presse (80 noms)', 'u-sarah', 4, 'doing', 'haute')
  t('p-presse', 1, 'Intervenants', 'Confirmer la DJ et le set de 2 h', 'u-sarah', 10)
  t('p-presse', 1, 'Intervenants', 'Brief maître de cérémonie', 'u-margaux', 18)
  t('p-presse', 1, 'Jour J', 'Déroulé minute par minute', 'u-margaux', 28)
  t('p-presse', 2, 'Devis', 'Relancer le traiteur pour le devis final', 'u-sarah', -1, 'doing')
  t('p-presse', 2, 'Factures', 'Payer l’acompte du lieu (30 %)', 'u-margaux', 2, 'todo', 'haute')
  t('p-presse', 3, 'Transport', 'Navettes gare de Lyon > lieu', 'u-tom', 6, 'doing')
  t('p-presse', 3, 'Montage', 'Créneau de montage la veille, 14 h', 'u-tom', 12)
  t('p-presse', 4, 'Visite', 'Visite technique avec le régisseur', 'u-tom', 3, 'todo', 'haute')
  t('p-presse', 4, 'Visite', 'Plan de salle à valider', 'u-julie', 9, 'review')
  t('p-presse', 5, 'Propositions', 'Moodboard « lumière d’hiver »', 'u-margaux', -2, 'done')
  const goodies = t('p-presse', 5, 'Goodies', 'Choisir le coffret presse (3 options)', 'u-julie', 5, 'review', 'haute',
    'Trois options chiffrées dans les fichiers de l’espace. Julie choisit, puis on lance la production (délai 3 semaines).')
  t('p-presse', 5, 'Goodies', 'Commander les cartes gravées', 'u-sarah', 14)
  t('p-presse', 7, 'Outbound', 'Proposer le partenariat champagne', 'u-sarah', 8, 'doing')
  t('p-presse', 7, 'Inbound', 'Répondre à la marque de fleurs', 'u-margaux', -4, 'blocked')
  t('p-presse', 8, 'Contrats', 'Contrat photographe à signer', 'u-tom', 7)
  t('p-presse', 8, 'Devis', 'Comparer 2 devis de sonorisation', 'u-tom', 11)
  // Autres projets
  t('p-printemps', 1, 'Cadrage', 'Premier brief avec More', 'u-margaux', 12)
  t('p-printemps', 4, 'Repérage', 'Shortlist de 4 lieux', 'u-sarah', 25)
  t('p-printemps', 5, 'Propositions', 'Pistes créatives (2 directions)', 'u-margaux', 30)
  t('p-popup', 2, 'Devis', 'Chiffrer la tournée 3 villes', 'u-margaux', 20)
  t('p-celeste', 1, 'Jour J', 'Plan de table 24 couverts', 'u-sarah', 5, 'doing')
  t('p-celeste', 8, 'Contrats', 'Confirmer le chef à domicile', 'u-margaux', 1, 'todo', 'haute')
  t('p-oree', 1, 'Bilan', 'Bilan et photos envoyés', 'u-margaux', -35, 'done')

  const comments: Comment[] = [
    {
      id: 'cm-1', project_id: 'p-presse', space: 5, task_id: goodies, author_id: 'u-margaux',
      body: '@[Julie](u-julie) les trois options sont dans les fichiers. Ma préférence va à l’option 2, plus sobre.',
      mentions: ['u-julie'], created_at: ago(20),
    },
    {
      id: 'cm-2', project_id: 'p-presse', space: 5, task_id: goodies, author_id: 'u-julie',
      body: 'Merci ! Je regarde avec l’équipe marketing et je reviens vers vous demain.',
      mentions: [], created_at: ago(18),
    },
    {
      id: 'cm-3', project_id: 'p-presse', space: 3, task_id: null, author_id: 'u-sarah',
      body: '@[Tom](u-tom) tu peux vérifier que les navettes passent par le quai de livraison ?',
      mentions: ['u-tom'], created_at: ago(5),
    },
    {
      id: 'cm-4', project_id: 'p-presse', space: 1, task_id: null, author_id: 'u-tom',
      body: '@[Margaux](u-margaux) le régisseur du lieu propose une visite jeudi 10 h.',
      mentions: ['u-margaux'], created_at: ago(2),
    },
  ]

  const notifications: Notification[] = [
    { id: 'n-1', user_id: 'u-margaux', actor_id: 'u-tom', kind: 'mention', project_id: 'p-presse', space: 1, task_id: null, excerpt: '@Margaux le régisseur du lieu propose une visite jeudi 10 h.', read_at: null, created_at: ago(2) },
    { id: 'n-2', user_id: 'u-margaux', actor_id: 'u-julie', kind: 'comment', project_id: 'p-presse', space: 5, task_id: goodies, excerpt: 'Merci ! Je regarde avec l’équipe marketing et je reviens vers vous demain.', read_at: null, created_at: ago(18) },
    { id: 'n-3', user_id: 'u-tom', actor_id: 'u-sarah', kind: 'mention', project_id: 'p-presse', space: 3, task_id: null, excerpt: '@Tom tu peux vérifier que les navettes passent par le quai de livraison ?', read_at: null, created_at: ago(5) },
    { id: 'n-4', user_id: 'u-julie', actor_id: 'u-margaux', kind: 'mention', project_id: 'p-presse', space: 5, task_id: goodies, excerpt: '@Julie les trois options sont dans les fichiers. Ma préférence va à l’option 2, plus sobre.', read_at: null, created_at: ago(20) },
    { id: 'n-5', user_id: 'u-julie', actor_id: 'u-margaux', kind: 'assigned', project_id: 'p-presse', space: 4, task_id: 't-11', excerpt: 'Plan de salle à valider', read_at: ago(30), created_at: ago(40) },
  ]

  return { profiles, clients, projects, access, tasks, comments, files: [], notifications, invitations: [] }
}
