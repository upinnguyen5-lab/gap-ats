import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

type Props = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (!['admin', 'hr', 'hr_manager'].includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  
  const application = await db.application.findUnique({ where: { id } })
  if (!application) return NextResponse.json({ error: 'Không tìm thấy ứng tuyển' }, { status: 404 })

  await db.application.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy: payload.userId }
  })
  
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  
  const application = await db.application.findUnique({ where: { id } })
  if (!application) return NextResponse.json({ error: 'Không tìm thấy ứng tuyển' }, { status: 404 })

  const body = await req.json()
  
  if (body.appliedPosition) {
    await db.application.update({
      where: { id },
      data: { appliedPosition: body.appliedPosition }
    })
  }

  return NextResponse.json({ success: true })
}
