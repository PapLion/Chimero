import type { ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

export function Menu({ trigger, items, align = 'end' }: { trigger: ReactNode; items: MenuItem[]; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className="z-[70] min-w-[180px] animate-pop rounded-xl border border-line bg-raised p-1 shadow-pop">
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <DropdownMenu.Separator className="my-1 h-px bg-line" />}
              <DropdownMenu.Item
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'flex h-8 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none data-[disabled]:opacity-40 [&>svg]:h-4 [&>svg]:w-4',
                  item.danger ? 'text-bad data-[highlighted]:bg-bad/15' : 'text-text data-[highlighted]:bg-line/70',
                )}
              >
                {item.icon}
                {item.label}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align={align} sideOffset={6} className={cn('z-[70] animate-pop rounded-xl border border-line bg-raised p-3 shadow-pop outline-none', className)}>
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
