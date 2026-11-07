// Mémoire des dernières données chargées : une page déjà vue s'affiche tout de suite,
// puis se met à jour en arrière-plan.
const store = new Map<string, unknown>()

export function peek<T>(key: string): T | null {
  return (store.get(key) as T | undefined) ?? null
}

export function keep<T>(key: string): (v: T) => T {
  return (v) => {
    store.set(key, v)
    return v
  }
}

export function clearCache() {
  store.clear()
}
