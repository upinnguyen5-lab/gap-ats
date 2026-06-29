'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Building2 } from 'lucide-react'

interface User { id: string; fullName: string; email: string; role: string }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) { window.location.href = '/login'; return null }
        return res.json()
      })
      .then(data => { if (data?.user) setUser(data.user) })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl animate-pulse bg-white overflow-hidden p-1.5">
            <img src="/logo.png" alt="GAP" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 font-semibold text-lg">GAP ATS</p>
            <p className="text-slate-400 text-sm mt-0.5">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
