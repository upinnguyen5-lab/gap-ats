import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signToken, JWTPayload } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 })

    const user = await db.user.findUnique({ where: { email } })

    if (!user || !user.isActive)
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })

    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid)
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as JWTPayload['role'],
      fullName: user.fullName,
    })

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    })

    response.cookies.set('gap_ats_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/',
    })

    return response
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
