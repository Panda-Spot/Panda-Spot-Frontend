export default function StatTile({ icon: Icon, value, label, accent }) {
  return (
    <div className="stat-tile-v2">
      <div className="stat-tile-icon" style={accent ? { color: accent } : undefined}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </div>
  )
}
