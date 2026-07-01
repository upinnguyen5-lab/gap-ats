import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const positions = await db.position.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { fullName: true } }
    }
  })

  return NextResponse.json({ positions })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'hr_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  try {
    const pos = await db.position.create({
      data: {
        name,
        description,
        createdById: payload.userId,
      }
    })
    return NextResponse.json({ position: pos })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Vị trí này đã tồn tại' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
