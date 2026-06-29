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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const prompt = `Trích xuất thông tin từ file CV đính kèm. Trả về đúng ĐỊNH DẠNG JSON (không có markdown code block, không giải thích thêm):
{
  "fullName": "Tên đầy đủ (string hoặc null)",
  "email": "Email (string hoặc null)",
  "phone": "Số điện thoại (string hoặc null)",
  "yearsExperience": Số năm kinh nghiệm ước tính (number hoặc null),
  "skills": ["kỹ năng 1", "kỹ năng 2"],
  "appliedPosition": "Vị trí ứng tuyển phù hợp nhất (string hoặc null)"
}`

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: base64Data
          }
        }
      ])

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
    } catch (e) {
      console.error('Lỗi Gemini AI parsing CV:', e)
    }
  }

  // Fallback to mock when no API key or parsing fails
  const SAMPLE_SKILLS = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Java', 'Figma', 'Excel', 'PowerBI', 'Agile', 'Scrum', 'Git', 'Marketing Strategy', 'SEO', 'Content Writing', 'Data Analysis']
  const SAMPLE_NAMES = ['Nguyễn Văn Hùng', 'Trần Thị Lan', 'Lê Hoàng Minh', 'Phạm Thị Thu', 'Hoàng Văn Đức', 'Vũ Thị Hoa', 'Đặng Văn Long', 'Bùi Thị Quỳnh']
  
  const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]
  const randomId = Math.floor(Math.random() * 90000) + 10000
  const randomSkills = [...SAMPLE_SKILLS].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4) + 3)
  const POSITIONS = ['Software Engineer', 'Marketing Executive', 'Business Analyst', 'Project Manager', 'UX Designer']
  const appliedPosition = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]

  return {
    fullName: name,
    email: `ungvien.${randomId}@gmail.com`,
    phone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    yearsExperience: Math.floor(Math.random() * 8) + 1,
    skills: randomSkills,
    appliedPosition,
    success: false,
  }
}
