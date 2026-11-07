const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function today(): string {
  const d = new Date()
  return iso(d)
}

export function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null
  const a = new Date(today() + 'T00:00:00')
  const b = new Date(date + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function shortDate(date: string | null): string {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const thisYear = new Date().getFullYear()
  return `${d} ${MONTHS[m - 1]}${y !== thisYear ? ' ' + y : ''}`
}

export function countdown(date: string | null): string {
  const n = daysUntil(date)
  if (n === null) return 'Date à fixer'
  if (n === 0) return 'Jour J'
  if (n > 0) return `J-${n}`
  return `J+${-n}`
}

export function isLate(due: string | null, done: boolean): boolean {
  if (!due || done) return false
  return due < today()
}

export function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 86400 * 7) return `il y a ${Math.floor(s / 86400)} j`
  return shortDate(ts.slice(0, 10))
}

export function fileSize(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

export function fileExt(name: string): string {
  const m = name.match(/\.([a-z0-9]{1,5})$/i)
  return m ? m[1].toUpperCase() : 'FICH'
}

// Mentions stockées sous la forme @[Prénom](id)
export const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-zA-Z-]+)\)/g

export function mentionIds(body: string): string[] {
  const ids = new Set<string>()
  for (const m of body.matchAll(MENTION_RE)) ids.add(m[2])
  return [...ids]
}

export function plainText(body: string): string {
  return body.replace(MENTION_RE, '@$1')
}
