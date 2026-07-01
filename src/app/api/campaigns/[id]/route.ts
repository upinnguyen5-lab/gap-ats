import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (payload.role !== 'admin' && payload.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { name, isOpen, kpiTarget } = await req.json()

  const data: any = {}
  if (name !== undefined) data.name = name
  if (isOpen !== undefined) data.isOpen = isOpen
  if (kpiTarget !== undefined) data.kpiTarget = parseInt(kpiTarget)

  const campaign = await db.campaign.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { applications: { where: { isDeleted: false } } } }
    }
  })

  return NextResponse.json({ campaign })
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (payload.role !== 'admin' && payload.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  
  // Check if campaign has applications
  const count = await db.application.count({ where: { campaignId: id, isDeleted: false } })
  if (count > 0) {
    return NextResponse.json({ error: 'Không thể xóa đợt tuyển dụng đang có ứng viên. Vui lòng đóng đợt tuyển thay vì xóa.' }, { status: 400 })
  }

  await db.campaign.delete({ where: { id } })
  
  return NextResponse.json({ success: true })
}
