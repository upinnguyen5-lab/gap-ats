'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatRelativeTime, STATUS_LABELS, STATUS_LIST, POSITIONS } from '@/lib/utils'
import { Search, GripVertical, ChevronRight, AlertTriangle, AlertCircle } from 'lucide-react'

interface Application {
  id: string; currentStatus: string; appliedPosition: string; rawAppliedPosition: string | null; createdAt: string; candidateId: string;
  candidate: { fullName: string; email: string; skills: string[] }
}

const COL_COLORS: Record<string, { header: string; dot: string; count: string }> = {
  New:       { header: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', count: 'bg-gray-100 text-gray-600' },
  Screening: { header: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', count: 'bg-blue-100 text-blue-600' },
  Interview: { header: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', count: 'bg-amber-100 text-amber-700' },
  Hired:     { header: 'bg-green-50 border-green-200', dot: 'bg-green-500', count: 'bg-green-100 text-green-700' },
  Rejected:  { header: 'bg-red-50 border-red-200', dot: 'bg-red-500', count: 'bg-red-100 text-red-700' },
}

export default function PipelinePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState({ id: '', from: '', to: '' })
  const [statusNote, setStatusNote] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<{id: string, name: string, isOpen: boolean}[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState(searchParams.get('campaignId') || '')

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCampaignId) params.set('campaignId', selectedCampaignId)
    if (q) params.set('q', q)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [selectedCampaignId, q, pathname, router])

  // Restore state from URL on back navigation
  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    const urlCampaign = searchParams.get('campaignId') || ''
    if (q !== urlQ) setQ(urlQ)
    if (urlCampaign && selectedCampaignId !== urlCampaign) setSelectedCampaignId(urlCampaign)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => {
        setCampaigns(d.campaigns ?? [])
        // Only auto-select first campaign if no campaign was restored from URL
        if (!selectedCampaignId && d.campaigns?.length > 0) setSelectedCampaignId(d.campaigns[0].id)
      })
  }, [])

  const fetchAll = useCallback(async () => {
    if (!selectedCampaignId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await fetch(`/api/applications?campaignId=${selectedCampaignId}`)
    const data = await res.json()
    setApplications(data.applications ?? [])
    setLoading(false)
  }, [selectedCampaignId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const selectedCampaign = useMemo(() => campaigns.find(c => c.id === selectedCampaignId), [campaigns, selectedCampaignId])
  const isClosed = selectedCampaign ? !selectedCampaign.isOpen : false

  const filtered = q.length >= 2
    ? applications.filter(a => a.candidate.fullName.toLowerCase().includes(q.toLowerCase()) || a.appliedPosition.toLowerCase().includes(q.toLowerCase()))
    : applications

  const byStatus = (status: string) => filtered.filter(a => a.currentStatus === status)

  const handleDrop = (toStatus: string) => {
    if (isClosed) return
    if (!draggedId || !dragTarget) return
    const app = applications.find(x => x.id === draggedId)
    if (!app || app.currentStatus === toStatus) { setDraggedId(null); setDragTarget(null); return }
    setPendingStatus({ id: draggedId, from: app.currentStatus, to: toStatus })
    setStatusNote('')
    setStatusError('')
    setShowModal(true)
    setDraggedId(null)
    setDragTarget(null)
  }

  const confirmStatusUpdate = async () => {
    setStatusError('')
    if (pendingStatus.to === 'Rejected' && !statusNote.trim()) {
      setStatusError('Phải có ghi chú khi từ chối ứng viên'); return
    }
    setStatusLoading(true)
    const res = await fetch(`/api/applications/${pendingStatus.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus: pendingStatus.to, note: statusNote }),
    })
    if (res.ok) {
      setApplications(prev => prev.map(a => a.id === pendingStatus.id ? { ...a, currentStatus: pendingStatus.to } : a))
      setShowModal(false)
      import('sonner').then(m => m.toast.success(`Đã cập nhật trạng thái`))
    } else {
      const d = await res.json()
      setStatusError(d.error)
    }
    setStatusLoading(false)
  }

  const handleQuickStatus = async (appId: string, toStatus: string) => {
    if (isClosed) return
    const res = await fetch(`/api/applications/${appId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus, note: 'Cập nhật nhanh' }),
    })
    if (res.ok) {
      import('sonner').then(m => m.toast.success(`Đã chuyển trạng thái sang ${STATUS_LABELS[toStatus]}`))
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, currentStatus: toStatus } : a))
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Pipeline Tuyển dụng" subtitle="Quản lý ứng viên theo từng giai đoạn"
        actions={
          <div className="flex items-center gap-3">
            <select
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48 shadow-sm"
            >
              {campaigns.length === 0 ? <option value="">Đang tải...</option> : null}
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isOpen ? '' : '(Đã đóng)'}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm ứng viên..."
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 shadow-sm" />
            </div>
          </div>
        }
      />

      {isClosed && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
          <p className="text-sm font-semibold text-amber-700 flex items-center gap-2">
            Đợt tuyển dụng này đã đóng. Không thể thay đổi trạng thái của ứng viên.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${STATUS_LIST.length * 280}px` }}>
          {STATUS_LIST.map(status => {
            const cols = COL_COLORS[status]
            const colCandidates = byStatus(status)
            const isTarget = dragTarget === status

            return (
              <div key={status} className="flex flex-col flex-shrink-0 w-72"
                onDragOver={e => { e.preventDefault(); setDragTarget(status) }}
                onDragLeave={() => setDragTarget(null)}
                onDrop={() => handleDrop(status)}
              >
                {/* Column header */}
                <div className={`rounded-t-2xl border px-4 py-3 mb-2 ${cols.header} ${isTarget ? 'ring-2 ring-blue-400' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cols.dot}`} />
                      <span className="font-semibold text-slate-700 text-sm">{STATUS_LABELS[status]}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cols.count}`}>
                      {colCandidates.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className={`flex-1 overflow-y-auto space-y-2.5 p-1 rounded-b-2xl transition-all ${isTarget ? 'bg-blue-50/50' : ''}`}
                  style={{ minHeight: '200px' }}>
                  {loading ? (
                    [1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
                  ) : colCandidates.length === 0 ? (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400">Không có ứng viên</p>
                    </div>
                  ) : (
                    colCandidates.map(a => (
                      <div
                        key={a.id}
                        draggable={!isClosed}
                        onDragStart={() => !isClosed && setDraggedId(a.id)}
                        onDragEnd={() => { if (!isClosed) { setDraggedId(null); setDragTarget(null) } }}
                        className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all group ${isClosed ? '' : 'cursor-grab hover:shadow-md'} ${draggedId === a.id ? 'opacity-50 scale-95' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{a.candidate.fullName}</p>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              {a.appliedPosition}
                              {a.rawAppliedPosition && (
                                <span className="relative group/tooltip">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                    AI: "{a.rawAppliedPosition}"
                                  </span>
                                </span>
                              )}
                              {!POSITIONS.includes(a.appliedPosition) && (
                                <span className="relative group/tooltip">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-500 cursor-help" />
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                    Cần xem lại (Vị trí không có sẵn)
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          {!isClosed && <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5 group-hover:text-slate-400 transition-colors" />}
                        </div>
                        {(a.candidate.skills ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(a.candidate.skills ?? []).slice(0, 3).map((s: string) => (
                              <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{s}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <StatusBadge status={a.currentStatus} size="xs" />
                          <Link href={`/candidates/${a.candidateId}`}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-opacity">
                            Xem <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                        {/* Quick 1-click actions (hidden until hover) */}
                        {!isClosed && (
                          <div className="mt-3 pt-3 border-t border-slate-100 hidden group-hover:flex gap-1 flex-wrap">
                            {STATUS_LIST.filter(s => s !== a.currentStatus && s !== 'Rejected').map(s => (
                              <button key={s} onClick={() => handleQuickStatus(a.id, s)}
                                className="px-2 py-0.5 text-[10px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                            <button onClick={() => { setDraggedId(a.id); setDragTarget('Rejected'); handleDrop('Rejected') }}
                              className="px-2 py-0.5 text-[10px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cập nhật trạng thái pipeline">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <StatusBadge status={pendingStatus.from} />
            <span className="text-slate-400 text-sm">→</span>
            <StatusBadge status={pendingStatus.to} />
          </div>
          <p className="text-sm text-slate-600">
            Chuyển trạng thái ứng viên sang <strong>{STATUS_LABELS[pendingStatus.to]}</strong>?
          </p>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Ghi chú {pendingStatus.to === 'Rejected' && <span className="text-red-500">*</span>}
            </label>
            <textarea rows={3} value={statusNote} onChange={e => setStatusNote(e.target.value)}
              placeholder={pendingStatus.to === 'Rejected' ? 'Bắt buộc khi từ chối...' : 'Ghi chú (tùy chọn)...'}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {statusError && <p className="text-xs text-red-600">{statusError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button loading={statusLoading} onClick={confirmStatusUpdate}>Cập nhật</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
