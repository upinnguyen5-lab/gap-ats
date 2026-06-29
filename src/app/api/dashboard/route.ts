import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

function parseSkills(skills: string): string[] {
  try { return JSON.parse(skills) } catch { return [] }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalApplications,
    screeningCount,
    interviewCount,
    hiredThisMonth,
    recentApplications,
    statusGroups,
    recentActivity,
    campaignsProgress,
  ] = await Promise.all([
    db.application.count({ where: { isDeleted: false } }),
    db.application.count({ where: { isDeleted: false, currentStatus: 'Screening' } }),
    db.application.count({ where: { isDeleted: false, currentStatus: 'Interview' } }),
    db.application.count({
      where: { isDeleted: false, currentStatus: 'Hired', updatedAt: { gte: startOfMonth } },
    }),
    db.application.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { candidate: { select: { fullName: true, skills: true } } },
    }),
    db.application.groupBy({
      by: ['currentStatus'],
      where: { isDeleted: false },
      _count: true,
    }),
    db.applicationStatusHistory.findMany({
      orderBy: { changedAt: 'desc' },
      take: 10,
      include: {
        application: { include: { candidate: { select: { fullName: true } } } },
        changedBy: { select: { fullName: true } },
      },
    }),
    db.campaign.findMany({
      where: { isOpen: true },
      include: { _count: { select: { applications: { where: { isDeleted: false, currentStatus: 'Hired' } } } } }
    }),
  ])

  const statusDistribution = ['New', 'Screening', 'Interview', 'Hired', 'Rejected'].map(status => ({
    status,
    count: statusGroups.find(s => s.currentStatus === status)?._count ?? 0,
  }))

  return NextResponse.json({
    stats: { totalApplications, screeningCount, interviewCount, hiredThisMonth },
    recentApplications: recentApplications.map(a => ({
      id: a.id,
      candidateId: a.candidateId,
      fullName: a.candidate.fullName,
      appliedPosition: a.appliedPosition,
      currentStatus: a.currentStatus,
      createdAt: a.createdAt,
      skills: parseSkills(a.candidate.skills),
    })),
    statusDistribution,
    recentActivity: recentActivity.map(h => ({
      id: h.id,
      candidateName: h.application.candidate.fullName,
      changedBy: h.changedBy.fullName,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedAt: h.changedAt,
      note: h.note,
    })),
    campaignsProgress: campaignsProgress.map(c => ({
      id: c.id,
      name: c.name,
      kpi: c.kpiTarget,
      hired: c._count.applications
    })),
  })
}
