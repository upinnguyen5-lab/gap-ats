import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await db.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: { select: { fullName: true } },
      createdBy: { select: { fullName: true } },
    }
  })

  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, assigneeId } = await req.json()
  if (!title || !assigneeId) return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })

  const task = await db.task.create({
    data: {
      title,
      description,
      assigneeId,
      createdById: payload.userId,
    }
  })

  return NextResponse.json({ task }, { status: 201 })
}
