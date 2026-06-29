import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  danger:    'bg-red-700 hover:bg-red-800 text-white shadow-sm',
  ghost:     'hover:bg-slate-100 text-slate-600',
  outline:   'border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant], sizes[size], className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
}
