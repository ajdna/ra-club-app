function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line ${className}`} />;
}

export default function MemberDetailLoading() {
  return (
    <main className="px-4 pb-8 pt-5">
      <Pulse className="h-4 w-20 rounded-xl" />

      {/* Header */}
      <header className="mt-3 flex items-center gap-4">
        <Pulse className="h-14 w-14 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Pulse className="h-6 w-36" />
          <Pulse className="h-3 w-24" />
        </div>
      </header>

      {/* Quick facts */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Pulse className="h-16" />
        <Pulse className="h-16" />
      </div>
      {/* Stage path */}
      <Pulse className="mt-3 h-16" />

      {/* Sections */}
      <Pulse className="mt-6 h-4 w-32" />
      <Pulse className="mt-2 h-28" />

      <Pulse className="mt-6 h-4 w-20" />
      <Pulse className="mt-2 h-32" />

      <Pulse className="mt-6 h-4 w-32" />
      <Pulse className="mt-2 h-24" />
    </main>
  );
}
