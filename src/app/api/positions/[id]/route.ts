import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'hr_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, isActive } = await req.json()
  const { id } = await params

  try {
    const pos = await db.position.update({
      where: { id },
      data: { name, description, isActive }
    })
    return NextResponse.json({ position: pos })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Vị trí này đã tồn tại' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'hr_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    await db.position.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Không thể xóa vị trí này' }, { status: 500 })
  }
}
