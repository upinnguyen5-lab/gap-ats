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
  if (!payload || payload.role === 'hiring') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const deletedApps = await db.application.findMany({
    where: { isDeleted: true },
    orderBy: { deletedAt: 'desc' },
    include: { candidate: true }
  })

  const mapped = deletedApps.map(a => ({
    id: a.id,
    fullName: a.candidate.fullName,
    email: a.candidate.email,
    appliedPosition: a.appliedPosition,
    currentStatus: a.currentStatus,
    deletedAt: a.deletedAt,
    deletedBy: a.deletedBy
  }))

  return NextResponse.json({ candidates: mapped })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || payload.role === 'hiring') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { candidateId } = await req.json()
  // candidateId here is actually applicationId based on the new logic
  await db.application.update({
    where: { id: candidateId },
    data: { isDeleted: false, deletedAt: null, deletedBy: null },
  })
  return NextResponse.json({ success: true })
}
