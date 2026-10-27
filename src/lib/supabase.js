import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configure = Boolean(url && cle)
export const supabase = configure
  ? createClient(url, cle, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
