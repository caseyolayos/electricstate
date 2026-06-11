/**
 * GET /api/events/live
 * Returns any festivals with active livestreams happening today.
 * No geo filter — live events are globally visible.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const revalidate = 60  // refresh every minute

export async function GET() {
  const supabase = createServerClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

  const { data } = await supabase
    .from('festivals')
    .select('id, name, image_url, livestreams, date_start, date_end, slug')
    .eq('status', 'approved')
    .not('livestreams', 'is', null)
    .lte('date_start', today)
    .or(`date_end.gte.${today},date_start.eq.${today}`)
    .limit(10)

  const live = (data ?? []).filter(
    (e: { livestreams: unknown }) =>
      Array.isArray(e.livestreams) && (e.livestreams as unknown[]).length > 0
  ).map((e: { livestreams: { label: string; url: string; starts_at?: string }[] } & Record<string, unknown>) => {
    // Derive earliest starts_at across all stages (if set)
    const startsAt = e.livestreams
      .map(s => s.starts_at)
      .filter(Boolean)
      .sort()[0] ?? null
    return { ...e, starts_at: startsAt }
  })

  return NextResponse.json({ events: live })
}
