import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'

export interface ParsedCV {
  fullName: string | null
  email: string | null
  phone: string | null
  yearsExperience: number | null
  skills: string[]
  appliedPosition: string | null
  success: boolean
}

export async function parseCV(fileName: string, fullPath?: string): Promise<ParsedCV> {
  const apiKey = process.env.GEMINI_API_KEY

  if (apiKey && fullPath) {
    try {
      const fileBuffer = readFileSync(fullPath)
      const base64Data = fileBuffer.toString('base64')
      const ext = fileName.split('.').pop()?.toLowerCase()

      // Determine MIME type
      let mimeType = 'application/pdf'
      if (ext === 'doc') mimeType = 'application/msword'
      else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `Trích xuất thông tin từ file CV đính kèm. Trả về đúng ĐỊNH DẠNG JSON (không có markdown code block, không giải thích thêm):
{
  "fullName": "Tên đầy đủ (string hoặc null)",
  "email": "Email (string hoặc null)",
  "phone": "Số điện thoại (string hoặc null)",
  "yearsExperience": Số năm kinh nghiệm ước tính (number hoặc null),
  "skills": ["kỹ năng 1", "kỹ năng 2"],
  "appliedPosition": "Vị trí ứng tuyển phù hợp nhất (string hoặc null)"
}`

      let result
      const { GoogleAIFileManager } = require('@google/generative-ai/server')
      const fileManager = new GoogleAIFileManager(apiKey)
      
      const uploadResult = await fileManager.uploadFile(fullPath, {
        mimeType: mimeType,
        displayName: fileName,
      })
      
      result = await model.generateContent([
        prompt,
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType
          }
        }
      ])
      
      try {
        await fileManager.deleteFile(uploadResult.file.name)
      } catch (err) {
        console.error('Lỗi khi xóa file trên Google AI:', err)
      }

      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
      console.log('Gemini response:', responseText)
      const parsedData = JSON.parse(responseText)

      return {
        fullName: parsedData.fullName || null,
        email: parsedData.email || null,
        phone: parsedData.phone || null,
        yearsExperience: parsedData.yearsExperience || null,
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        appliedPosition: parsedData.appliedPosition || null,
        success: true
      }
    } catch (e: any) {
      console.error('Lỗi Gemini AI parsing CV:', e)
      return {
        fullName: `[LỖI AI] ${String(e.message || e).substring(0, 100)}`,
        email: `error.${Math.floor(Math.random() * 10000)}@gemini.com`,
        phone: '0000000000',
        yearsExperience: 0,
        skills: ['Lỗi kết nối AI'],
        appliedPosition: 'Không xác định',
        success: false
      }
    }
  }

  // Fallback to mock when no API key
  return {
    fullName: `[LỖI] KHÔNG TÌM THẤY GEMINI_API_KEY`,
    email: `no-key.${Math.floor(Math.random() * 90000) + 10000}@error.com`,
    phone: '0000000000',
    yearsExperience: 0,
    skills: ['Thiếu API Key'],
    appliedPosition: 'Chưa cấu hình API Key',
    success: false,
  }
}
