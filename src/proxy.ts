import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('gap_ats_token')?.value

  const isAuthPage = pathname === '/login'
  const isRoot = pathname === '/'
  const isAuthAPI = pathname.startsWith('/api/auth')
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/public')

  if (isStatic || isAuthAPI) return NextResponse.next()

  if (!token) {
    if (isAuthPage || isRoot) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifyToken(token)

  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('gap_ats_token')
    return res
  }

  // Redirect logged-in users away from login
  if (isAuthPage || isRoot) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Admin-only route guard
  if (pathname.startsWith('/settings') && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
