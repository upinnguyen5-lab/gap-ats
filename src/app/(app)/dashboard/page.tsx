'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatRelativeTime, STATUS_LABELS } from '@/lib/utils'
import {
  Users, TrendingUp, Calendar, UserCheck, ArrowRight,
  Upload, Activity, ChevronRight, Target, ExternalLink, Briefcase
} from 'lucide-react'
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

interface Stats { totalApplications: number; screeningCount: number; interviewCount: number; hiredThisMonth: number }
interface RecentApp { id: string; candidateId: string; fullName: string; appliedPosition: string; currentStatus: string; createdAt: string; skills: string[] }
interface DistItem { status: string; count: number }
interface ActivityItem { id: string; candidateName: string; changedBy: string; fromStatus: string | null; toStatus: string; changedAt: string; note: string | null }
interface CampaignProgress { id: string; name: string; kpi: number; hired: number }

const STATUS_COLORS: Record<string, string> = {
  New: '#9CA3AF', Screening: '#3B82F6', Interview: '#F59E0B', Hired: '#22C55E', Rejected: '#EF4444',
}

const STAT_CARDS = [
  { key: 'totalApplications', label: 'Tổng hồ sơ', icon: Users, color: '#2563EB', bg: '#EFF6FF', desc: 'Đang hoạt động' },
  { key: 'screeningCount', label: 'Đang sàng lọc', icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF', desc: 'Chờ xem xét' },
  { key: 'interviewCount', label: 'Phỏng vấn', icon: Calendar, color: '#D97706', bg: '#FFFBEB', desc: 'Đang phỏng vấn' },
  { key: 'hiredThisMonth', label: 'Đã tuyển tháng này', icon: UserCheck, color: '#16A34A', bg: '#F0FDF4', desc: 'Tháng hiện tại' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentApplications, setRecentApplications] = useState<RecentApp[]>([])
  const [distribution, setDistribution] = useState<DistItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [campaignsProgress, setCampaignsProgress] = useState<CampaignProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        setStats(d.stats)
        setRecentApplications(d.recentApplications ?? [])
        setDistribution(d.statusDistribution ?? [])
        setActivity(d.recentActivity ?? [])
        setCampaignsProgress(d.campaignsProgress ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Dashboard" subtitle="Tổng quan hệ thống tuyển dụng GAP"
        actions={
          <Link href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm">
            <Upload className="w-4 h-4" />Upload CV
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map(card => (
            <div key={card.key} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-fade-in">
              {loading ? <SkeletonCard /> : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl" style={{ background: card.bg }}>
                      <card.icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mb-1">
                    {stats?.[card.key as keyof Stats] ?? 0}
                  </div>
                  <div className="text-sm font-medium text-slate-700">{card.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{card.desc}</div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Pipeline Overview */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Phân bổ Pipeline</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tỉ lệ hồ sơ theo từng vòng</p>
              </div>
              <Link href="/pipeline"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                Xem Pipeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <Skeleton className="h-[220px] w-full mt-4" />
            ) : distribution.every(d => d.count === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl mt-4">
                <p className="text-slate-400 text-sm">Chưa có dữ liệu phân bổ</p>
              </div>
            ) : (
              <div className="h-[220px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[...distribution.filter(d => d.count > 0)].sort((a, b) => {
                        const statusOrder = ['New', 'Screening', 'Interview', 'Hired', 'Rejected'];
                        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
                      })}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="count"
                      startAngle={90}
                      endAngle={-270}
                      nameKey="status"
                      animationDuration={800}
                    >
                      {distribution.filter(d => d.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? '#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [value, 'Hồ sơ']}
                      labelFormatter={(label: any) => STATUS_LABELS[label] ?? label}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      formatter={(value: string) => <span className="text-xs text-slate-600 font-medium ml-1">{STATUS_LABELS[value] ?? value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-blue-500" />
              <h2 className="text-base font-semibold text-slate-800">Hoạt động gần đây</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-slate-400 text-sm text-center mt-8">Chưa có hoạt động nào</p>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 -mr-2 pr-2">
                {activity.map(a => (
                  <div key={a.id} className="flex gap-2.5">
                    <div className="w-1.5 flex-shrink-0 flex flex-col items-center pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[a.toStatus] ?? '#9CA3AF' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">
                        <span className="font-semibold">{a.candidateName}</span>
                        {' → '}
                        <StatusBadge status={a.toStatus} size="xs" />
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.changedBy} · {formatRelativeTime(a.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts & Shortcuts */}
        <div className="grid grid-cols-3 gap-6">
          {/* KPI Chart */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-semibold text-slate-800">Tiến độ Đợt Tuyển dụng (Tuyển / KPI)</h2>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-200"></div> Mục tiêu KPI</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500"></div> Đã tuyển đạt</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Đã tuyển chưa đạt</span>
              </div>
            </div>
            
            {loading ? (
              <Skeleton className="h-[250px] w-full mt-4" />
            ) : campaignsProgress.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center mt-4 border-2 border-dashed border-slate-100 rounded-xl">
                <Target className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Chưa có đợt tuyển dụng nào đang mở</p>
              </div>
            ) : (
              <div className="h-[250px] w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={campaignsProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    />
                    
                    {/* The KPI Target Bar (Background/Grey) */}
                    <Bar dataKey="kpi" name="Mục tiêu KPI" fill="#f1f5f9" radius={[6, 6, 0, 0]} barSize={48} />
                    
                    {/* The Hired Bar (Foreground/Colored) */}
                    <Bar dataKey="hired" name="Đã tuyển" radius={[6, 6, 0, 0]} barSize={48}>
                      {campaignsProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hired >= entry.kpi && entry.kpi > 0 ? 'url(#colorHired)' : 'url(#colorPending)'} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Campaign Shortcuts */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
            <h2 className="text-base font-semibold text-slate-800 mb-5">Lối tắt Đợt tuyển dụng</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : campaignsProgress.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                <Briefcase className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Không có lối tắt</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1 -mr-1">
                {campaignsProgress.map(c => (
                  <Link href={`/pipeline?campaignId=${c.id}`} key={c.id} 
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50 hover:shadow-sm transition-all group">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm text-slate-800 font-semibold truncate group-hover:text-red-700">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Tiến độ: <span className="font-medium text-slate-700">{c.hired} / {c.kpi || '∞'}</span></p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:text-red-600 transition-colors">
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800">Ứng viên mới nhất</h2>
            <Link href="/candidates"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Họ tên', 'Vị trí', 'Kỹ năng', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-8">
                    <div className="space-y-3 px-6">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  </td></tr>
                ) : recentApplications.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    Chưa có ứng viên nào. <Link href="/upload" className="text-blue-600 hover:underline">Upload CV đầu tiên!</Link>
                  </td></tr>
                ) : (
                  recentApplications.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{a.fullName}</td>
                      <td className="px-6 py-3.5 text-sm text-slate-500">{a.appliedPosition}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(a.skills ?? []).slice(0, 3).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3.5"><StatusBadge status={a.currentStatus} /></td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">{formatDate(a.createdAt)}</td>
                      <td className="px-6 py-3.5">
                        <Link href={`/candidates/${a.candidateId}`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          Xem <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
