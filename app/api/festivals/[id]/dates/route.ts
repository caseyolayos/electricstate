import { createServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const festivalId = params.id.replace('festival-', '')

  try {
    const supabase = createServerClient()

    // Get the slug and date range for this festival
    const { data: festival } = await supabase
      .from('festivals')
      .select('slug, date_start, date_end')
      .eq('id', festivalId)
      .single()

    if (!festival?.date_start) {
      return NextResponse.json({ dates: [] })
    }

    // If date_end is set, generate every date in the range directly
    if (festival.date_end && festival.date_end > festival.date_start) {
      const dates: string[] = []
      const cur = new Date(festival.date_start + 'T00:00:00Z')
      const end = new Date(festival.date_end + 'T00:00:00Z')
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
      return NextResponse.json({ dates }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!festival?.slug) {
      return NextResponse.json({ dates: [festival.date_start] })
    }

    // Fallback: find sibling rows with same slug within a 14-day window
    const anchor = new Date(festival.date_start + 'T00:00:00Z')
    const from = new Date(anchor)
    from.setDate(anchor.getDate() - 7)
    const to = new Date(anchor)
    to.setDate(anchor.getDate() + 7)

    const { data: siblings } = await supabase
      .from('festivals')
      .select('date_start')
      .eq('slug', festival.slug)
      .not('date_start', 'is', null)
      .gte('date_start', from.toISOString().split('T')[0])
      .lte('date_start', to.toISOString().split('T')[0])
      .order('date_start', { ascending: true })

    // Deduplicate dates
    const seen = new Set<string>()
    const dates = (siblings || [])
      .map(s => s.date_start as string)
      .filter(d => { if (!d || seen.has(d)) return false; seen.add(d); return true })

    return NextResponse.json({ dates: dates.length > 0 ? dates : [festival.date_start] })
  } catch {
    return NextResponse.json({ dates: [] })
  }
}
