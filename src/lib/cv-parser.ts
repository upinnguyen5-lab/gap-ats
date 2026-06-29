import { readFileSync } from 'fs'
import https from 'https'

export interface ParsedCV {
  fullName: string | null
  email: string | null
  phone: string | null
  yearsExperience: number | null
  skills: string[]
  appliedPosition: string | null
  success: boolean
}

function callGeminiREST(prompt: string, base64Data: string, mimeType: string, apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }]
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response from Google'));
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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

      const prompt = `Trích xuất thông tin từ file CV đính kèm. Trả về đúng ĐỊNH DẠNG JSON (không có markdown code block, không giải thích thêm):
{
  "fullName": "Tên đầy đủ (string hoặc null)",
  "email": "Email (string hoặc null)",
  "phone": "Số điện thoại (string hoặc null)",
  "yearsExperience": Số năm kinh nghiệm ước tính (number hoặc null),
  "skills": ["kỹ năng 1", "kỹ năng 2"],
  "appliedPosition": "Vị trí ứng tuyển phù hợp nhất (string hoặc null)"
}`

      const jsonResponse = await callGeminiREST(prompt, base64Data, mimeType, apiKey)
      
      const textOutput = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const responseText = textOutput.replace(/```json/g, '').replace(/```/g, '').trim()
      console.log('Gemini response:', responseText)
      
      const parsedData = JSON.parse(responseText || '{}')

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
