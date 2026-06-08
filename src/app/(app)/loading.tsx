// Shared loading skeleton for all (app) routes.
// Shows while the server component is fetching data.
// BottomNav remains visible (it's in layout.tsx) so the UI stays stable.

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line ${className}`} />;
}

export default function AppLoading() {
  return (
    <main className="px-4 pb-6 pt-6">
      {/* Header */}
      <div className="mb-5 px-1 space-y-2">
        <Pulse className="h-3 w-28" />
        <Pulse className="h-8 w-52" />
        <Pulse className="h-3 w-40" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3">
        <Pulse className="h-24" />
        <Pulse className="h-24" />
        <Pulse className="h-24" />
        <Pulse className="h-24" />
      </div>

      {/* Section */}
      <Pulse className="mt-6 h-4 w-32" />
      <Pulse className="mt-2 h-36" />

      <Pulse className="mt-6 h-4 w-28" />
      <Pulse className="mt-2 h-28" />
    </main>
  );
}
