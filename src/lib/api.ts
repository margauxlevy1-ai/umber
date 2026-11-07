import { demoApi } from './api-demo'
import { supabaseApi } from './api-supabase'
import type { Api } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const DEMO_FLAG = 'umber-demo'

function wantsDemo(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) localStorage.setItem(DEMO_FLAG, '1')
    return localStorage.getItem(DEMO_FLAG) === '1'
  } catch {
    return false
  }
}

export const supabaseReady = Boolean(url && key)

export const api: Api = supabaseReady && !wantsDemo() ? supabaseApi(url!, key!) : demoApi()

export function enterDemo() {
  localStorage.setItem(DEMO_FLAG, '1')
  window.location.href = '/'
}

export function leaveDemo() {
  localStorage.removeItem(DEMO_FLAG)
  localStorage.removeItem('umber-demo-user')
  window.location.href = '/'
}
