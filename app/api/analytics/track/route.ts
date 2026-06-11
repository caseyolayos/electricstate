import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

// POST /api/analytics/track
// Body: { event_id: string, type: 'view' | 'ticket_click' }
// Anonymous — no auth required.
export async function POST(req: Request) {
  try {
    const { event_id, type } = await req.json()

    if (!event_id || !['view', 'ticket_click'].includes(type)) {
      return NextResponse.json({ ok: true }) // silently ignore bad payloads
    }

    const column = type === 'view' ? 'views' : 'ticket_clicks'
    const today = new Date().toISOString().split('T')[0]

    const db = createServerClient()

    await db.rpc('increment_event_analytics', {
      p_event_id: event_id,
      p_date: today,
      p_column: column,
    })

    // Errors are intentionally swallowed — analytics should never break UX
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
