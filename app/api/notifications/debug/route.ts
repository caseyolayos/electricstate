import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  let authUserId: string | null = null
  let tokenError: string | null = null
  let authMethod: string = 'none'

  // Try header token
  if (token) {
    try {
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { data: { user }, error } = await anon.auth.getUser(token)
      authUserId = user?.id ?? null
      tokenError = error?.message ?? null
      if (user) authMethod = 'header'
    } catch (e) { tokenError = String(e) }
  }

  // Try cookie-based auth
  if (!authUserId) {
    try {
      const cookieStore = cookies()
      const supabase = createSSRClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { authUserId = user.id; authMethod = 'cookie' }
    } catch {}
  }

  const supabase = createServerClient()

  // Step 2: query notifications with auth user id
  let notificationsResult: unknown = null
  let notificationsError: string | null = null
  if (authUserId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(10)
    notificationsResult = data
    notificationsError = error?.message ?? null
  }

  // Step 3: query all notifications (no filter) to see what's in the table
  const { data: allRows } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    hasToken: !!token,
    authMethod,
    authUserId,
    tokenError,
    notificationsForUser: notificationsResult,
    notificationsError,
    allNotificationsInTable: allRows,
  })
}
