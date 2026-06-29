import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  })

  if (!user || !user.isActive) {
    const response = NextResponse.json({ error: 'User not found' }, { status: 404 })
    response.cookies.delete('gap_ats_token')
    return response
  }
  return NextResponse.json({ user })
}
