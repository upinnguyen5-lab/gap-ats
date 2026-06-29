import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { isCompleted } = await req.json()

  // Only assignee or admin can complete task
  const task = await db.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (payload.role !== 'admin' && payload.userId !== task.assigneeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updatedTask = await db.task.update({
    where: { id },
    data: { isCompleted }
  })

  return NextResponse.json({ task: updatedTask })
}
