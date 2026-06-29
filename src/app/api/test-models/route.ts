import { NextResponse } from 'next/server'
import https from 'https'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return NextResponse.json({ error: 'No API key found' })

  return new Promise((resolve) => {
    https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(NextResponse.json({
            status: res.statusCode,
            models: parsed.models ? parsed.models.map((m: any) => m.name) : parsed
          }))
        } catch (e) {
          resolve(NextResponse.json({ error: 'Parse error', data }))
        }
      })
    }).on('error', (err) => {
      resolve(NextResponse.json({ error: err.message }))
    })
  })
}
