import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const { eventId, imageUrl } = await req.json()
    if (!eventId || !imageUrl) {
      return NextResponse.json({ error: 'Missing eventId or imageUrl' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('festivals')
      .update({ image_url: imageUrl })
      .eq('id', eventId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Flyer update error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
