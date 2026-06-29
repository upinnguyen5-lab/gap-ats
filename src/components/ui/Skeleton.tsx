import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-36 h-4" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-28 h-4" />
          <Skeleton className="w-20 h-6 rounded-full" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-7 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <Skeleton className="w-24 h-3 mb-4" />
      <Skeleton className="w-16 h-8 mb-2" />
      <Skeleton className="w-32 h-3" />
    </div>
  )
}
