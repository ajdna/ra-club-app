function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line ${className}`} />;
}

export default function MembersLoading() {
  return (
    <main className="px-4 pb-6 pt-6">
      <div className="mb-4 flex items-center justify-between px-1">
        <Pulse className="h-7 w-36" />
        <Pulse className="h-8 w-16 rounded-xl" />
      </div>

      {/* Search bar */}
      <Pulse className="mb-3 h-11 w-full rounded-xl" />

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        <Pulse className="h-9 w-16 rounded-full" />
        <Pulse className="h-9 w-24 rounded-full" />
        <Pulse className="h-9 w-20 rounded-full" />
        <Pulse className="h-9 w-20 rounded-full" />
      </div>

      {/* Member rows */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Pulse key={i} className="h-16" />
        ))}
      </div>
    </main>
  );
}
