export default function Sparkline({ values, height = 56, color = '#ff7e00' }) {
  const clean = (values ?? []).filter(v => v != null && isFinite(v))
  if (clean.length < 2) return null

  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const W = 280
  const pad = 4

  const points = clean
    .map((v, i) => {
      const x = (i / (clean.length - 1)) * W
      const y = pad + (1 - (v - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
