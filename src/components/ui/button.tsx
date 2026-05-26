import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 border border-red-600',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 md:py-2 text-sm',
  lg: 'px-5 py-3 text-base',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
