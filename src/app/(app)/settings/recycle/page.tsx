'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'

interface DeletedCandidate {
  id: string
  fullName: string
  email: string
  appliedPosition: string
  currentStatus: string
  deletedAt: string | null
  deletedBy: string | null
}

export default function RecycleBinPage() {
  const [candidates, setCandidates] = useState<DeletedCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchDeleted = () => {
    setLoading(true)
    fetch('/api/candidates/recycle')
      .then(r => r.json())
      .then(d => setCandidates(d.candidates ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDeleted() }, [])

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    const res = await fetch('/api/candidates/recycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: id }),
    })
    if (res.ok) setCandidates(prev => prev.filter(c => c.id !== id))
    setRestoringId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Thùng rác"
        subtitle="Quản lý hồ sơ ứng viên đã xóa"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Hồ sơ đã xóa</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Tất cả các thành viên (trừ Hiring) đều có thể xem và khôi phục hồ sơ từ thùng rác.
              Hồ sơ sẽ được khôi phục về trạng thái hiện tại trước khi xóa.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {loading ? '...' : `${candidates.length} hồ sơ trong thùng rác`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Họ tên', 'Email', 'Vị trí ứng tuyển', 'Trạng thái cuối', 'Thời gian xóa', 'Thao tác'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><SkeletonTable rows={4} /></td></tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Trash2 className="w-7 h-7 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Thùng rác trống</p>
                        <p className="text-slate-400 text-sm">Không có hồ sơ nào bị xóa</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{c.fullName}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.appliedPosition}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.currentStatus} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600">{c.deletedAt ? formatDate(c.deletedAt) : '—'}</p>
                        {c.deletedAt && (
                          <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(c.deletedAt)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="xs"
                          loading={restoringId === c.id}
                          onClick={() => handleRestore(c.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Khôi phục
                        </Button>
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
