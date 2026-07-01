import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const isOpen = searchParams.get('isOpen')

  const where: any = {}
  if (isOpen === 'true') where.isOpen = true
  if (isOpen === 'false') where.isOpen = false

  const campaigns = await db.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { applications: { where: { isDeleted: false } } } }
    }
  })

  return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (payload.role !== 'admin' && payload.role !== 'hr_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, kpiTarget } = await req.json()
  if (!name) return NextResponse.json({ error: 'Thiếu tên đợt tuyển dụng' }, { status: 400 })

  const campaign = await db.campaign.create({
    data: {
      name,
      kpiTarget: kpiTarget ? parseInt(kpiTarget) : 0,
      isOpen: true,
      createdById: payload.userId,
    }
  })

  return NextResponse.json({ campaign }, { status: 201 })
}
