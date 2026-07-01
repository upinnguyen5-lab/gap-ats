'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateTime, STATUS_LIST, POSITIONS } from '@/lib/utils'
import {
  ArrowLeft, Edit2, Save, X, Trash2, Download, AlertTriangle,
  AlertCircle, CheckCircle, Clock, User, Briefcase, Tag, Plus, GitBranch, Copy, Mail, Phone, Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface StatusHistory {
  id: string; fromStatus: string | null; toStatus: string; note: string | null
  changedAt: string; changedBy: { fullName: string; role: string }
}
interface Application {
  id: string; appliedPosition: string; rawAppliedPosition: string | null; currentStatus: string; cvFileName: string | null; cvFilePath: string | null
  parseStatus: string; createdAt: string
  campaign: { id: string; name: string; isOpen: boolean } | null
  statusHistory: StatusHistory[]
}
interface Candidate {
  id: string; fullName: string; email: string; phone: string | null
  yearsExperience: number | null; skills: string[]
  notes: string | null; createdAt: string; updatedAt: string
  createdBy: { fullName: string; email: string }
  applications: Application[]
}

const STATUS_LABELS: Record<string, string> = {
  New: 'Mới', Screening: 'Sàng lọc', Interview: 'Phỏng vấn', Hired: 'Đã tuyển', Rejected: 'Từ chối',
}
const ROLE_LABELS: Record<string, string> = { admin: 'Admin', hr: 'HR', interviewer: 'Phỏng vấn' }

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const [form, setForm] = useState<Partial<Candidate>>({})
  const [newSkill, setNewSkill] = useState('')

  // Application actions
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [toStatus, setToStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [statusError, setStatusError] = useState('')
  const [targetAppId, setTargetAppId] = useState('')
  
  const [showAppDeleteModal, setShowAppDeleteModal] = useState(false)
  const [appDeleting, setAppDeleting] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState('')

  const [showCloneModal, setShowCloneModal] = useState(false)
  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([])
  const [targetCampaignId, setTargetCampaignId] = useState('')
  const [targetPosition, setTargetPosition] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)
  const [cloneError, setCloneError] = useState('')

  const fetchCandidate = () => {
    fetch(`/api/candidates/${id}`)
      .then(r => r.json())
      .then(d => {
        setCandidate(d.candidate)
        setForm(d.candidate)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/campaigns?isOpen=true')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUserRole(d.user?.role ?? ''))
  }, [])

  useEffect(() => {
    fetchCandidate()
  }, [id])

  const handleSave = async () => {
    if (!candidate) return
    setSaving(true)
    const res = await fetch(`/api/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName, email: form.email, phone: form.phone,
        yearsExperience: form.yearsExperience,
        skills: form.skills, notes: form.notes,
      }),
    })
    const data = await res.json()
    setCandidate(data.candidate)
    setForm(data.candidate)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
    router.push('/candidates')
  }

  const handleAppDelete = async () => {
    if (!targetAppId) return
    setAppDeleting(true)
    const res = await fetch(`/api/applications/${targetAppId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Đã xóa đơn ứng tuyển')
      setShowAppDeleteModal(false)
      fetchCandidate()
    } else {
      const d = await res.json()
      toast.error(d.error || 'Lỗi khi xóa')
    }
    setAppDeleting(false)
  }

  const handleStatusUpdate = async () => {
    setStatusError('')
    if (!toStatus) { setStatusError('Vui lòng chọn trạng thái'); return }
    if (toStatus === 'Rejected' && !statusNote.trim()) { setStatusError('Phải có ghi chú khi từ chối'); return }
    setStatusLoading(true)
    const res = await fetch(`/api/applications/${targetAppId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus, note: statusNote }),
    })
    if (res.ok) {
      fetchCandidate()
      setShowStatusModal(false)
      setToStatus('')
      setStatusNote('')
      toast.success(`Đã chuyển sang ${STATUS_LABELS[toStatus]}`)
    } else {
      const d = await res.json()
      setStatusError(d.error)
    }
    setStatusLoading(false)
  }

  const handleQuickStatus = async (appId: string, toStatus: string) => {
    const res = await fetch(`/api/applications/${appId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus, note: 'Cập nhật nhanh' }),
    })
    if (res.ok) {
      toast.success(`Đã chuyển sang ${STATUS_LABELS[toStatus]}`)
      fetchCandidate()
    } else {
      toast.error('Có lỗi xảy ra')
    }
  }

  const handleClone = async () => {
    if (!targetCampaignId) { setCloneError('Vui lòng chọn đợt tuyển dụng đích'); return }
    if (!targetPosition) { setCloneError('Vui lòng chọn vị trí ứng tuyển'); return }
    setCloneLoading(true)
    setCloneError('')
    
    const res = await fetch(`/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: id, campaignId: targetCampaignId, appliedPosition: targetPosition })
    })

    if (res.ok) {
      fetchCandidate()
      setShowCloneModal(false)
      setTargetCampaignId('')
      setTargetPosition('')
      toast.success('Thêm đơn ứng tuyển thành công!')
    } else {
      const d = await res.json()
      setCloneError(d.error)
    }
    setCloneLoading(false)
  }

  if (loading) return (
    <div className="flex flex-col h-full bg-slate-50 p-6 space-y-6">
      <Skeleton className="h-12 w-1/3 rounded-xl" />
      <div className="flex gap-6">
        <Skeleton className="h-96 w-1/3 rounded-2xl" />
        <Skeleton className="h-96 w-2/3 rounded-2xl" />
      </div>
    </div>
  )

  if (!candidate) return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50">
      <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
      <h2 className="text-xl font-semibold text-slate-700">Không tìm thấy ứng viên</h2>
      <Link href="/candidates" className="mt-4 text-blue-600 hover:underline">Quay lại danh sách</Link>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      <TopBar
        title="Chi tiết ứng viên"
        subtitle={candidate.fullName}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/candidates">
              <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" />Quay lại</Button>
            </Link>
            {!editing ? (
              <Button onClick={() => setEditing(true)} size="sm"><Edit2 className="w-4 h-4" />Chỉnh sửa Profile</Button>
            ) : (
              <Button onClick={handleSave} loading={saving} size="sm"><Save className="w-4 h-4" />Lưu thay đổi</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowCloneModal(true)}>
              <Copy className="w-4 h-4" />Thêm đơn ứng tuyển
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}><Trash2 className="w-4 h-4" />Xóa ứng viên</Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Profile */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              <div className="px-6 pb-6 relative">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-blue-600 -mt-10 mb-4">
                  {candidate.fullName.charAt(0)}
                </div>
                
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Họ và tên</label>
                      <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Số điện thoại</label>
                      <input type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Kinh nghiệm (năm)</label>
                      <input type="number" step="0.5" value={form.yearsExperience ?? ''} onChange={e => setForm({ ...form, yearsExperience: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-slate-800">{candidate.fullName}</h1>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" /> {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" /> {candidate.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Briefcase className="w-4 h-4 text-slate-400" /> {candidate.yearsExperience ? `${candidate.yearsExperience} năm kinh nghiệm` : 'Chưa có kinh nghiệm'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400" />Kỹ năng chuyên môn
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(form.skills ?? []).map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-100">
                        {s} <button onClick={() => setForm({ ...form, skills: form.skills?.filter(x => x !== s) })}><X className="w-3 h-3 hover:text-blue-900" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Nhập kỹ năng..."
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSkill.trim()) {
                          if (!form.skills?.includes(newSkill.trim())) setForm({ ...form, skills: [...(form.skills ?? []), newSkill.trim()] });
                          setNewSkill('');
                        }
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
                    <Button type="button" size="sm" onClick={() => {
                      if (newSkill.trim() && !form.skills?.includes(newSkill.trim())) setForm({ ...form, skills: [...(form.skills ?? []), newSkill.trim()] });
                      setNewSkill('');
                    }}>Thêm</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.length > 0 ? candidate.skills.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm border border-slate-200">{s}</span>
                  )) : <p className="text-sm text-slate-500 italic">Chưa có thông tin kỹ năng</p>}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Ghi chú chung</h3>
              {editing ? (
                <textarea rows={4} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú về ứng viên..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
              ) : (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{candidate.notes || <span className="italic text-slate-400">Không có ghi chú</span>}</p>
              )}
            </div>

          </div>

          {/* Right Column: Applications */}
          <div className="w-full lg:w-2/3 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              Lịch sử Ứng tuyển ({candidate.applications.length})
            </h2>

            {candidate.applications.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                Ứng viên này chưa có đơn ứng tuyển nào.
              </div>
            ) : (
              candidate.applications.map(app => (
                <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {app.appliedPosition}
                        {app.rawAppliedPosition && (
                          <span className="relative group">
                            <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              AI trích xuất: "{app.rawAppliedPosition}" → Đã chuẩn hóa
                            </span>
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <Tag className="w-3.5 h-3.5" />
                        {app.campaign ? app.campaign.name : 'Không có đợt tuyển dụng'}
                        {app.campaign && !app.campaign.isOpen && <span className="text-xs text-red-500 font-medium">(Đã đóng)</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={app.currentStatus} />
                      <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
                        {STATUS_LIST.filter(s => s !== app.currentStatus && s !== 'Rejected').map(s => (
                          <button
                            key={s}
                            onClick={() => handleQuickStatus(app.id, s)}
                            disabled={app.campaign && !app.campaign.isOpen ? true : false}
                            className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                        <button 
                          onClick={() => { setTargetAppId(app.id); setShowStatusModal(true) }}
                          disabled={app.campaign && !app.campaign.isOpen ? true : false}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                          Từ chối...
                        </button>
                        {['admin', 'hr', 'hr_manager'].includes(currentUserRole) && (
                          <button 
                            onClick={() => { setTargetAppId(app.id); setShowAppDeleteModal(true) }}
                            className="px-2.5 py-1 text-[11px] font-medium rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3 inline-block -mt-0.5 mr-0.5" /> Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* App details */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Chi tiết hồ sơ</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Trạng thái phân tích CV</p>
                          <div className="flex items-center gap-1.5">
                            {app.parseStatus === 'success' ? (
                              <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-green-700">Thành công</span></>
                            ) : app.parseStatus === 'failed' ? (
                              <><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-amber-700">Cần bổ sung</span></>
                            ) : (
                              <><Clock className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600">Đang chờ</span></>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 mb-1">File CV đính kèm</p>
                          {app.cvFilePath ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{app.cvFileName}</span>
                              <Link href={app.cvFilePath} target="_blank" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Tải xuống">
                                <Download className="w-4 h-4" />
                              </Link>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500 italic">Không có file</span>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 mb-1">Ngày nộp đơn</p>
                          <p className="text-sm text-slate-700">{formatDateTime(app.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status History */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Lịch sử trạng thái</h4>
                      <div className="relative border-l border-slate-200 ml-2 space-y-6">
                        {app.statusHistory.map((h, i) => (
                          <div key={h.id} className="relative pl-6">
                            <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300'}`} />
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center flex-wrap gap-2 text-sm">
                                <span className="font-semibold text-slate-700">{STATUS_LABELS[h.toStatus] || h.toStatus}</span>
                                {h.fromStatus && (
                                  <>
                                    <span className="text-slate-400">từ</span>
                                    <span className="text-slate-600">{STATUS_LABELS[h.fromStatus] || h.fromStatus}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{formatDateTime(h.changedAt)}</span>
                                <span>•</span>
                                <span className="font-medium">{h.changedBy.fullName}</span>
                              </div>
                              {h.note && (
                                <div className="mt-1 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 italic">
                                  "{h.note}"
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* Delete Candidate Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Xác nhận xóa ứng viên" size="sm">
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">Cảnh báo quan trọng!</p>
            <p>Hành động này sẽ xóa ứng viên cùng toàn bộ <strong>{candidate.applications.length} đơn ứng tuyển</strong> của họ.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Hủy</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Vẫn xóa hồ sơ</Button>
        </div>
      </Modal>

      {/* Delete Application Modal */}
      <Modal open={showAppDeleteModal} onClose={() => setShowAppDeleteModal(false)} title="Xác nhận xóa đơn ứng tuyển" size="sm">
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">Cảnh báo quan trọng!</p>
            <p>Đơn ứng tuyển sẽ được đưa vào thùng rác.</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowAppDeleteModal(false)}>Hủy</Button>
          <Button variant="danger" loading={appDeleting} onClick={handleAppDelete}>Xóa đơn ứng tuyển</Button>
        </div>
      </Modal>

      {/* Change Status Modal */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Cập nhật trạng thái" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái mới</label>
            <select value={toStatus} onChange={e => setToStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">
              <option value="">Chọn trạng thái...</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú {toStatus === 'Rejected' && <span className="text-red-500">*</span>}</label>
            <textarea rows={3} value={statusNote} onChange={e => setStatusNote(e.target.value)}
              placeholder="Nhập ghi chú cho lần chuyển trạng thái này..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
          </div>
          {statusError && <p className="text-sm text-red-500">{statusError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Hủy</Button>
            <Button onClick={handleStatusUpdate} loading={statusLoading}>Xác nhận</Button>
          </div>
        </div>
      </Modal>

      {/* Add Application (Clone) Modal */}
      <Modal open={showCloneModal} onClose={() => setShowCloneModal(false)} title="Thêm vào đợt tuyển dụng khác" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Tạo một đơn ứng tuyển mới cho ứng viên <strong>{candidate.fullName}</strong>.</p>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đợt tuyển dụng đích</label>
            <select value={targetCampaignId} onChange={e => setTargetCampaignId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">
              <option value="">Chọn đợt tuyển dụng...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vị trí ứng tuyển mới</label>
            <select value={targetPosition} onChange={e => setTargetPosition(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">
              <option value="">Chọn vị trí...</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {cloneError && <p className="text-sm text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{cloneError}</p>}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCloneModal(false)}>Hủy</Button>
            <Button onClick={handleClone} loading={cloneLoading}>Tạo đơn ứng tuyển</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
