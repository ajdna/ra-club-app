import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function istToday(): string {
  const ms = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

export default async function ClubPeriodPage({
  params,
}: {
  params: Promise<{ period: string }>;
}) {
  const { period } = await params;
  if (period !== "morning" && period !== "evening") notFound();

  const me = await getCurrentUser();
  if (me === null) redirect("/login");
  if (typeof me === "string") redirect("/");

  const today = istToday();
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_sessions")
    .select("details, link")
    .eq("session_date", today)
    .eq("period", period)
    .maybeSingle();

  const label = period === "morning" ? "Morning" : "Evening";
  const details = data?.details?.trim() ?? "";
  const link = data?.link?.trim() ?? "";

  return (
    <main className="px-4 pb-10 pt-5">
      <h1 className="mb-4 font-display text-[22px] font-semibold text-ink">
        {label} Club
      </h1>

      {details ? (
        <>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-terra px-5 py-3 text-base font-semibold text-white shadow transition hover:bg-terra-d active:scale-95"
            >
              Join Zoom
            </a>
          )}
          <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink">
              {details}
            </pre>
          </div>
        </>
      ) : (
        <p className="mt-6 text-center text-ink/55">
          Aaj ka {period} session abhi post nahi hua.
        </p>
      )}
    </main>
  );
}
