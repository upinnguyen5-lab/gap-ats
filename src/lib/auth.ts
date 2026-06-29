import { SignJWT, jwtVerify } from 'jose'

export interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'hr'
  fullName: string
}

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? 'gap-ats-fallback-secret-2024')

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
