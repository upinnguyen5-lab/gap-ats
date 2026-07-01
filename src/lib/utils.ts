import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 30) return `${days} ngày trước`
  return formatDate(date)
}

export const STATUS_LABELS: Record<string, string> = {
  New: 'Mới',
  Screening: 'Sàng lọc',
  Interview: 'Phỏng vấn',
  Hired: 'Đã tuyển',
  Rejected: 'Từ chối',
}

export const STATUS_LIST = ['New', 'Screening', 'Interview', 'Hired', 'Rejected']

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  hr_manager: 'HR Manager',
  hr: 'HR Recruiter',
  hiring: 'Hiring Manager',
}

export const POSITIONS = [
  'Software Engineer',
  'Marketing Executive',
  'Business Analyst',
  'Project Manager',
  'UX Designer',
  'Data Analyst',
  'Sales Executive',
  'HR Executive',
  'Finance Executive',
  'Operations Manager',
]

/**
 * Chuẩn hóa tên vị trí ứng tuyển từ AI về danh sách POSITIONS chuẩn.
 * Sử dụng so khớp mờ (fuzzy match) dựa trên từ khóa chồng lấp.
 * Nếu không tìm được vị trí phù hợp (score quá thấp), giữ nguyên tên gốc.
 */
export function normalizePosition(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Chưa xác định'

  const input = raw.trim()

  // Nếu input đã chính xác nằm trong danh sách → trả luôn
  const exactMatch = POSITIONS.find(p => p.toLowerCase() === input.toLowerCase())
  if (exactMatch) return exactMatch

  // Xây dựng bảng alias mở rộng để tăng khả năng khớp
  const ALIASES: Record<string, string[]> = {
    'Software Engineer': ['software', 'engineer', 'developer', 'dev', 'frontend', 'backend', 'fullstack', 'full-stack', 'web', 'mobile', 'ios', 'android', 'java', 'python', 'react', 'angular', 'vue', 'node', 'nodejs', '.net', 'dotnet', 'fe', 'be', 'swe', 'programmer', 'lập trình', 'kỹ sư phần mềm', 'phát triển'],
    'Marketing Executive': ['marketing', 'digital', 'seo', 'sem', 'content', 'brand', 'truyền thông', 'tiếp thị', 'quảng cáo'],
    'Business Analyst': ['business', 'analyst', 'ba', 'phân tích', 'nghiệp vụ', 'requirement'],
    'Project Manager': ['project', 'manager', 'pm', 'scrum', 'agile', 'quản lý dự án', 'lead', 'team lead'],
    'UX Designer': ['ux', 'ui', 'design', 'designer', 'figma', 'thiết kế', 'graphic', 'creative'],
    'Data Analyst': ['data', 'analyst', 'bi', 'sql', 'tableau', 'power bi', 'dữ liệu', 'phân tích dữ liệu', 'data science', 'machine learning', 'ml', 'ai'],
    'Sales Executive': ['sales', 'bán hàng', 'kinh doanh', 'account', 'client', 'khách hàng', 'revenue'],
    'HR Executive': ['hr', 'human', 'resource', 'nhân sự', 'tuyển dụng', 'recruitment', 'people'],
    'Finance Executive': ['finance', 'tài chính', 'kế toán', 'accounting', 'audit', 'tax', 'thuế'],
    'Operations Manager': ['operations', 'vận hành', 'logistics', 'supply', 'chain', 'warehouse', 'kho'],
  }

  const inputWords = input.toLowerCase().split(/[\s,\-\/\(\)]+/).filter(w => w.length > 1)

  let bestMatch = ''
  let bestScore = 0

  for (const [position, keywords] of Object.entries(ALIASES)) {
    let score = 0
    for (const word of inputWords) {
      if (keywords.some(kw => kw === word || kw.includes(word) || word.includes(kw))) {
        score++
      }
    }
    // Tính tỷ lệ khớp dựa trên số từ đầu vào
    const normalizedScore = inputWords.length > 0 ? score / inputWords.length : 0
    if (score > bestScore || (score === bestScore && normalizedScore > (bestMatch ? bestScore / inputWords.length : 0))) {
      bestScore = score
      bestMatch = position
    }
  }

  // Yêu cầu ít nhất 1 từ khớp để chấp nhận kết quả
  if (bestScore >= 1) return bestMatch

  // Không khớp gì → giữ nguyên tên gốc từ AI
  return input
}

