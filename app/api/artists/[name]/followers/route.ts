import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const revalidate = 60 // refresh every minute

function toArtistCase(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const raw = decodeURIComponent(params.name)
  // Normalize to title case so "fisher" and "Fisher" both match stored "Fisher"
  const artistName = toArtistCase(raw)

  try {
    const supabase = createServerClient()
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .contains('followed_artists', [artistName])

    if (error) return NextResponse.json({ count: 0 })
    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
