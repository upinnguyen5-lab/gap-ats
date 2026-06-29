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
  hr: 'HR Recruiter',
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
