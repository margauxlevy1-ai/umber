// Ce que contient chaque espace, en plus des tâches, des fichiers et de la discussion.
// Chaque « collection » est un tableau de lignes (table entries, colonne kind).

import type { Entry } from './types'

export type FieldType = 'text' | 'longtext' | 'money' | 'number' | 'date' | 'select' | 'person' | 'file' | 'url'

export interface Field {
  key: string
  label: string
  type: FieldType
  options?: string[]
  // Couleur de pastille par option (statuts)
  tones?: Record<string, Tone>
  placeholder?: string
  wide?: boolean
  hideInTable?: boolean
}

export type Tone = 'ok' | 'due' | 'late' | 'mute' | 'info'

export interface Collection {
  kind: string
  label: string
  hint?: string
  titleLabel: string
  addLabel: string
  fields: Field[]
  view?: 'table' | 'kanban' | 'cards'
  // Champ qui sert de colonnes au pipeline / de filtre
  stageKey?: string
  filterKey?: string
  // Colonne calculée affichée en fin de tableau
  computed?: { label: string; value: (e: Entry) => number | null; money?: boolean }
  // Ligne de total sous le tableau
  totals?: string[]
}

// Une « fiche » : un seul bloc de champs par projet (ex. le lieu retenu, le budget)
export interface Sheet {
  kind: string
  label: string
  fields: Field[]
}

export interface SpaceModule {
  tab: string
  sheet?: Sheet
  collections: Collection[]
  // Résumé affiché sur la carte de l'espace (page client)
  summary?: (entries: Entry[]) => string | null
}

const st = (tones: Record<string, Tone>) => ({ options: Object.keys(tones), tones })

export const num = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export const euros = (n: number | null | undefined): string =>
  n === null || n === undefined ? '–' : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

const sum = (list: Entry[], key: string) => list.reduce((a, e) => a + num(e.data[key]), 0)
const ofKind = (list: Entry[], kind: string) => list.filter((e) => e.kind === kind)
const plural = (n: number, s: string, p = s + 's') => `${n} ${n > 1 ? p : s}`

export const MODULES: Record<number, SpaceModule> = {
  1: {
    tab: 'Jour J',
    collections: [
      {
        kind: 'run',
        label: 'Déroulé du jour J',
        hint: 'Le minutage de l’événement, de l’arrivée de l’équipe au démontage.',
        titleLabel: 'Moment',
        addLabel: 'Ajouter un moment',
        fields: [
          { key: 'time', label: 'Heure', type: 'text', placeholder: '19 h 00' },
          { key: 'detail', label: 'Détail', type: 'text', wide: true },
          { key: 'who', label: 'Qui', type: 'text' },
        ],
      },
      {
        kind: 'speaker',
        label: 'Intervenants',
        titleLabel: 'Nom',
        addLabel: 'Ajouter un intervenant',
        fields: [
          { key: 'role', label: 'Rôle', type: 'text', placeholder: 'DJ, discours, animation…' },
          { key: 'slot', label: 'Passage', type: 'text', placeholder: '21 h – 23 h' },
          { key: 'contact', label: 'Contact', type: 'text' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À confirmer': 'due', Confirmé: 'ok', Annulé: 'mute' }) },
        ],
      },
    ],
  },
  2: {
    tab: 'Budget',
    sheet: {
      kind: 'budget',
      label: 'Budget du projet',
      fields: [
        { key: 'total', label: 'Budget total HT', type: 'money' },
        { key: 'note', label: 'Précision', type: 'text', placeholder: 'Ex. validé par le client le 15 oct.' },
      ],
    },
    collections: [
      {
        kind: 'line',
        label: 'Lignes budgétaires',
        titleLabel: 'Poste',
        addLabel: 'Ajouter un poste',
        fields: [
          { key: 'state', label: 'Où on en est', type: 'text', placeholder: 'Devis reçu, acompte réglé…' },
          { key: 'planned', label: 'Prévu', type: 'money' },
          { key: 'committed', label: 'Engagé', type: 'money' },
          { key: 'paid', label: 'Payé', type: 'money' },
          { key: 'file', label: 'Justificatif', type: 'file' },
        ],
        totals: ['planned', 'committed', 'paid'],
      },
      {
        kind: 'due',
        label: 'À payer',
        hint: 'Les factures et remboursements à régler, avec leur échéance.',
        titleLabel: 'À qui, pour quoi',
        addLabel: 'Ajouter un paiement',
        fields: [
          { key: 'amount', label: 'Montant', type: 'money' },
          { key: 'date', label: 'Échéance', type: 'date' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À payer': 'due', 'Devis à valider': 'info', Payé: 'ok' }) },
          { key: 'file', label: 'Facture', type: 'file' },
        ],
        totals: ['amount'],
      },
      {
        kind: 'billing',
        label: 'Facturation au client',
        titleLabel: 'Facture',
        addLabel: 'Ajouter une facture',
        fields: [
          { key: 'amount', label: 'Montant', type: 'money' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À émettre': 'mute', Émise: 'due', Reçue: 'ok' }) },
        ],
        totals: ['amount'],
      },
    ],
    summary: (es) => {
      const total = num(ofKind(es, 'budget')[0]?.data.total)
      const committed = sum(ofKind(es, 'line'), 'committed')
      if (!total && !committed) return null
      return total ? `${euros(committed)} engagés sur ${euros(total)}` : `${euros(committed)} engagés`
    },
  },
  3: {
    tab: 'Logistique',
    collections: [
      {
        kind: 'trip',
        label: 'Déplacements de l’équipe',
        titleLabel: 'Trajet',
        addLabel: 'Ajouter un déplacement',
        fields: [
          { key: 'who', label: 'Qui', type: 'text' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'time', label: 'Heure', type: 'text', placeholder: '8 h 04' },
          { key: 'mode', label: 'Moyen', type: 'select', options: ['Train', 'Avion', 'Voiture', 'Navette', 'Taxi', 'Hébergement', 'Autre'] },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À réserver': 'due', Réservé: 'ok', Annulé: 'mute' }) },
          { key: 'cost', label: 'Coût', type: 'money' },
          { key: 'file', label: 'Billet', type: 'file' },
        ],
        totals: ['cost'],
      },
      {
        kind: 'shuttle',
        label: 'Navettes invités',
        titleLabel: 'Trajet',
        addLabel: 'Ajouter une navette',
        fields: [
          { key: 'times', label: 'Horaires', type: 'text' },
          { key: 'capacity', label: 'Capacité', type: 'text' },
          { key: 'provider', label: 'Prestataire', type: 'text' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'Horaires à valider': 'due', Confirmé: 'ok' }) },
        ],
      },
      {
        kind: 'gear',
        label: 'Matériel',
        titleLabel: 'Objet',
        addLabel: 'Ajouter du matériel',
        fields: [
          { key: 'qty', label: 'Quantité', type: 'number' },
          { key: 'how', label: 'Qui l’apporte, comment', type: 'text', wide: true },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À prévoir': 'due', Prêt: 'info', 'Sur place': 'ok' }) },
        ],
      },
    ],
    summary: (es) => {
      const trips = ofKind(es, 'trip')
      if (!trips.length) return null
      const todo = trips.filter((t) => t.data.status === 'À réserver').length
      return `${plural(trips.length, 'déplacement')}${todo ? `, ${todo} à réserver` : ''}`
    },
  },
  4: {
    tab: 'Lieu',
    sheet: {
      kind: 'venue',
      label: 'Le lieu retenu',
      fields: [
        { key: 'name', label: 'Nom du lieu', type: 'text' },
        { key: 'address', label: 'Adresse', type: 'text', wide: true },
        { key: 'description', label: 'Description', type: 'text', wide: true, placeholder: 'Ancienne halle, verrière…' },
        { key: 'standing', label: 'Capacité debout', type: 'number' },
        { key: 'seated', label: 'Capacité assise', type: 'number' },
        { key: 'setup', label: 'Accès montage', type: 'text', placeholder: '10 h' },
        { key: 'return', label: 'Lieu rendu', type: 'text', placeholder: '3 h' },
        { key: 'contract', label: 'Contrat', type: 'text', placeholder: 'Signé le 21 oct.' },
      ],
    },
    collections: [
      {
        kind: 'zone',
        label: 'Zonage',
        hint: 'Ce qui se passe où, d’après le plan.',
        titleLabel: 'Zone',
        addLabel: 'Ajouter une zone',
        fields: [{ key: 'detail', label: 'Détail', type: 'text', wide: true }],
      },
      {
        kind: 'rule',
        label: 'Contraintes du lieu',
        titleLabel: 'Point',
        addLabel: 'Ajouter une contrainte',
        fields: [{ key: 'rule', label: 'Règle', type: 'text', wide: true }],
      },
      {
        kind: 'contact',
        label: 'Contacts sur place',
        titleLabel: 'Rôle',
        addLabel: 'Ajouter un contact',
        fields: [
          { key: 'name', label: 'Nom', type: 'text' },
          { key: 'phone', label: 'Téléphone', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
        ],
      },
      {
        kind: 'option',
        label: 'Lieux étudiés',
        titleLabel: 'Lieu',
        addLabel: 'Ajouter un lieu',
        fields: [
          { key: 'city', label: 'Ville', type: 'text' },
          { key: 'capacity', label: 'Capacité', type: 'number' },
          { key: 'price', label: 'Prix', type: 'money' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ Repéré: 'mute', 'Visite prévue': 'info', Visité: 'info', 'Option posée': 'due', Retenu: 'ok', Écarté: 'mute' }) },
          { key: 'note', label: 'Note', type: 'text', wide: true },
        ],
      },
    ],
    summary: (es) => {
      const v = ofKind(es, 'venue')[0]?.data.name
      if (v) return `${v}, lieu retenu`
      const n = ofKind(es, 'option').length
      return n ? `${plural(n, 'lieu étudié', 'lieux étudiés')}` : null
    },
  },
  5: {
    tab: 'DA et goodies',
    collections: [
      {
        kind: 'proposal',
        label: 'Propositions',
        hint: 'Moodboards, invitations, signalétique, goodies : à valider par le client.',
        titleLabel: 'Titre',
        addLabel: 'Ajouter une proposition',
        view: 'cards',
        filterKey: 'folder',
        fields: [
          { key: 'folder', label: 'Dossier', type: 'select', options: ['Moodboards', 'Invitations', 'Signalétique', 'Goodies', 'Autre'] },
          { key: 'visual', label: 'Visuel', type: 'file' },
          { key: 'status', label: 'Statut', type: 'select', ...st({ Brouillon: 'mute', 'À valider': 'due', Validé: 'ok', 'À revoir': 'late' }) },
          { key: 'version', label: 'Version', type: 'text', placeholder: 'v3, couleur crème' },
          { key: 'note', label: 'Note', type: 'longtext', hideInTable: true },
        ],
      },
      {
        kind: 'goodie',
        label: 'Suivi des goodies',
        titleLabel: 'Objet',
        addLabel: 'Ajouter un goodie',
        fields: [
          { key: 'qty', label: 'Quantité', type: 'number' },
          { key: 'supplier', label: 'Fournisseur', type: 'text' },
          { key: 'bat', label: 'BAT', type: 'select', ...st({ 'Pas commencé': 'mute', 'À valider': 'due', Validé: 'ok' }) },
          { key: 'delivery', label: 'Livraison', type: 'date' },
          { key: 'unit', label: 'Prix unitaire', type: 'money' },
        ],
        computed: { label: 'Total', value: (e) => (num(e.data.qty) && num(e.data.unit) ? num(e.data.qty) * num(e.data.unit) : null), money: true },
      },
    ],
    summary: (es) => {
      const n = ofKind(es, 'proposal').filter((p) => p.data.status === 'À valider').length
      if (n) return `${plural(n, 'proposition')} à valider`
      const g = ofKind(es, 'goodie').length
      return g ? plural(g, 'goodie') : null
    },
  },
  6: {
    tab: 'Liens utiles',
    collections: [
      {
        kind: 'link',
        label: 'Liens utiles',
        hint: 'Drive, Dropbox, WeTransfer, Notion… tout ce qui n’est pas un fichier.',
        titleLabel: 'Titre',
        addLabel: 'Ajouter un lien',
        fields: [
          { key: 'url', label: 'Lien', type: 'url', wide: true },
          { key: 'folder', label: 'Dossier', type: 'text' },
        ],
      },
    ],
  },
  7: {
    tab: 'Pipeline',
    collections: [
      {
        kind: 'partner',
        label: 'Partenaires',
        titleLabel: 'Marque',
        addLabel: 'Ajouter un partenaire',
        view: 'kanban',
        stageKey: 'stage',
        filterKey: 'direction',
        fields: [
          { key: 'direction', label: 'Sens', type: 'select', ...st({ Inbound: 'info', Outbound: 'mute' }) },
          { key: 'stage', label: 'Étape', type: 'select', ...st({ 'À qualifier': 'mute', 'Premier contact': 'info', Négociation: 'due', Contrat: 'due', Signé: 'ok', Activé: 'ok', 'Sans suite': 'mute' }) },
          { key: 'offer', label: 'Proposition', type: 'text', wide: true, placeholder: '150 bouteilles contre le logo sur l’invitation' },
          { key: 'value', label: 'Valeur estimée', type: 'money' },
          { key: 'owner', label: 'Responsable', type: 'person' },
          { key: 'next', label: 'Prochaine étape', type: 'date' },
          { key: 'contact', label: 'Contact', type: 'text', hideInTable: true },
          { key: 'counterparts', label: 'Contreparties à livrer', type: 'longtext', hideInTable: true, placeholder: 'Une par ligne' },
          { key: 'history', label: 'Historique de la négociation', type: 'longtext', hideInTable: true, placeholder: '20 oct. : premier appel…' },
          { key: 'contract', label: 'Contrat', type: 'file', hideInTable: true },
        ],
      },
    ],
    summary: (es) => {
      const p = ofKind(es, 'partner')
      if (!p.length) return null
      const signed = p.filter((x) => x.data.stage === 'Signé' || x.data.stage === 'Activé').length
      return `${plural(signed, 'signé')} sur ${plural(p.length, 'partenaire')}`
    },
  },
  8: {
    tab: 'Prestataires',
    collections: [
      {
        kind: 'supplier',
        label: 'Les prestataires du projet',
        titleLabel: 'Prestataire',
        addLabel: 'Ajouter un prestataire',
        filterKey: 'trade',
        fields: [
          { key: 'trade', label: 'Métier', type: 'select', options: ['Traiteur', 'Son et DJ', 'Lumière', 'Photo et vidéo', 'Déco et fleurs', 'Mobilier', 'Impression', 'Goodies', 'Transport', 'Sécurité', 'Animation', 'Autre'] },
          { key: 'service', label: 'Prestation', type: 'text', wide: true },
          { key: 'status', label: 'Statut', type: 'select', ...st({ 'À contacter': 'mute', 'Devis attendu': 'info', 'Devis à valider': 'due', Confirmé: 'ok', Écarté: 'mute' }) },
          { key: 'amount', label: 'Montant HT', type: 'money' },
          { key: 'arrival', label: 'Jour J', type: 'text', placeholder: 'Arrivée 15 h' },
          { key: 'contact', label: 'Contact', type: 'text', hideInTable: true, placeholder: 'Léa, 06…, lea@…' },
          { key: 'needs', label: 'Besoins sur place', type: 'longtext', hideInTable: true },
          { key: 'docs', label: 'Documents reçus', type: 'longtext', hideInTable: true, placeholder: 'Devis, Kbis, attestation d’assurance…' },
          { key: 'quote', label: 'Devis', type: 'file', hideInTable: true },
        ],
        totals: ['amount'],
      },
    ],
    summary: (es) => {
      const s = ofKind(es, 'supplier')
      if (!s.length) return null
      const ok = s.filter((x) => x.data.status === 'Confirmé').length
      const todo = s.filter((x) => x.data.status === 'Devis à valider').length
      return `${plural(ok, 'confirmé')}${todo ? `, ${todo} devis à valider` : ''}`
    },
  },
}

// Dossiers proposés pour ranger les fichiers
export const FILE_FOLDERS: Record<number, string[]> = {
  5: ['Moodboards', 'Invitations', 'Signalétique', 'Goodies'],
  6: ['Brief et cadrage', 'Presse', 'Listes et plannings', 'Contrats', 'Charte et logos', 'Modèles'],
}
