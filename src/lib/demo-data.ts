import { addDays } from './format'
import type { Client, Comment, Entry, FileRec, Invitation, Notification, Profile, Project, SpaceAccess, Task, TaskStatus } from './types'

export interface DemoDb {
  profiles: Profile[]
  clients: Client[]
  projects: Project[]
  access: SpaceAccess[]
  tasks: Task[]
  comments: Comment[]
  files: FileRec[]
  entries: Entry[]
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
    { id: 'p-presse', client_id: 'c-more', name: 'Soirée presse', event_date: addDays(35), place: 'Lyon', status: 'en_cours', created_at: now() },
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

  const entries: Entry[] = []
  let ep = 1
  const e = (space: number, kind: string, title: string, data: Record<string, unknown> = {}, project_id = 'p-presse') =>
    entries.push({ id: `e-${ep}`, project_id, space, kind, title, data, position: ep++, created_at: now() })

  // 01 Orga : déroulé et intervenants
  e(1, 'run', 'Livraison du décor', { time: '10 h 00', detail: 'Accès quai, côté cour', who: 'Tom' })
  e(1, 'run', 'Arrivée de l’équipe Umber', { time: '11 h 30', detail: 'Train de 8 h 04', who: 'Équipe' })
  e(1, 'run', 'Installation son et lumière', { time: '12 h 00', detail: 'Studio Son', who: 'Tom' })
  e(1, 'run', 'Arrivée du traiteur', { time: '15 h 00', detail: 'Office sur place', who: 'Sarah' })
  e(1, 'run', 'Ouverture des portes', { time: '19 h 00', detail: 'Accueil presse, vestiaire', who: 'Margaux' })
  e(1, 'run', 'Démontage', { time: '1 h 00', detail: 'Lieu rendu à 3 h', who: 'Tom' })
  e(1, 'speaker', 'DJ Nova', { role: 'DJ', slot: '21 h – 23 h', status: 'À confirmer' })
  e(1, 'speaker', 'Claire, fondatrice de More', { role: 'Discours', slot: '19 h 45', status: 'Confirmé' })

  // 02 Budget
  e(2, 'budget', 'Budget du projet', { total: 25000, note: 'HT, validé par More' })
  e(2, 'line', 'Lieu', { state: 'Contrat signé', planned: 8000, committed: 8000, paid: 2400 })
  e(2, 'line', 'Traiteur et bar', { state: 'Acompte réglé', planned: 7500, committed: 6900, paid: 2070 })
  e(2, 'line', 'Son et DJ', { state: 'Devis reçu le 5 nov.', planned: 2000, committed: 2200, paid: 0 })
  e(2, 'line', 'Photographe', { planned: 1200, committed: 1200, paid: 0 })
  e(2, 'line', 'Invitations et goodies', { state: 'En attente du BAT', planned: 3500, committed: 46, paid: 46 })
  e(2, 'line', 'Déplacements', { planned: 1800, committed: 312, paid: 312 })
  e(2, 'line', 'Imprévus', { planned: 1000, committed: 0, paid: 0 })
  e(2, 'due', 'Lieu, solde', { amount: 5600, date: addDays(24), status: 'À payer' })
  e(2, 'due', 'Studio Son, acompte', { amount: 660, status: 'Devis à valider' })
  e(2, 'due', 'Remboursement Tom, trains', { amount: 312, date: addDays(3), status: 'À payer' })
  e(2, 'billing', 'Acompte 30 %', { amount: 7500, date: addDays(-20), status: 'Reçue' })
  e(2, 'billing', 'Solde 70 %', { amount: 17500, date: addDays(37), status: 'À émettre' })

  // 03 Logistique
  for (const who of ['Margaux', 'Sarah', 'Tom']) e(3, 'trip', 'Paris > Lyon', { who, date: addDays(35), time: '8 h 04', mode: 'Train', status: 'Réservé', cost: 78 })
  e(3, 'trip', 'Paris > Lyon', { who: 'Photographe', date: addDays(35), time: '14 h 04', mode: 'Train', status: 'Réservé', cost: 78 })
  e(3, 'trip', 'Hôtel, 3 chambres', { who: 'Équipe Umber', date: addDays(35), mode: 'Hébergement', status: 'À réserver', cost: 360 })
  e(3, 'shuttle', 'Gare Part-Dieu > lieu', { times: '18 h 30 et 19 h 15', capacity: '2 × 30 places', provider: 'Navettes Rhône', status: 'Horaires à valider' })
  e(3, 'shuttle', 'Lieu > centre-ville', { times: '23 h 30 et 0 h 30', capacity: '2 × 30 places', provider: 'Navettes Rhône', status: 'Horaires à valider' })
  e(3, 'gear', 'Kakémonos More', { qty: 2, how: 'Tom les apporte', status: 'Prêt' })
  e(3, 'gear', 'Sacs goodies', { qty: 120, how: 'Livrés au lieu la veille', status: 'À prévoir' })
  e(3, 'gear', 'Rallonges, multiprises, gaffer', { how: 'Caisse de régie Umber', status: 'Prêt' })

  // 04 Lieu
  e(4, 'venue', 'Le lieu retenu', { name: 'Atelier Rhône', address: 'Quai de Saône, Lyon', description: 'Ancienne halle industrielle, verrière', standing: 180, seated: 90, setup: '10 h', return: '3 h', contract: 'Signé le 21 oct.' })
  e(4, 'zone', 'Accueil et vestiaire', { detail: 'Navettes à l’entrée' })
  e(4, 'zone', 'Bar champagne', { detail: 'Maison Pétillante' })
  e(4, 'zone', 'Scène', { detail: 'Discours 19 h 45, DJ 21 h' })
  e(4, 'zone', 'Coin photo', { detail: 'Lumière Seize' })
  e(4, 'rule', 'Bougies et flammes nues', { rule: 'Interdites' })
  e(4, 'rule', 'Niveau sonore', { rule: 'Limité après 23 h' })
  e(4, 'rule', 'Accrochage au plafond', { rule: 'Sur validation du régisseur' })
  e(4, 'contact', 'Régisseur', { name: 'Karim' })
  e(4, 'contact', 'Responsable privatisation', { name: 'Anne' })
  e(4, 'option', 'Atelier Rhône', { city: 'Lyon', capacity: 180, price: 8000, status: 'Retenu' })
  e(4, 'option', 'Galerie des Canuts', { city: 'Lyon', capacity: 80, status: 'Écarté', note: 'Trop petite, 80 debout' })
  e(4, 'option', 'Péniche Saône', { city: 'Lyon', capacity: 150, status: 'Écarté', note: 'Indisponible à la date' })

  // 05 DA et goodies
  e(5, 'proposal', 'Moodboard lumière d’hiver', { folder: 'Moodboards', visual: 'f-2', status: 'Validé', version: 'v2' })
  e(5, 'proposal', 'Coffret presse, option 1', { folder: 'Goodies', visual: 'f-1', status: 'À valider' })
  e(5, 'proposal', 'Coffret presse, option 3', { folder: 'Goodies', visual: 'f-3', status: 'À valider' })
  e(5, 'proposal', 'Invitation, BAT', { folder: 'Invitations', status: 'Brouillon', version: 'v3, couleur crème' })
  e(5, 'goodie', 'Sac en coton brodé', { qty: 120, supplier: 'Brodé Main', bat: 'Validé', delivery: addDays(27), unit: 9 })
  e(5, 'goodie', 'Bougie parfumée More', { qty: 120, supplier: 'Cire et Mèche', bat: 'À valider', delivery: addDays(31), unit: 11 })
  e(5, 'goodie', 'Carnet gravé', { qty: 120, supplier: 'Papeterie Fil', bat: 'Pas commencé', unit: 7.5 })

  // 06 Ressources
  e(6, 'link', 'Photos de l’édition 2025', { url: 'https://www.dropbox.com/', folder: 'Brief et cadrage' })

  // 07 Partenariats
  e(7, 'partner', 'Studio Cire', { direction: 'Inbound', stage: 'À qualifier', offer: 'Propose 120 bougies' })
  e(7, 'partner', 'Beauté Nomade', { direction: 'Inbound', stage: 'À qualifier', offer: 'Trousses de voyage' })
  e(7, 'partner', 'Lumen Audio', { direction: 'Outbound', stage: 'Premier contact', offer: 'Prêt d’enceintes', owner: 'u-sarah', next: addDays(3) })
  e(7, 'partner', 'Fleurs Sauvages', { direction: 'Outbound', stage: 'Négociation', offer: 'Décor floral contre visibilité', owner: 'u-margaux', next: addDays(5) })
  e(7, 'partner', 'Maison Pétillante', {
    direction: 'Outbound', stage: 'Contrat', offer: '150 bouteilles de champagne', owner: 'u-margaux', value: 6000,
    contact: 'Élise, responsable événements',
    counterparts: 'Logo sur le carton d’invitation\nBar à champagne dédié\nMention dans le communiqué de presse\nPhotos livrées à J+7',
    history: '20 oct. : premier appel, intérêt pour la presse beauté.\n28 oct. : notre proposition, 120 bouteilles contre le logo.\n3 nov. : contre-proposition, 150 bouteilles et un bar dédié.\n6 nov. : contrat reçu.',
  })
  e(7, 'partner', 'Taxi Rhône', { direction: 'Inbound', stage: 'Signé', offer: '−20 % sur les navettes' })

  // 08 Prestataires
  e(8, 'supplier', 'Maison Rhône', { trade: 'Traiteur', service: 'Dîner debout, 120 personnes, bar', status: 'Confirmé', amount: 6900, arrival: '15 h' })
  e(8, 'supplier', 'Studio Son', { trade: 'Son et DJ', service: 'Sonorisation, micro discours, DJ', status: 'Devis à valider', amount: 2200, arrival: '12 h', contact: 'Léa', needs: '2 prises 16 A près de la scène, accès quai', docs: 'Devis reçu le 5 nov.\nKbis : manquant\nAttestation d’assurance : manquante' })
  e(8, 'supplier', 'Lumière Seize', { trade: 'Photo et vidéo', service: 'Reportage 18 h – 23 h, 80 photos', status: 'Confirmé', amount: 1200, arrival: '18 h' })
  e(8, 'supplier', 'Papeterie Fil', { trade: 'Impression', service: 'Cartons d’invitation, dorure', status: 'Confirmé', amount: 640 })
  e(8, 'supplier', 'Navettes Rhône', { trade: 'Transport', service: 'Navettes gare et lieu, 2 × 2 rotations', status: 'Devis attendu', arrival: '18 h 30' })

  return { profiles, clients, projects, access, tasks, comments, files: [], entries, notifications, invitations: [] }
}
