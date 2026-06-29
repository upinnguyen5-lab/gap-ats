import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  New:        'bg-gray-100 text-gray-700 border-gray-200',
  Screening:  'bg-blue-100 text-blue-700 border-blue-200',
  Interview:  'bg-amber-100 text-amber-700 border-amber-200',
  Hired:      'bg-green-100 text-green-700 border-green-200',
  Rejected:   'bg-red-100 text-red-700 border-red-200',
}

const DOTS: Record<string, string> = {
  New:        'bg-gray-400',
  Screening:  'bg-blue-500',
  Interview:  'bg-amber-500',
  Hired:      'bg-green-500',
  Rejected:   'bg-red-500',
}

const LABELS: Record<string, string> = {
  New: 'Mới', Screening: 'Sàng lọc', Interview: 'Phỏng vấn', Hired: 'Đã tuyển', Rejected: 'Từ chối',
}

interface Props {
  status: string
  size?: 'xs' | 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const sz = size === 'xs' ? 'px-2 py-0.5 text-xs' : size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium border',
      STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
      sz
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOTS[status] ?? 'bg-gray-400')} />
      {LABELS[status] ?? status}
    </span>
  )
}
