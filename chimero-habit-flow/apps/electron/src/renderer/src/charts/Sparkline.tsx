import { useSize } from './scale'

/** Axis-free trend line for compact widgets. */
export function Sparkline({ values, color, className, fill = true }: { values: number[]; color: string; className?: string; fill?: boolean }) {
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 4) + 2)
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6)
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <div ref={ref} className={className}>
      {width > 0 && height > 0 && values.length > 0 && (
        <svg width={width} height={height} className="block" aria-hidden>
          {fill && values.length > 1 && <path d={`${path} L ${x(values.length - 1)} ${height} L ${x(0)} ${height} Z`} fill={color} opacity={0.1} />}
          {values.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />}
          <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill={color} />
        </svg>
      )}
    </div>
  )
}
