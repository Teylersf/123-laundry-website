export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-brand-200/20" />
        <div className="h-9 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-4 max-w-xl animate-pulse rounded bg-white/5" />
      </div>
      {[180, 150, 240].map((height, index) => (
        <div
          key={height + index}
          className="animate-pulse rounded-2xl border border-white/10 bg-ink-soft p-4"
          style={{ minHeight: height }}
        >
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="mt-2 h-3 w-64 max-w-full rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
