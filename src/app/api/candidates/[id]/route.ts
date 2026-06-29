import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

function parseSkills(s: string): string[] {
  try { return JSON.parse(s) } catch { return [] }
}

type Props = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: {
      createdBy: { select: { fullName: true, email: true } },
      applications: {
        where: { isDeleted: false },
        include: {
          campaign: { select: { name: true, isOpen: true } },
          statusHistory: {
            include: { changedBy: { select: { fullName: true, role: true } } },
            orderBy: { changedAt: 'desc' },
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    },
  })

  if (!candidate) return NextResponse.json({ error: 'Không tìm thấy ứng viên' }, { status: 404 })
  return NextResponse.json({ candidate: { ...candidate, skills: parseSkills(candidate.skills) } })
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (body.fullName !== undefined) data.fullName = body.fullName
  if (body.email !== undefined) data.email = body.email
  if (body.phone !== undefined) data.phone = body.phone
  if (body.yearsExperience !== undefined) data.yearsExperience = body.yearsExperience != null ? parseFloat(body.yearsExperience) : null
  if (body.skills !== undefined) data.skills = JSON.stringify(Array.isArray(body.skills) ? body.skills : [])
  if (body.notes !== undefined) data.notes = body.notes

  const candidate = await db.candidate.update({ where: { id }, data })
  return NextResponse.json({ candidate: { ...candidate, skills: parseSkills(candidate.skills) } })
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.application.updateMany({
    where: { candidateId: id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy: payload.userId }
  })
  
  return NextResponse.json({ success: true })
}
