import { useLayoutEffect, useRef, useState } from 'react'

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => {
      const { width, height } = element.getBoundingClientRect()
      setSize((previous) => (Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5 ? previous : { width, height }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

/** Round axis bounds and tick values (1, 2, 2.5, 5 × 10ⁿ steps). */
export function niceScale(min: number, max: number, target = 4): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] }
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / Math.max(1, target)
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * power
  const low = Math.floor(min / step) * step
  const high = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = low; value <= high + step / 2; value += step) ticks.push(Math.round(value * 1e6) / 1e6)
  return { min: low, max: high, ticks }
}

export function movingAverage(points: ReadonlyArray<{ date: string; value: number }>, window: number): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = []
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    sum += points[i].value
    if (i >= window) sum -= points[i - window].value
    out.push({ date: points[i].date, value: sum / Math.min(i + 1, window) })
  }
  return out
}

export function tickLabel(value: number): string {
  if (Math.abs(value) >= 10000) return `${Math.round(value / 100) / 10}k`
  return String(Math.round(value * 100) / 100)
}
