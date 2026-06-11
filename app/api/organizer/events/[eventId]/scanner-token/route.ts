import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

// GET  — return existing scanner token (creates one if missing)
// POST — regenerate scanner token (invalidates the old link)
async function handler(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await params
  const db = createServerClient()

  // Verify ownership
  const { data: festival } = await db
    .from('festivals')
    .select('id, submitted_by, scanner_token')
    .eq('id', eventId)
    .single()

  if (!festival) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (festival.submitted_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // POST = regenerate (invalidates old link)
  if (req.method === 'POST') {
    const newToken = crypto.randomUUID()
    const { error } = await db
      .from('festivals')
      .update({ scanner_token: newToken })
      .eq('id', eventId)
    if (error) return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
    return NextResponse.json({ scannerToken: newToken })
  }

  // GET = return existing token (or create one if somehow missing)
  let scannerToken = festival.scanner_token
  if (!scannerToken) {
    scannerToken = crypto.randomUUID()
    await db.from('festivals').update({ scanner_token: scannerToken }).eq('id', eventId)
  }

  return NextResponse.json({ scannerToken })
}

export { handler as GET, handler as POST }
