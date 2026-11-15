import { useEffect, useState, type ReactNode } from 'react'
import { Bell, CalendarDays, FlaskConical, Image, LayoutGrid, PanelLeftClose, PanelLeftOpen, Settings, SlidersHorizontal, Tags, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { TrackerIcon } from '@/lib/icons'
import { useAction, usePreferences, useTrackers } from '@/lib/queries'
import { useApp, type Route } from '@/lib/store'
import { colorOf } from '@/lib/trackers'
import { IconButton, Tip } from '@/ui/primitives'

function NavItem({ icon, label, active, onClick, collapsed, trailing }: { icon: ReactNode; label: string; active: boolean; onClick: () => void; collapsed: boolean; trailing?: ReactNode }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-8 w-full items-center gap-2.5 rounded-control px-2 text-base transition-colors',
        collapsed && 'justify-center px-0',
        active ? 'bg-raised font-medium text-text' : 'text-muted hover:bg-raised/60 hover:text-text',
      )}
    >
      {active && <span className="absolute -left-2 top-1.5 h-5 w-[3px] rounded-r bg-accent" />}
      <span className="grid h-5 w-5 shrink-0 place-items-center [&>svg]:h-[17px] [&>svg]:w-[17px]">{icon}</span>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {!collapsed && trailing}
    </button>
  )
  return collapsed ? (
    <Tip label={label} side="right">
      {button}
    </Tip>
  ) : (
    button
  )
}

export function Sidebar() {
  const { route, navigate } = useApp()
  const prefs = usePreferences()
  const { data: trackers = [] } = useTrackers()
  const run = useAction()
  const [narrow, setNarrow] = useState(window.innerWidth < 1180)

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1180)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const collapsed = prefs.sidebarCollapsed || narrow
  const is = (page: Route['page']) => route.page === page

  return (
    <nav aria-label="Main" className={cn('flex shrink-0 flex-col border-r border-line/70 bg-bg py-3 transition-[width] duration-150', collapsed ? 'w-[52px] px-2' : 'w-[212px] px-2')}>
      <div className="flex flex-col gap-0.5">
        <NavItem collapsed={collapsed} icon={<LayoutGrid />} label="Today" active={is('today')} onClick={() => navigate({ page: 'today' })} />
        <NavItem collapsed={collapsed} icon={<CalendarDays />} label="Journal" active={is('journal')} onClick={() => navigate({ page: 'journal' })} />
        <NavItem collapsed={collapsed} icon={<FlaskConical />} label="Insights" active={is('insights')} onClick={() => navigate({ page: 'insights' })} />
      </div>

      <div className={cn('mb-1 mt-5 flex items-center', collapsed ? 'justify-center' : 'justify-between pl-2')}>
        {!collapsed && <span className="text-xs font-medium text-faint">Trackers</span>}
        <IconButton label="Manage trackers" size="sm" active={is('trackers')} onClick={() => navigate({ page: 'trackers' })}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </IconButton>
      </div>
      <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {trackers.map((tracker) => (
          <NavItem
            key={tracker.id}
            collapsed={collapsed}
            icon={<TrackerIcon name={tracker.icon} color={colorOf(tracker)} />}
            label={tracker.name}
            active={route.page === 'tracker' && route.id === tracker.id}
            onClick={() => navigate({ page: 'tracker', id: tracker.id })}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-0.5 border-t border-line/70 pt-3">
        <NavItem collapsed={collapsed} icon={<Users />} label="People" active={is('people')} onClick={() => navigate({ page: 'people' })} />
        <NavItem collapsed={collapsed} icon={<Tags />} label="Tags" active={is('tags')} onClick={() => navigate({ page: 'tags' })} />
        <NavItem collapsed={collapsed} icon={<Bell />} label="Reminders" active={is('reminders')} onClick={() => navigate({ page: 'reminders' })} />
        <NavItem collapsed={collapsed} icon={<Image />} label="Files" active={is('files')} onClick={() => navigate({ page: 'files' })} />
        <NavItem collapsed={collapsed} icon={<Settings />} label="Settings" active={is('settings')} onClick={() => navigate({ page: 'settings' })} />
        {!narrow && (
          <NavItem
            collapsed={collapsed}
            icon={prefs.sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            label={prefs.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            active={false}
            onClick={() => void run(() => api.updatePreferences({ sidebarCollapsed: !prefs.sidebarCollapsed }))}
          />
        )}
      </div>
    </nav>
  )
}
