import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { fullName, email, role, password } = await req.json()
  if (!fullName || !email || !role)
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email đã tồn tại trong hệ thống' }, { status: 409 })

  const tempPassword = password || `Gap@${Math.floor(Math.random() * 9000) + 1000}`
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = await db.user.create({
    data: { fullName, email, role, passwordHash },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
  })

  return NextResponse.json({ user, tempPassword }, { status: 201 })
}
