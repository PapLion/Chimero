import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  busy?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold hover:brightness-110 active:brightness-95',
  secondary: 'border border-line bg-raised/60 text-text hover:bg-raised hover:border-faint/60',
  ghost: 'text-muted hover:bg-raised hover:text-text',
  danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-sm gap-1.5',
  md: 'h-9 px-3.5 text-base gap-2',
  lg: 'h-10 px-5 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', busy, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-control font-medium transition-[background,filter,border-color,color] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, size = 'md', tone = 'default', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <Tip label={label}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          'inline-grid shrink-0 place-items-center rounded-control text-muted transition-colors disabled:pointer-events-none disabled:opacity-40',
          size === 'md' ? 'h-8 w-8' : 'h-6 w-6 rounded-md',
          tone === 'danger' ? 'hover:bg-bad/15 hover:text-bad' : 'hover:bg-raised hover:text-text',
          active && 'bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </Tip>
  )
})

export function Tip({ label, children, side = 'bottom' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[120] max-w-[260px] animate-fade rounded-md border border-line bg-raised px-2 py-1 text-xs text-text shadow-pop"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs text-bad">{error}</p> : hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn('field', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('field resize-none', className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn('field', className)} {...rest}>
      {children}
    </select>
  )
})

/** Mutually exclusive choice shown as a row of buttons. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>
  size?: 'sm' | 'md'
  className?: string
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-control border border-line bg-bg/60 p-0.5', className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[7px] px-2.5 font-medium transition-colors',
            size === 'md' ? 'h-8 text-sm' : 'h-6 text-xs',
            option.value === value ? 'bg-raised text-text shadow-[0_0_0_1px_rgb(var(--line))]' : 'text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40', checked ? 'bg-accent' : 'bg-line')}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export function Chip({ children, color, onRemove, onClick, active, className }: { children: ReactNode; color?: string | null; onRemove?: () => void; onClick?: () => void; active?: boolean; className?: string }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors',
        active ? 'border-accent/60 bg-accent/15 text-text' : 'border-line bg-raised/50 text-muted',
        onClick && !active && 'hover:border-faint/60 hover:text-text',
        className,
      )}
    >
      {color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="truncate">{children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          onKeyDown={(event) => event.key === 'Enter' && onRemove()}
          className="-mr-1 grid h-4 w-4 place-items-center rounded-full text-faint hover:bg-line hover:text-text"
        >
          ×
        </span>
      )}
    </Tag>
  )
}

export function Empty({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col items-center justify-center gap-2 px-6 py-8 text-center', className)}>
      {icon && <div className="mb-1 text-faint [&>svg]:h-7 [&>svg]:w-7">{icon}</div>}
      <p className="text-base font-medium text-text">{title}</p>
      {children && <p className="max-w-[46ch] text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-faint', className)} aria-label="Loading" />
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-bg px-1.5 py-px font-sans text-2xs font-medium text-muted">{children}</kbd>
}

/** Small labelled figure used in stat rows. */
export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className={cn('num mt-0.5 truncate text-2xl font-semibold', tone === 'good' && 'text-good', tone === 'bad' && 'text-bad')}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-faint">{sub}</p>}
    </div>
  )
}
