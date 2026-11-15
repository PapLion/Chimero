/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        raised: token('raised'),
        line: token('line'),
        text: token('text'),
        muted: token('muted'),
        faint: token('faint'),
        accent: token('accent'),
        'accent-ink': token('accent-ink'),
        good: token('good'),
        bad: token('bad'),
        warn: token('warn'),
      },
      fontFamily: {
        sans: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.6rem' }],
        '2xl': ['1.625rem', { lineHeight: '1.9rem' }],
        '3xl': ['2.125rem', { lineHeight: '2.3rem' }],
        '4xl': ['2.75rem', { lineHeight: '2.9rem' }],
      },
      borderRadius: { widget: '14px', control: '9px' },
      boxShadow: {
        pop: '0 12px 40px -8px rgb(var(--shadow) / 0.55), 0 0 0 1px rgb(var(--line) / 0.6)',
        lift: '0 18px 50px -12px rgb(var(--shadow) / 0.7)',
      },
    },
  },
  plugins: [],
}
