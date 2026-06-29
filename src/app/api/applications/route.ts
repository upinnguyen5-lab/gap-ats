import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const campaignId = searchParams.get('campaignId') ?? ''
  
  // Pipeline mostly just fetches by campaignId
  if (!campaignId) {
    return NextResponse.json({ applications: [] })
  }

  const applications = await db.application.findMany({
    where: { campaignId, isDeleted: false },
    include: {
      candidate: { select: { fullName: true, email: true, phone: true, skills: true, yearsExperience: true } },
    },
    orderBy: { createdAt: 'desc' }
  })

  // Parse candidate skills string to array
  const parsedApps = applications.map(app => ({
    ...app,
    candidate: {
      ...app.candidate,
      skills: (() => { try { return JSON.parse(app.candidate.skills) } catch { return [] } })()
    }
  }))

  return NextResponse.json({ applications: parsedApps })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, campaignId, appliedPosition } = await req.json()

  if (!candidateId || !campaignId || !appliedPosition) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const existingApp = await db.application.findFirst({
    where: { candidateId, campaignId, isDeleted: false }
  })

  if (existingApp) {
    return NextResponse.json({ error: 'Ứng viên này đã ứng tuyển vào đợt tuyển dụng này rồi.' }, { status: 400 })
  }

  const application = await db.application.create({
    data: {
      candidateId,
      campaignId,
      appliedPosition,
      currentStatus: 'New',
      parseStatus: 'success',
    }
  })

  await db.applicationStatusHistory.create({
    data: { applicationId: application.id, fromStatus: null, toStatus: 'New', changedById: payload.userId, note: 'Thêm vào đợt mới' },
  })

  return NextResponse.json({ success: true, application })
}
