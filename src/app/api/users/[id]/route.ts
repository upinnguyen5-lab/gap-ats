import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { role, isActive, password } = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json({ user })
}
