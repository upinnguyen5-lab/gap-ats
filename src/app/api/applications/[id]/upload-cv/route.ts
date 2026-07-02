import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import path from 'path'
import { writeFileSync } from 'fs'
import { v4 as uuid } from 'uuid'

const ALLOWED_EXTS = /\.(pdf|doc|docx)$/i
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

type Props = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  
  const application = await db.application.findUnique({ where: { id } })
  if (!application) return NextResponse.json({ error: 'Không tìm thấy ứng tuyển' }, { status: 404 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) return NextResponse.json({ error: 'Không có file được chọn' }, { status: 400 })
    if (!ALLOWED_EXTS.test(file.name))
      return NextResponse.json({ error: 'Định dạng file không hợp lệ. Chỉ chấp nhận .pdf, .doc, .docx' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'File vượt quá 5MB. Vui lòng chọn file nhỏ hơn.' }, { status: 400 })

    const uploadDir = require('os').tmpdir()
    const ext = file.name.split('.').pop()
    const savedName = `${uuid()}.${ext}`
    const fullPath = path.join(uploadDir, savedName)
    writeFileSync(fullPath, Buffer.from(await file.arrayBuffer()))

    await db.application.update({
      where: { id },
      data: {
        cvFileName: file.name,
        cvFilePath: `/uploads/${savedName}`
      }
    })

    await db.applicationStatusHistory.create({
      data: { applicationId: id, fromStatus: application.currentStatus, toStatus: application.currentStatus, changedById: payload.userId, note: 'Bổ sung CV' },
    })

    return NextResponse.json({ success: true, cvFileName: file.name, cvFilePath: `/uploads/${savedName}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
