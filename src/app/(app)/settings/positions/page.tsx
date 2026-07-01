'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

interface Position {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  createdBy: { fullName: string }
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [showToggleModal, setShowToggleModal] = useState(false)
  const [targetPosition, setTargetPosition] = useState<Position | null>(null)
  const [toggling, setToggling] = useState(false)

  const fetchPositions = () => {
    setLoading(true)
    fetch('/api/positions')
      .then(r => r.json())
      .then(d => setPositions(d.positions ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPositions() }, [])

  const handleOpenModal = (p?: Position) => {
    if (p) {
      setEditingId(p.id)
      setForm({ name: p.name, description: p.description || '' })
    } else {
      setEditingId(null)
      setForm({ name: '', description: '' })
    }
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên vị trí')
    setIsSubmitting(true)
    
    const url = editingId ? `/api/positions/${editingId}` : '/api/positions'
    const method = editingId ? 'PATCH' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    
    setIsSubmitting(false)
    if (res.ok) {
      toast.success(editingId ? 'Đã cập nhật vị trí' : 'Đã tạo vị trí mới')
      setShowModal(false)
      fetchPositions()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Có lỗi xảy ra')
    }
  }

  const handleToggleClick = (p: Position) => {
    setTargetPosition(p)
    setShowToggleModal(true)
  }

  const confirmToggleStatus = async () => {
    if (!targetPosition) return
    setToggling(true)
    const res = await fetch(`/api/positions/${targetPosition.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !targetPosition.isActive })
    })
    setToggling(false)
    if (res.ok) {
      toast.success(`Đã ${targetPosition.isActive ? 'ngừng hoạt động' : 'kích hoạt'} vị trí`)
      setShowToggleModal(false)
      fetchPositions()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vị trí này?')) return
    const res = await fetch(`/api/positions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Đã xóa thành công')
      fetchPositions()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Quản lý Vị trí công việc"
        subtitle="Thiết lập danh sách chức danh tuyển dụng chuẩn của công ty"
        actions={
          <Button size="sm" onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />Thêm vị trí
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Tên vị trí', 'Mô tả', 'Trạng thái', 'Ngày tạo', 'Người tạo', 'Thao tác'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><SkeletonTable rows={4} /></td></tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">Chưa có vị trí nào được tạo</td>
                </tr>
              ) : (
                positions.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">{p.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {p.isActive ? 'Hoạt động' : 'Ngừng tuyển'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{p.createdBy?.fullName || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleClick(p)} className={`p-1.5 rounded-lg transition-colors ${p.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={p.isActive ? 'Ngừng hoạt động' : 'Kích hoạt lại'}>
                          {p.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleOpenModal(p)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Xóa">
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
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Sửa vị trí' : 'Thêm vị trí tuyển dụng'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên vị trí (Job Title) <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Frontend Developer..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mô tả ngắn</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Thuộc team Product..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button loading={isSubmitting} onClick={handleSubmit}>Lưu thay đổi</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showToggleModal} onClose={() => setShowToggleModal(false)} title="Xác nhận trạng thái" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Bạn có chắc chắn muốn {targetPosition?.isActive ? <strong className="text-amber-600">ngừng hoạt động</strong> : <strong className="text-green-600">kích hoạt lại</strong>} vị trí <strong>{targetPosition?.name}</strong>?
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowToggleModal(false)}>Hủy</Button>
            <Button loading={toggling} variant={targetPosition?.isActive ? "outline" : "primary"} onClick={confirmToggleStatus}>
              Xác nhận {targetPosition?.isActive ? 'Ngừng' : 'Mở'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
