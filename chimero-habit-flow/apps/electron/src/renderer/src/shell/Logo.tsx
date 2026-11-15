/** Three arcs of different weight: one whole made of unlike parts. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19.5 7.2A9 9 0 1 0 19.5 16.8" stroke="rgb(var(--accent))" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16.2 9.4A5.2 5.2 0 1 0 16.2 14.6" stroke="#ffb05c" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.7" fill="#5fd3a2" />
    </svg>
  )
}
