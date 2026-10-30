import { createClient } from '@supabase/supabase-js'

const clean = (v) => String(v ?? '').trim().replace(/^["']+|["']+$/g, '').trim()
let url = clean(import.meta.env.VITE_SUPABASE_URL)
const anon = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)
if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url

export const supabase = url && anon ? createClient(url, anon) : null

// base_date(20261030) + base_time(1000) → 한국시간 ISO 문자열
const toObservedAt = (d, t) =>
  `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:00+09:00`

// 같은 지점·같은 시각이면 중복 저장하지 않아요 (unique 충돌 시 무시).
export async function saveObservation(o) {
  if (!supabase) throw new Error('Supabase 환경변수(.env.local)가 없어요.')
  const row = {
    nx: o.nx, ny: o.ny,
    observed_at: toObservedAt(o.base_date, o.base_time),
    t1h: o.t1h, reh: o.reh, rn1: o.rn1, wsd: o.wsd,
    vec: o.vec, pty: o.pty, uuu: o.uuu, vvv: o.vvv,
  }
  const { error } = await supabase
    .from('weather_observations')
    .upsert(row, { onConflict: 'nx,ny,observed_at', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function loadRecent(limit = 8) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('weather_observations')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}
