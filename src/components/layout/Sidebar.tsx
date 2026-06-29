'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn, ROLE_LABELS } from '@/lib/utils'
import {
  LayoutDashboard, Upload, Users, GitBranch, Settings,
  LogOut, Building2, ChevronLeft, ChevronRight, Trash2,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface SidebarProps {
  user: { fullName: string; email: string; role: string }
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Upload CV' },
  { href: '/candidates', icon: Users, label: 'Ứng viên' },
  { href: '/pipeline', icon: GitBranch, label: 'Pipeline' },
]

const adminItems = [
  { href: '/settings/campaigns', icon: GitBranch, label: 'Đợt tuyển dụng' },
  { href: '/settings/users', icon: Settings, label: 'Phân quyền' },
  { href: '/settings/recycle', icon: Trash2, label: 'Thùng rác' },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(pathname.startsWith('/settings'))

  // Save the current URL (with search params) for the active module
  useEffect(() => {
    const basePath = '/' + pathname.split('/')[1]
    if (basePath && basePath !== '/') {
      const fullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      sessionStorage.setItem(`last_visit_${basePath}`, fullUrl)
    }
  }, [pathname, searchParams])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = isActive(href)
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      const basePath = '/' + href.split('/')[1]
      if (href === basePath) {
        const savedHref = sessionStorage.getItem(`last_visit_${basePath}`)
        router.push(savedHref || href)
      } else {
        router.push(href)
      }
    }

    return (
      <a
        href={href}
        onClick={handleClick}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-red-600 text-white shadow-lg'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        )}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-colors',
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
        )} />
        {!collapsed && <span className="text-sm font-medium">{label}</span>}
      </a>
    )
  }

  return (
    <aside
      className="flex flex-col h-full flex-shrink-0 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '256px', background: '#0F172A' }}
    >
      {/* Header */}
      <div
        className={cn('flex items-center gap-3 border-b transition-all', collapsed ? 'p-3 justify-center' : 'p-4')}
        style={{ borderColor: '#1E293B' }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-lg overflow-hidden"
        >
          <img src="/logo.png" alt="GAP" className="w-full h-full object-contain p-1" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-base leading-tight">GAP ATS</p>
            <p className="text-slate-500 text-xs truncate">gapsoftware.asia</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {!collapsed && (
          <p className="text-slate-600 text-xs font-semibold px-3 py-2 uppercase tracking-widest">
            Menu
          </p>
        )}

        {navItems.map(item => <NavLink key={item.href} {...item} />)}

        {/* Admin-only section */}
        {user.role === 'admin' && (
          <>
            {!collapsed && (
              <p className="text-slate-600 text-xs font-semibold px-3 pt-4 pb-2 uppercase tracking-widest">
                Quản trị
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-slate-800" />}
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Bottom: user info + logout + collapse toggle */}
      <div className="p-3 space-y-1" style={{ borderTop: '1px solid #1E293B' }}>
        {!collapsed && (
          <div className="px-3 py-2.5 rounded-xl mb-1" style={{ background: '#1E293B' }}>
            <p className="text-slate-200 text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-slate-500 text-xs truncate">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-red-950 hover:text-red-400 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm">Đăng xuất</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 rounded-xl text-slate-700 hover:bg-slate-800 hover:text-slate-400 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
