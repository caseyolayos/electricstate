import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Server-side OAuth callback handler.
// Exchanges the code for a session entirely server-side using cookie-stored PKCE verifier.
// Works in iOS PWA, Safari, Chrome — no client-side storage required.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // OAuth error from Google/Supabase
  if (errorParam) {
    const msg = errorDesc || errorParam
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
  }

  // Password reset / magic link — hand off to client-side page
  if (tokenHash && type) {
    return NextResponse.redirect(`${origin}/auth/reset-password?token_hash=${tokenHash}&type=${type}`)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)),
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/passport`)
    }

    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Nothing to handle
  return NextResponse.redirect(`${origin}/login`)
}
