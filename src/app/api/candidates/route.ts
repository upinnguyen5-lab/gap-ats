import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

function parseSkills(s: string): string[] {
  try { return JSON.parse(s) } catch { return [] }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const position = searchParams.get('position') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
  const campaignId = searchParams.get('campaignId') ?? ''
  const skip = (page - 1) * limit

  // We are querying Candidates, but we want to filter by their Applications if campaignId/status/position are provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (q.length >= 2) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { skills: { contains: q } },
      { applications: { some: { appliedPosition: { contains: q } } } }
    ]
    const numMatch = q.match(/\d+/)
    if (numMatch) {
      const years = parseFloat(numMatch[0])
      where.OR.push({ yearsExperience: { gte: years } })
    }
  }

  // Application filters
  if (campaignId || status || position) {
    where.applications = {
      some: {
        ...(campaignId ? { campaignId } : {}),
        ...(status ? { currentStatus: status } : {}),
        ...(position ? { appliedPosition: { contains: position } } : {}),
        isDeleted: false
      }
    }
  } else {
    // If no specific filters, still only show candidates that have at least one active application
    where.applications = {
      some: { isDeleted: false }
    }
  }

  const [candidates, total] = await Promise.all([
    db.candidate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy: { select: { fullName: true } },
        applications: {
          where: { isDeleted: false },
          include: { campaign: { select: { name: true, isOpen: true } } }
        }
      },
    }),
    db.candidate.count({ where }),
  ])

  return NextResponse.json({
    candidates: candidates.map(c => ({ ...c, skills: parseSkills(c.skills) })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fullName, email, phone, appliedPosition, yearsExperience, skills, notes, campaignId } = await req.json()

  if (!fullName || !email || !appliedPosition || !campaignId)
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Tên, Email, Vị trí, Đợt tuyển dụng)' }, { status: 400 })

  let candidate = await db.candidate.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  })

  if (!candidate) {
    candidate = await db.candidate.create({
      data: {
        fullName, email, phone: phone || null,
        yearsExperience: yearsExperience != null ? parseFloat(yearsExperience) : null,
        skills: JSON.stringify(Array.isArray(skills) ? skills : []),
        notes: notes || null,
        createdById: payload.userId,
      },
    })
  }

  const existingApp = await db.application.findFirst({
    where: { candidateId: candidate.id, campaignId, isDeleted: false }
  })

  if (existingApp) {
    return NextResponse.json({ error: 'Ứng viên này đã ứng tuyển vào đợt tuyển dụng này rồi.' }, { status: 400 })
  }

  const application = await db.application.create({
    data: {
      candidateId: candidate.id,
      campaignId,
      appliedPosition,
      currentStatus: 'New',
      parseStatus: 'success',
    }
  })

  await db.applicationStatusHistory.create({
    data: { applicationId: application.id, fromStatus: null, toStatus: 'New', changedById: payload.userId, note: 'Tạo hồ sơ thủ công' },
  })

  return NextResponse.json({ 
    candidate: { ...candidate, skills: parseSkills(candidate.skills) },
    application 
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (payload.role === 'interviewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Không có ID nào được cung cấp' }, { status: 400 })
    }

    await db.application.updateMany({
      where: { candidateId: { in: ids } },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: payload.userId }
    })

    return NextResponse.json({ success: true, count: ids.length })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
