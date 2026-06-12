import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (!process.env.MIGRATE_SECRET || auth !== `Bearer ${process.env.MIGRATE_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Run DDL via Supabase's pg connection (service role can do this via the REST SQL endpoint)
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/run_migration`
  // Fallback: just try updating a profile with spotify_url to trigger schema cache refresh
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000000`, {
    method: 'PATCH',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ spotify_url: null }),
  })
  return NextResponse.json({ status: res.status, ok: res.ok })
}
