"use client";

import { useState, useTransition } from "react";
import { scheduleHomeVisit, setMeetingLink } from "./actions";

export function HomeVisitActions({
  taskId,
  scheduledAt,
  meetingLink,
  memberName,
}: {
  taskId: string;
  scheduledAt: string | null;
  meetingLink: string | null;
  memberName: string;
}) {
  const [mode, setMode] = useState<"idle" | "schedule" | "link">("idle");
  const [dateVal, setDateVal] = useState(
    scheduledAt ? scheduledAt.slice(0, 16) : "",
  );
  const [linkVal, setLinkVal] = useState(meetingLink ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, start] = useTransition();

  function saveSchedule() {
    if (!dateVal) return;
    start(async () => {
      const res = await scheduleHomeVisit(taskId, new Date(dateVal).toISOString());
      if (res.error) { alert(res.error); return; }
      setSaved(true);
      setMode("idle");
    });
  }

  function saveLink() {
    start(async () => {
      const res = await setMeetingLink(taskId, linkVal);
      if (res.error) { alert(res.error); return; }
      setMode("idle");
    });
  }

  function copyLink() {
    if (linkVal) navigator.clipboard.writeText(linkVal);
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Current scheduled time */}
      {scheduledAt && (
        <p className="text-xs text-emerald font-semibold">
          📅 {new Date(scheduledAt).toLocaleString("en-IN", {
            day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
          })} scheduled
        </p>
      )}

      {/* Action buttons */}
      {mode === "idle" && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setMode("schedule")}
            className="rounded-lg border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald"
          >
            📅 {scheduledAt ? "Reschedule" : "Schedule"}
          </button>
          <button
            onClick={() => setMode("link")}
            className="rounded-lg border border-sage-d/30 bg-sage-d/10 px-2.5 py-1 text-xs font-semibold text-sage-d"
          >
            🔗 {meetingLink ? "Edit Link" : "Meeting Link"}
          </button>
          {meetingLink && (
            <button
              onClick={copyLink}
              className="rounded-lg border border-terra/30 bg-terra/10 px-2.5 py-1 text-xs font-semibold text-terra-d"
            >
              📋 Copy Link
            </button>
          )}
          {meetingLink && (
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-terra/30 bg-terra/10 px-2.5 py-1 text-xs font-semibold text-terra-d"
            >
              🚀 Join
            </a>
          )}
        </div>
      )}

      {/* Schedule picker */}
      {mode === "schedule" && (
        <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-emerald">
            📅 {memberName} ke liye visit schedule karein
          </p>
          <input
            type="datetime-local"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            className="w-full rounded-lg border border-line bg-cream px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={saveSchedule}
              disabled={!dateVal || isPending}
              className="rounded-lg bg-emerald px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setMode("idle")} className="text-xs text-ink/50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meeting link */}
      {mode === "link" && (
        <div className="rounded-xl border border-sage-d/30 bg-sage-d/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-sage-d">🔗 Meeting link</p>
          <input
            type="url"
            value={linkVal}
            onChange={(e) => setLinkVal(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="w-full rounded-lg border border-line bg-cream px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={saveLink}
              disabled={isPending}
              className="rounded-lg bg-sage-d px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setMode("idle")} className="text-xs text-ink/50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {saved && (
        <p className="text-xs text-good font-semibold">✓ Scheduled ho gaya!</p>
      )}
    </div>
  );
}
