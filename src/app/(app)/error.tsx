"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logs to Sentry / error monitoring if configured.
    console.error("[AppError]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-5xl">😔</div>

      <h1 className="font-display mt-4 text-xl font-semibold text-emerald">
        Kuch galat ho gaya
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        Ek technical problem aayi. Dobara try karein ya home par jao.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-ink/30">
          ref: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-terra px-5 py-2.5 font-semibold text-white transition hover:bg-terra-d"
        >
          Dobara try karein
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line bg-card px-5 py-2.5 text-sm font-semibold text-terra-d transition hover:bg-cream-2"
        >
          ← Home par jao
        </Link>
      </div>
    </main>
  );
}
