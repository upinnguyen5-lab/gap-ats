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
      const ext = fileName.split('.').pop()?.toLowerCase()
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      let result
      
      if (ext === 'pdf') {
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(fileBuffer)
        
        const textPrompt = `Trích xuất thông tin từ đoạn text CV dưới đây. Trả về đúng ĐỊNH DẠNG JSON (không có markdown code block, không giải thích thêm):
{
  "fullName": "Tên đầy đủ (string hoặc null)",
  "email": "Email (string hoặc null)",
  "phone": "Số điện thoại (string hoặc null)",
  "yearsExperience": Số năm kinh nghiệm ước tính (number hoặc null),
  "skills": ["kỹ năng 1", "kỹ năng 2"],
  "appliedPosition": "Vị trí ứng tuyển phù hợp nhất (string hoặc null)"
}

Nội dung CV:
${pdfData.text.substring(0, 20000)}`

        result = await model.generateContent(textPrompt)
      } else {
        // Fallback for doc/docx using inlineData
        const base64Data = fileBuffer.toString('base64')
        let mimeType = 'application/msword'
        if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        const prompt = `Trích xuất thông tin từ file CV đính kèm. Trả về đúng ĐỊNH DẠNG JSON (không có markdown code block, không giải thích thêm):
{
  "fullName": "Tên đầy đủ (string hoặc null)",
  "email": "Email (string hoặc null)",
  "phone": "Số điện thoại (string hoặc null)",
  "yearsExperience": Số năm kinh nghiệm ước tính (number hoặc null),
  "skills": ["kỹ năng 1", "kỹ năng 2"],
  "appliedPosition": "Vị trí ứng tuyển phù hợp nhất (string hoặc null)"
}`
        result = await model.generateContent([
          prompt,
          { inlineData: { mimeType, data: base64Data } }
        ])
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
