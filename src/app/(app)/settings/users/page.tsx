'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate, ROLE_LABELS } from '@/lib/utils'
import { Plus, UserCheck, UserX, Key, Copy } from 'lucide-react'

interface User {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

const BADGE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  hr_manager: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  hr: 'bg-blue-100 text-blue-700 border-blue-200',
  hiring: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const AVATAR_COLORS: Record<string, string> = {
  admin: '#7C3AED',
  hr_manager: '#4F46E5',
  hr: '#2563EB',
  hiring: '#10B981',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [addForm, setAddForm] = useState({ fullName: '', email: '', role: 'hr', password: '' })
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setLoading(false))
  }, [])

  const handleAddUser = async () => {
    setAddError('')
    if (!addForm.fullName || !addForm.email) {
      setAddError('Vui lòng điền đầy đủ họ tên và email')
      return
    }
    setAddLoading(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    setAddLoading(false)
    if (!res.ok) { setAddError(data.error ?? 'Tạo tài khoản thất bại'); return }
    setUsers(prev => [data.user, ...prev])
    setTempPassword(data.tempPassword)
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const data = await res.json()
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? data.user : u))
  }

  const handleRoleChange = async (id: string, role: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? data.user : u))
      setEditingUser(null)
    }
  }

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openAddModal = () => {
    setShowAddModal(true)
    setTempPassword('')
    setAddError('')
    setAddForm({ fullName: '', email: '', role: 'hr', password: '' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Phân quyền người dùng"
        subtitle={`${users.length} tài khoản trong hệ thống`}
        actions={
          <Button size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4" />Thêm người dùng
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Role legend */}
        <div className="flex flex-wrap gap-3 mb-5">
          {[
            ['admin', 'Quản trị viên — toàn quyền hệ thống'],
            ['hr_manager', 'HR Manager — có quyền thêm/mở đợt tuyển dụng'],
            ['hr', 'HR Recruiter — upload CV, cập nhật pipeline'],
            ['hiring', 'Hiring Manager — xem ứng viên từ vòng phỏng vấn']
          ].map(([role, desc]) => (
            <div key={role} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs ${BADGE_COLORS[role]}`}>
              <div className="w-2 h-2 rounded-full" style={{ background: AVATAR_COLORS[role] }} />
              <span className="font-semibold capitalize">{ROLE_LABELS[role]}</span>
              <span className="text-slate-500 hidden xl:inline">— {desc}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Người dùng', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><SkeletonTable rows={4} /></td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
                            style={{ background: AVATAR_COLORS[u.role] ?? '#64748B' }}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4">
                        {editingUser === u.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={u.role}
                              onChange={e => setEditRole(e.target.value)}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
                            >
                              <option value="admin">Quản trị viên</option>
                              <option value="hr_manager">HR Manager</option>
                              <option value="hr">HR Recruiter</option>
                              <option value="hiring">Hiring Manager</option>
                            </select>
                            <button
                              onClick={() => handleRoleChange(u.id, editRole || u.role)}
                              className="text-xs text-green-600 hover:text-green-700 font-semibold"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingUser(u.id); setEditRole(u.role) }}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition-all ${BADGE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            {ROLE_LABELS[u.role] ?? u.role}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`p-2 rounded-xl transition-colors ${u.isActive ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'hover:bg-green-50 text-slate-400 hover:text-green-600'}`}
                          title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        open={showAddModal}
        onClose={() => { if (!tempPassword) setShowAddModal(false) }}
        title="Thêm người dùng mới"
        size="md"
      >
        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-800">Tài khoản đã tạo thành công!</p>
              </div>
              <p className="text-xs text-green-700 mb-3">
                Ghi lại mật khẩu tạm thời và thông báo cho người dùng ngay:
              </p>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                <code className="flex-1 text-sm font-mono text-slate-800 select-all">{tempPassword}</code>
                <button
                  onClick={() => copyPassword(tempPassword)}
                  className="text-green-600 hover:text-green-700 flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />{copied ? '✓ Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>
            <Button className="w-full justify-center" onClick={() => { setShowAddModal(false); setTempPassword('') }}>
              Đóng
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                value={addForm.fullName}
                onChange={e => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="name@gapsoftware.asia"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vai trò</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 pr-8"
              >
                <option value="hr">HR Recruiter</option>
                <option value="hr_manager">HR Manager</option>
                <option value="hiring">Hiring Manager</option>
                <option value="admin">Quản trị viên</option>
              </select>
              <p className="text-xs text-slate-400 mt-1.5">
                {addForm.role === 'admin' && '⚠️ Quản trị viên có toàn quyền hệ thống, bao gồm quản lý người dùng.'}
                {addForm.role === 'hr_manager' && 'HR Manager quản lý được các đợt tuyển dụng và ứng viên.'}
                {addForm.role === 'hr' && 'HR Recruiter có thể upload CV, quản lý ứng viên và cập nhật pipeline.'}
                {addForm.role === 'hiring' && 'Hiring Manager chỉ xem được ứng viên từ vòng Phỏng vấn trở đi.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Mật khẩu{' '}
                <span className="text-slate-400 font-normal">(để trống = hệ thống tự tạo)</span>
              </label>
              <input
                type="password"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Ít nhất 8 ký tự..."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            {addError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Hủy</Button>
              <Button loading={addLoading} onClick={handleAddUser}>Tạo tài khoản</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
