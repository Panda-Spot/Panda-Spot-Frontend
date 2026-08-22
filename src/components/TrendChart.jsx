import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Validated categorical pair (blue, orange) — passes CVD/contrast/lightness
// checks in both light and dark mode. Do not swap these for brand purple/pink;
// chart data-ink follows this validated system, brand color is for UI chrome.
const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834'],
  dark: ['#3987e5', '#d95926'],
}
const GRID_COLOR = { light: '#e1e0d9', dark: '#2c2c2a' }
const AXIS_COLOR = { light: '#898781', dark: '#898781' }

function useIsDarkMode() {
  // matches the existing prefers-color-scheme approach this codebase already
  // uses in CSS — mirror it in JS for recharts (which needs real color values,
  // not CSS custom properties, since it renders to SVG)
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark
}

// series: [{ key: 'daily_searches', name: 'Searches', data: [{date,count}] }, ...]
// If there's only one series, recharts still gets a single Line — no legend needed (title names it).
export default function TrendChart({ series, height = 220 }) {
  const dark = useIsDarkMode()
  const colors = dark ? SERIES_COLORS.dark : SERIES_COLORS.light

  // Merge series (which all share the same date range) into one array of
  // { date, [seriesKey]: count, ... } for recharts.
  const merged = series[0]?.data.map((point, i) => {
    const row = { date: point.date }
    series.forEach((s) => { row[s.key] = s.data[i]?.count ?? 0 })
    return row
  }) ?? []

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={dark ? GRID_COLOR.dark : GRID_COLOR.light} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => d.slice(5)} // "MM-DD"
          stroke={AXIS_COLOR.light}
          tick={{ fontSize: 11 }}
          interval={Math.ceil(merged.length / 8)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis allowDecimals={false} stroke={AXIS_COLOR.light} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(11,11,11,0.15)', fontSize: 13 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
