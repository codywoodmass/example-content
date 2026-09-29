import { supabase } from './supabase'

// Attaches the current studio user's Supabase access token so /api/xero/* routes
// can verify the caller server-side (see requireStudioUser in src/lib/xero.ts).
export async function xeroAuthedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
  })
}
