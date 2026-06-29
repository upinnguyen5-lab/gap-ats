import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { parseCV } from '@/lib/cv-parser'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const ALLOWED_EXTS = /\.(pdf|doc|docx)$/i
const MAX_SIZE = 5 * 1024 * 1024

function parseSkills(s: string): string[] {
  try { return JSON.parse(s) } catch { return [] }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gap_ats_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const isBulk = formData.get('bulk') === 'true'
    const manualPosition = formData.get('manualPosition') as string
    const campaignId = (formData.get('campaignId') as string) || null

    const uploadDir = require('os').tmpdir()

    if (!isBulk) {
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'Không có file được chọn' }, { status: 400 })
      if (!ALLOWED_EXTS.test(file.name))
        return NextResponse.json({ error: 'Định dạng file không hợp lệ. Chỉ chấp nhận .pdf, .doc, .docx' }, { status: 400 })
      if (file.size > MAX_SIZE)
        return NextResponse.json({ error: 'File vượt quá 5MB. Vui lòng chọn file nhỏ hơn.' }, { status: 400 })

      const ext = file.name.split('.').pop()
      const savedName = `${uuid()}.${ext}`
      const fullPath = path.join(uploadDir, savedName)
      writeFileSync(fullPath, Buffer.from(await file.arrayBuffer()))

      const parsed = await parseCV(file.name, fullPath)
      const appliedPosition = manualPosition || parsed.appliedPosition || 'Chưa xác định'

      let candidate = undefined
      if (parsed.email) {
        candidate = await db.candidate.findFirst({
          where: { OR: [{ email: parsed.email }, ...(parsed.phone ? [{ phone: parsed.phone }] : [])] },
        })
      }

      if (!candidate) {
        candidate = await db.candidate.create({
          data: {
            fullName: parsed.fullName ?? 'Chưa xác định',
            email: parsed.email ?? `unknown.${uuid().slice(0, 8)}@unknown.com`,
            phone: parsed.phone ?? null,
            yearsExperience: parsed.yearsExperience,
            skills: JSON.stringify(parsed.skills),
            createdById: payload.userId,
          },
        })
      }

      // Check for duplicate application in the same campaign
      let isDuplicate = false
      if (campaignId) {
        const existingApp = await db.application.findFirst({
          where: { candidateId: candidate.id, campaignId, isDeleted: false }
        })
        if (existingApp) isDuplicate = true
      }

      if (isDuplicate) {
        return NextResponse.json({ error: 'Ứng viên này đã có hồ sơ trong đợt tuyển dụng này.' }, { status: 400 })
      }

      const application = await db.application.create({
        data: {
          candidateId: candidate.id,
          campaignId: campaignId!,
          appliedPosition,
          currentStatus: 'New',
          cvFilePath: `/uploads/${savedName}`,
          cvFileName: file.name,
          parseStatus: parsed.success ? 'success' : 'failed',
        }
      })

      await db.applicationStatusHistory.create({
        data: { applicationId: application.id, fromStatus: null, toStatus: 'New', changedById: payload.userId, note: 'Upload CV mới' },
      })

      return NextResponse.json({
        candidate: { ...candidate, skills: parseSkills(candidate.skills) },
        application,
        parseStatus: application.parseStatus,
        isDuplicate: false,
      })
    } else {
      const files = formData.getAll('files') as File[]
      if (!files.length) return NextResponse.json({ error: 'Không có file nào được chọn' }, { status: 400 })

      if (!campaignId) return NextResponse.json({ error: 'Vui lòng chọn đợt tuyển dụng' }, { status: 400 })

      const batch = await db.cvUploadBatch.create({
        data: { uploadedById: payload.userId, totalFiles: files.length, successCount: 0, failedCount: 0 },
      })

      const results: any[] = []
      let successCount = 0, failedCount = 0

      await Promise.all(files.map(async (file) => {
        if (!ALLOWED_EXTS.test(file.name) || file.size > MAX_SIZE) {
          failedCount++
          const msg = !ALLOWED_EXTS.test(file.name) ? 'Định dạng không hợp lệ' : 'File quá 5MB'
          results.push({ fileName: file.name, status: 'failed', message: msg })
          await db.cvUploadItem.create({ data: { batchId: batch.id, fileName: file.name, status: 'failed', errorMessage: msg } })
          return
        }

        try {
          const ext = file.name.split('.').pop()
          const savedName = `${uuid()}.${ext}`
          const fullPath = path.join(uploadDir, savedName)
          writeFileSync(fullPath, Buffer.from(await file.arrayBuffer()))

          const parsed = await parseCV(file.name, fullPath)
          const appliedPosition = manualPosition || parsed.appliedPosition || 'Chưa xác định'

          let candidate = undefined
          if (parsed.email) {
            candidate = await db.candidate.findFirst({
              where: { OR: [{ email: parsed.email }, ...(parsed.phone ? [{ phone: parsed.phone }] : [])] },
            })
          }

          if (!candidate) {
            candidate = await db.candidate.create({
              data: {
                fullName: parsed.fullName ?? 'Chưa xác định',
                email: parsed.email ?? `unknown.${uuid().slice(0, 8)}@unknown.com`,
                phone: parsed.phone ?? null,
                yearsExperience: parsed.yearsExperience,
                skills: JSON.stringify(parsed.skills),
                createdById: payload.userId,
              },
            })
          }

          const existingApp = await db.application.findFirst({
            where: { candidateId: candidate.id, campaignId, isDeleted: false }
          })

          if (existingApp) {
            failedCount++
            results.push({ fileName: file.name, status: 'duplicate', message: 'Đã nộp vào đợt này' })
            await db.cvUploadItem.create({ data: { batchId: batch.id, fileName: file.name, status: 'duplicate', errorMessage: 'Duplicate Application' } })
            return
          }

          const application = await db.application.create({
            data: {
              candidateId: candidate.id,
              campaignId,
              appliedPosition,
              currentStatus: 'New',
              cvFilePath: `/uploads/${savedName}`,
              cvFileName: file.name,
              parseStatus: parsed.success ? 'success' : 'failed',
            }
          })

          await db.cvUploadItem.create({ data: { batchId: batch.id, fileName: file.name, status: 'success', applicationId: application.id } })
          await db.applicationStatusHistory.create({ data: { applicationId: application.id, fromStatus: null, toStatus: 'New', changedById: payload.userId, note: 'Upload hàng loạt' } })

          successCount++
          results.push({ fileName: file.name, status: 'success', candidateId: candidate.id, message: 'Thành công' })
        } catch {
          failedCount++
          results.push({ fileName: file.name, status: 'failed', message: 'Lỗi xử lý file' })
        }
      }))

      await db.cvUploadBatch.update({ where: { id: batch.id }, data: { successCount, failedCount } })
      return NextResponse.json({ batchId: batch.id, results, total: files.length, successCount, failedCount })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
