'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Loader2, Building2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Đăng nhập thất bại'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #1E3A5F 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #DC2626, transparent)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #EF4444, transparent)', transform: 'translate(-30%, 30%)' }} />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-2xl bg-white overflow-hidden p-1.5">
            <Building2 className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">GAP ATS</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Applicant Tracking System — GAP Global</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Đăng nhập hệ thống</h2>

          {error && (
            <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl text-sm text-red-700 border"
              style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@gapsoftware.asia"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-slate-800 text-sm transition-all"
                  style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#DC2626'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-slate-800 text-sm transition-all"
                  style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#DC2626'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-60 shadow-lg"
              style={{
                background: loading ? '#FCA5A5' : 'linear-gradient(135deg, #DC2626, #EF4444)',
                boxShadow: '0 4px 20px rgba(220,38,38,0.35)'
              }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wide">Tài khoản demo</p>
            <div className="space-y-2 text-xs">
              {[
                ['Admin', 'admin@gapsoftware.asia', 'Admin@123'],
                ['HR', 'huong.tran@gapsoftware.asia', 'Hr@123456'],
                ['HR Manager', 'lan.pham@gapsoftware.asia', 'Hr@123456'],
                ['Hiring', 'tung.truong@gapsoftware.asia', 'Hr@123456'],
              ].map(([role, em, pw]) => (
                <button key={em} type="button"
                  onClick={() => { setEmail(em); setPassword(pw) }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors text-left group">
                  <span className="text-slate-500 font-medium">{role}</span>
                  <span className="text-slate-400 font-mono group-hover:text-red-600 transition-colors">{em}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2024 GAP Global. Bản quyền thuộc về GAP Software Asia.
        </p>
      </div>
    </div>
  )
}
