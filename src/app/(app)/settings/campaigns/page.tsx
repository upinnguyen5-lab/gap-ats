'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  isOpen: boolean
  kpiTarget: number
  createdAt: string
  createdBy: { fullName: string }
  _count: { applications: number }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', kpiTarget: 0 })

  const fetchCampaigns = () => {
    setLoading(true)
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleOpenModal = (c?: Campaign) => {
    if (c) {
      setEditingId(c.id)
      setForm({ name: c.name, kpiTarget: c.kpiTarget })
    } else {
      setEditingId(null)
      setForm({ name: '', kpiTarget: 0 })
    }
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên đợt tuyển dụng')
    setIsSubmitting(true)
    
    const url = editingId ? `/api/campaigns/${editingId}` : '/api/campaigns'
    const method = editingId ? 'PATCH' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    
    setIsSubmitting(false)
    if (res.ok) {
      toast.success(editingId ? 'Đã cập nhật' : 'Đã tạo đợt tuyển dụng')
      setShowModal(false)
      fetchCampaigns()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Có lỗi xảy ra')
    }
  }

  const handleToggleStatus = async (c: Campaign) => {
    const res = await fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !c.isOpen })
    })
    if (res.ok) {
      toast.success(`Đã ${c.isOpen ? 'đóng' : 'mở'} đợt tuyển dụng`)
      fetchCampaigns()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đợt tuyển dụng này?')) return
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Đã xóa thành công')
      fetchCampaigns()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Quản lý Đợt Tuyển Dụng"
        subtitle="Tạo và quản lý các chiến dịch tuyển dụng"
        actions={
          <Button size="sm" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />Tạo đợt mới
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Tên đợt tuyển dụng', 'Trạng thái', 'KPI', 'Số ứng viên', 'Ngày tạo', 'Người tạo', 'Thao tác'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><SkeletonTable rows={4} /></td></tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">Chưa có đợt tuyển dụng nào</td>
                </tr>
              ) : (
                campaigns.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.isOpen ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {c.isOpen ? 'Đang mở' : 'Đã đóng'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{c.kpiTarget}</span>
                        {c.kpiTarget > 0 && (
                          <div className="flex-1 max-w-[80px] bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (c._count.applications / c.kpiTarget) * 100)}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {c._count.applications}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{c.createdBy.fullName}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleStatus(c)} className={`p-1.5 rounded-lg transition-colors ${c.isOpen ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={c.isOpen ? 'Đóng đợt' : 'Mở lại đợt'}>
                          {c.isOpen ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleOpenModal(c)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {c._count.applications === 0 && (
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Sửa đợt tuyển dụng' : 'Tạo đợt tuyển dụng'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên đợt tuyển dụng <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm({ name: e.target.value })}
              placeholder="VD: Tuyển dụng Backend Tháng 6..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mục tiêu tuyển dụng (KPI)</label>
            <input
              type="number"
              min="0"
              value={form.kpiTarget || ''}
              onChange={e => setForm({ ...form, kpiTarget: parseInt(e.target.value) || 0 })}
              placeholder="VD: 10"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button loading={isSubmitting} onClick={handleSubmit}>Lưu thay đổi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
