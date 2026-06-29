import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

type Props = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { toStatus, note } = await req.json()

  if (!toStatus) return NextResponse.json({ error: 'Thiếu toStatus' }, { status: 400 })

  const application = await db.application.findUnique({ where: { id } })
  if (!application) return NextResponse.json({ error: 'Không tìm thấy đơn ứng tuyển' }, { status: 404 })

  if (application.currentStatus === toStatus) {
    return NextResponse.json({ error: 'Trạng thái không thay đổi' }, { status: 400 })
  }

  const updated = await db.application.update({
    where: { id },
    data: { currentStatus: toStatus },
  })

  await db.applicationStatusHistory.create({
    data: {
      applicationId: id,
      fromStatus: application.currentStatus,
      toStatus,
      changedById: payload.userId,
      note: note || null,
    },
  })

  return NextResponse.json({ success: true, application: updated })
}
