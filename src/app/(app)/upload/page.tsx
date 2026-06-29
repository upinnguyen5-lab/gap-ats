'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { POSITIONS } from '@/lib/utils'
import {
  Upload, FileText, X, CheckCircle, AlertCircle, AlertTriangle,
  FolderOpen, ChevronRight,
} from 'lucide-react'

type UploadResult = { fileName: string; status: 'success' | 'failed' | 'duplicate'; message: string; candidateId?: string }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [tab, setTab] = useState<'single' | 'bulk'>((searchParams.get('tab') as 'single' | 'bulk') || 'single')

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (tab !== 'single') params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [tab, pathname, router])

  // Restore from URL on back navigation
  useEffect(() => {
    const urlTab = (searchParams.get('tab') as 'single' | 'bulk') || 'single'
    if (tab !== urlTab) setTab(urlTab)
  }, [searchParams])

  // Single upload state
  const [singleFile, setSingleFile] = useState<File | null>(null)
  const [singleCampaignId, setSingleCampaignId] = useState('')
  const [singlePosition, setSinglePosition] = useState('')
  const [singleDragOver, setSingleDragOver] = useState(false)
  const [singleUploading, setSingleUploading] = useState(false)
  const [singleError, setSingleError] = useState('')
  const singleInputRef = useRef<HTMLInputElement>(null)

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [bulkCampaignId, setBulkCampaignId] = useState('')
  const [bulkPosition, setBulkPosition] = useState('')
  const [bulkDragOver, setBulkDragOver] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResults, setBulkResults] = useState<UploadResult[] | null>(null)
  const [bulkError, setBulkError] = useState('')
  const bulkInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED = /\.(pdf|doc|docx)$/i
  const MAX_SIZE = 5 * 1024 * 1024

  const validateFile = (f: File): string | null => {
    if (!ALLOWED.test(f.name)) return 'Chỉ chấp nhận .pdf, .doc, .docx'
    if (f.size > MAX_SIZE) return 'File vượt quá 5MB'
    return null
  }

  const [campaigns, setCampaigns] = useState<{id: string, name: string}[]>([])
  useEffect(() => {
    fetch('/api/campaigns?isOpen=true')
      .then(res => res.json())
      .then(data => setCampaigns(data.campaigns ?? []))
  }, [])

  // Single handlers
  const handleSingleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setSingleDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const err = validateFile(file)
      if (err) { setSingleError(err); return }
      setSingleFile(file); setSingleError('')
    }
  }, [])

  const handleSingleUpload = async () => {
    if (!singleFile || !singleCampaignId) { setSingleError('Vui lòng điền đủ thông tin'); return }
    setSingleUploading(true); setSingleError('')
    const fd = new FormData()
    fd.append('file', singleFile)
    fd.append('campaignId', singleCampaignId)
    if (singlePosition) fd.append('manualPosition', singlePosition)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setSingleUploading(false)
    if (!res.ok) { setSingleError(data.error ?? 'Upload thất bại'); return }
    import('sonner').then(m => m.toast.success('Đã phân tích xong: ' + (data.application?.appliedPosition || 'CV')))
    setSingleFile(null)
  }

  // Bulk handlers
  const handleBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setBulkDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setBulkFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !existing.has(f.name))]
    })
    setBulkResults(null)
  }, [])

  const handleBulkUpload = async () => {
    const valid = bulkFiles.filter(f => !validateFile(f))
    if (!bulkCampaignId) { setBulkError('Vui lòng điền đủ thông tin'); return }
    if (valid.length === 0) { setBulkError('Không có file hợp lệ để upload'); return }
    setBulkUploading(true); setBulkError(''); setBulkResults(null)
    const fd = new FormData()
    valid.forEach(f => fd.append('files', f))
    fd.append('campaignId', bulkCampaignId)
    if (bulkPosition) fd.append('manualPosition', bulkPosition)
    fd.append('bulk', 'true')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setBulkUploading(false)
    if (!res.ok) { setBulkError(data.error ?? 'Upload thất bại'); return }
    setBulkResults(data.results)
  }

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'duplicate') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return <AlertCircle className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar title="Upload CV" subtitle="Thêm ứng viên mới vào hệ thống" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
          {[['single', 'Upload đơn'], ['bulk', 'Upload hàng loạt']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as 'single' | 'bulk')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* ===== SINGLE UPLOAD ===== */}
          {tab === 'single' && (
            <div className="space-y-5 animate-fade-in">
              {/* Campaign and Position select */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Đợt tuyển dụng <span className="text-red-500">*</span></label>
                  <select value={singleCampaignId} onChange={e => setSingleCampaignId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10">
                    <option value="">-- Chọn đợt tuyển dụng --</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí (Tùy chọn)</label>
                  <select value={singlePosition} onChange={e => setSinglePosition(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10">
                    <option value="">-- Tự động phân tích từ CV --</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-2 italic">Ghi đè kết quả phân tích tự động</p>
                </div>
              </div>

              {/* Drop zone */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">File CV <span className="text-red-500">*</span></label>
                <div
                  className={`drop-zone p-10 text-center cursor-pointer transition-all ${singleDragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setSingleDragOver(true) }}
                  onDragLeave={() => setSingleDragOver(false)}
                  onDrop={handleSingleDrop}
                  onClick={() => singleInputRef.current?.click()}
                >
                  <input ref={singleInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { const err = validateFile(f); if (err) { setSingleError(err); return } setSingleFile(f); setSingleError('') }
                    }}
                  />
                  {singleFile ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-slate-800">{singleFile.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(singleFile.size)}</p>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSingleFile(null) }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-7 h-7 text-blue-400" />
                      </div>
                      <p className="text-slate-700 font-medium mb-1">Kéo thả file CV vào đây</p>
                      <p className="text-slate-400 text-sm mb-3">hoặc click để chọn file</p>
                      <p className="text-xs text-slate-400">Hỗ trợ: PDF, DOC, DOCX · Tối đa 5MB</p>
                    </div>
                  )}
                </div>
                {singleError && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />{singleError}
                  </div>
                )}
              </div>

              <Button
                className="w-full py-3 justify-center"
                loading={singleUploading}
                onClick={handleSingleUpload}
                disabled={!singleFile || !singleCampaignId}
              >
                <Upload className="w-4 h-4" />
                {singleUploading ? 'Đang phân tích CV...' : 'Upload & Phân tích CV'}
              </Button>
            </div>
          )}

          {/* ===== BULK UPLOAD ===== */}
          {tab === 'bulk' && (
            <div className="space-y-5 animate-fade-in">
              {/* Campaign and Position select */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Đợt tuyển dụng <span className="text-red-500">*</span></label>
                  <select value={bulkCampaignId} onChange={e => setBulkCampaignId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10">
                    <option value="">-- Chọn đợt tuyển dụng --</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí (Tùy chọn)</label>
                  <select value={bulkPosition} onChange={e => setBulkPosition(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10">
                    <option value="">-- Tự động phân tích từ CV --</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-2 italic">Áp dụng chung cho tất cả file</p>
                </div>
              </div>

              {/* Multi drop zone */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div
                  className={`drop-zone p-8 text-center cursor-pointer ${bulkDragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setBulkDragOver(true) }}
                  onDragLeave={() => setBulkDragOver(false)}
                  onDrop={handleBulkDrop}
                  onClick={() => bulkInputRef.current?.click()}
                >
                  <input ref={bulkInputRef} type="file" accept=".pdf,.doc,.docx" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? [])
                      setBulkFiles(prev => {
                        const existing = new Set(prev.map(f => f.name))
                        return [...prev, ...files.filter(f => !existing.has(f.name))]
                      })
                      setBulkResults(null)
                    }}
                  />
                  <FolderOpen className="w-10 h-10 text-blue-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-medium mb-1">Kéo thả nhiều file vào đây</p>
                  <p className="text-xs text-slate-400">PDF, DOC, DOCX · Mỗi file tối đa 5MB</p>
                </div>

                {/* File list */}
                {bulkFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-600">{bulkFiles.length} file đã chọn · {bulkFiles.filter(f => !validateFile(f)).length} hợp lệ</p>
                      <button onClick={() => { setBulkFiles([]); setBulkResults(null) }}
                        className="text-xs text-red-500 hover:text-red-700">Xóa tất cả</button>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {bulkFiles.map((f, i) => {
                        const err = validateFile(f)
                        return (
                          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${err ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                            <FileText className={`w-4 h-4 flex-shrink-0 ${err ? 'text-red-400' : 'text-blue-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                              <p className={`text-xs ${err ? 'text-red-500' : 'text-slate-400'}`}>{err ?? formatFileSize(f.size)}</p>
                            </div>
                            <button onClick={() => setBulkFiles(prev => prev.filter((_, j) => j !== i))}
                              className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {bulkError && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{bulkError}</div>}

              <Button className="w-full py-3 justify-center" loading={bulkUploading} onClick={handleBulkUpload}
                disabled={bulkFiles.filter(f => !validateFile(f)).length === 0 || !bulkCampaignId}>
                <Upload className="w-4 h-4" />
                Upload {bulkFiles.filter(f => !validateFile(f)).length > 0 ? `${bulkFiles.filter(f => !validateFile(f)).length} file hợp lệ` : 'hàng loạt'}
              </Button>

              {/* Results */}
              {bulkResults && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Kết quả upload</h3>
                  <div className="flex gap-4 mb-4">
                    {[
                      { label: 'Tổng', val: bulkResults.length, cls: 'text-slate-700 bg-slate-100' },
                      { label: 'Thành công', val: bulkResults.filter(r => r.status === 'success').length, cls: 'text-green-700 bg-green-50' },
                      { label: 'Trùng lặp', val: bulkResults.filter(r => r.status === 'duplicate').length, cls: 'text-amber-700 bg-amber-50' },
                      { label: 'Lỗi', val: bulkResults.filter(r => r.status === 'failed').length, cls: 'text-red-700 bg-red-50' },
                    ].map(s => (
                      <div key={s.label} className={`flex-1 rounded-xl p-3 text-center ${s.cls}`}>
                        <p className="text-lg font-bold">{s.val}</p>
                        <p className="text-xs font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        {statusIcon(r.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{r.fileName}</p>
                          <p className="text-xs text-slate-500">{r.message}</p>
                        </div>
                        {r.candidateId && (
                          <a href={`/candidates/${r.candidateId}`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                            Xem <ChevronRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
