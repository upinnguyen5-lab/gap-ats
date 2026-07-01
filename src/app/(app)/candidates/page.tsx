'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate, POSITIONS, STATUS_LIST } from '@/lib/utils'
import { Search, Upload, Eye, Trash2, X, Filter, ChevronLeft, ChevronRight, CheckCircle, ChevronDown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Candidate {
  id: string; fullName: string; email: string; phone: string | null
  skills: string[]; yearsExperience: number | null;
  createdAt: string; createdBy: { fullName: string }
  applications: {
    id: string; appliedPosition: string; currentStatus: string;
    campaign: { name: string; isOpen: boolean } | null
  }[]
}

export default function CandidatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [position, setPosition] = useState(searchParams.get('position') || '')
  const [campaignId, setCampaignId] = useState(searchParams.get('campaignId') || '')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteName, setDeleteName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([])

  // Update local state when URL changes (e.g., user hits Back button)
  useEffect(() => {
    const currentQ = searchParams.get('q') || ''
    const currentStatus = searchParams.get('status') || ''
    const currentPosition = searchParams.get('position') || ''
    const currentCampaignId = searchParams.get('campaignId') || ''
    const currentPage = parseInt(searchParams.get('page') || '1')

    if (q !== currentQ) setQ(currentQ)
    if (status !== currentStatus) setStatus(currentStatus)
    if (position !== currentPosition) setPosition(currentPosition)
    if (campaignId !== currentCampaignId) setCampaignId(currentCampaignId)
    if (page !== currentPage) setPage(currentPage)
  }, [searchParams])

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (position) params.set('position', position)
    if (campaignId) params.set('campaignId', campaignId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [page, q, status, position, campaignId, pathname, router])

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
  }, [])

  const fetchCandidates = useCallback(async (pageNum = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
    if (q.length >= 2) params.set('q', q)
    if (status) params.set('status', status)
    if (position) params.set('position', position)
    if (campaignId) params.set('campaignId', campaignId)
    const res = await fetch(`/api/candidates?${params}`)
    const data = await res.json()
    setCandidates(data.candidates ?? [])
    setTotal(data.total ?? 0)
    setTotalPages(data.totalPages ?? 1)
    setLoading(false)
    setSelectedIds([])
  }, [q, status, position, campaignId])

  useEffect(() => { 
    if (page !== 1) setPage(1)
    else fetchCandidates(1)
  }, [q, status, position, campaignId])
  
  useEffect(() => { fetchCandidates(page) }, [page])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    await fetch(`/api/candidates/${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    fetchCandidates(page)
    setDeleteLoading(false)
  }

  const handleSelectAll = () => {
    if (selectedIds.length === candidates.length && candidates.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidates.map(c => c.id))
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} ứng viên đã chọn?`)) return
    
    setBulkDeleteLoading(true)
    try {
      const res = await fetch('/api/candidates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })
      if (res.ok) {
        toast.success(`Đã xóa ${selectedIds.length} ứng viên`)
        setSelectedIds([])
        fetchCandidates(page)
      } else {
        toast.error('Lỗi khi xóa hàng loạt')
      }
    } catch {
      toast.error('Lỗi khi xóa hàng loạt')
    }
    setBulkDeleteLoading(false)
  }

  const handleQuickStatus = async (id: string, newStatus: string) => {
    // Redirect to candidate details page for any status change to avoid confusion with multiple apps
    router.push(`/candidates/${id}`)
  }

  const activeFilters = [
    campaignId && { key: 'campaign', label: `Đợt: ${campaigns.find(c => c.id === campaignId)?.name || ''}`, clear: () => setCampaignId('') },
    status && { key: 'status', label: `Trạng thái: ${status}`, clear: () => setStatus('') },
    position && { key: 'position', label: `Vị trí: ${position}`, clear: () => setPosition('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Ứng viên"
        subtitle={`${total} ứng viên`}
        actions={
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete} disabled={bulkDeleteLoading}
                className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa {selectedIds.length} mục
              </button>
            )}
            <Link href="/upload">
              <Button size="sm"><Upload className="w-4 h-4" />Upload CV</Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Tìm theo tên, email, kỹ năng, vị trí..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
            </div>

            {/* Status filter */}
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 pr-8">
              <option value="">Tất cả trạng thái</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s === 'New' ? 'Mới' : s === 'Screening' ? 'Sàng lọc' : s === 'Interview' ? 'Phỏng vấn' : s === 'Hired' ? 'Đã tuyển' : 'Từ chối'}</option>)}
            </select>

            {/* Position filter */}
            <select value={position} onChange={e => setPosition(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 pr-8">
              <option value="">Tất cả vị trí</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Campaign filter */}
            <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 pr-8">
              <option value="">Tất cả đợt tuyển dụng</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {activeFilters.length > 0 && (
              <button onClick={() => { setStatus(''); setPosition(''); setQ(''); setCampaignId('') }}
                className="px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-all flex items-center gap-1">
                <X className="w-3 h-3" />Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeFilters.map(f => (
                <span key={f.key} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                  <Filter className="w-3 h-3" />{f.label}
                  <button onClick={f.clear} className="text-blue-500 hover:text-blue-700"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th className="px-5 py-3 w-10 text-left border-b border-slate-100">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      checked={candidates.length > 0 && selectedIds.length === candidates.length} 
                      onChange={handleSelectAll} />
                  </th>
                  {['#', 'Họ tên', 'Liên hệ', 'Kinh nghiệm & Kỹ năng', 'Các đơn ứng tuyển', 'Ngày tạo', 'Thao tác'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9}><SkeletonTable rows={6} /></td></tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Không tìm thấy ứng viên phù hợp</p>
                        <p className="text-slate-400 text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map((c, i) => (
                    <tr key={c.id} className={`border-b border-slate-50 transition-colors ${selectedIds.includes(c.id) ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-3.5">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedIds.includes(c.id)} onChange={() => handleSelect(c.id)} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{(page - 1) * 20 + i + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800 text-sm">{c.fullName}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-xs text-slate-600">{c.email}</div>
                        {c.phone && <div className="text-xs text-slate-400 mt-0.5">{c.phone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.yearsExperience != null && (
                          <div className="text-xs text-blue-600 font-medium mb-1">{c.yearsExperience} năm KN</div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {(c.skills ?? []).slice(0, 3).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs">{s}</span>
                          ))}
                          {(c.skills ?? []).length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-xs">+{c.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-2 min-w-64 max-w-sm">
                          {c.applications?.length === 0 ? (
                            <span className="text-xs text-slate-400">Không có đơn ứng tuyển</span>
                          ) : (
                            c.applications?.map(app => (
                              <div key={app.id} className="flex items-center justify-between gap-2 border border-slate-100 p-2 rounded-lg bg-slate-50 hover:border-blue-100 transition-colors">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-slate-700 truncate">{app.appliedPosition}</span>
                                    {app.rawAppliedPosition && (
                                      <div className="group/tt relative flex items-center">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tt:block z-10 w-48 text-center bg-slate-800 text-white text-[10px] rounded-lg py-1 px-2 shadow-xl whitespace-normal break-words">
                                          AI chuẩn hóa từ: <strong className="text-amber-300">{app.rawAppliedPosition}</strong>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 truncate">{app.campaign?.name || 'Không rõ'}</span>
                                </div>
                                <StatusBadge status={app.currentStatus} />
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Link href={`/candidates/${c.id}`}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Xem">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => { setDeleteId(c.id); setDeleteName(c.fullName) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">Tổng: <span className="font-semibold text-slate-700">{total}</span> ứng viên</p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-sm text-slate-600 px-2">Trang {page}/{totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Xác nhận xóa hồ sơ" size="sm">
        <p className="text-sm text-slate-600 mb-6">
          Bạn có chắc muốn xóa hồ sơ ứng viên <span className="font-semibold text-slate-800">{deleteName}</span>?
          Hành động này có thể hoàn tác bởi Admin.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Xác nhận xóa</Button>
        </div>
      </Modal>
    </div>
  )
}
