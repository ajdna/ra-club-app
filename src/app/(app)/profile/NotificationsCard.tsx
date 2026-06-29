"use client";

import { useState, useTransition } from "react";
import { setNotificationPref } from "@/modules/notifications/pref-actions";
import type { NotifPref } from "@/modules/notifications/prefs";

const DIGEST_TYPES: { type: string; label: string }[] = [
  { type: "weight_log_reminder", label: "Weight reminder" },
  { type: "daily_followup_summary", label: "Follow-up summary" },
  { type: "evening_summary", label: "Evening check-in" },
];

const EVENT_TYPES: { type: string; label: string }[] = [
  { type: "message_received", label: "Messages" },
  { type: "broadcast_received", label: "Broadcasts" },
  { type: "approval_request", label: "Approval requests" },
  { type: "new_downline_member", label: "New team member" },
];

const CLUB_TYPES: { type: string; label: string }[] = [
  { type: "morning_club", label: "Morning club reminder" },
  { type: "evening_club", label: "Evening club reminder" },
];

function buildState(prefs: NotifPref[]) {
  const map = new Map(prefs.map((p) => [p.type, p]));
  const state: Record<string, { enabled: boolean; sendTime: string }> = {};
  for (const { type } of [...DIGEST_TYPES, ...EVENT_TYPES, ...CLUB_TYPES, { type: "sound" }]) {
    state[type] = {
      enabled: map.get(type)?.enabled ?? true,
      sendTime: map.get(type)?.send_time?.slice(0, 5) ?? "",
    };
  }
  return state;
}

export function NotificationsCard({
  initialPrefs,
  showClubReminders,
}: {
  initialPrefs: NotifPref[];
  showClubReminders: boolean;
}) {
  const [state, setState] = useState(() => buildState(initialPrefs));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  }

  function toggleEnabled(type: string, enabled: boolean) {
    setState((s) => ({ ...s, [type]: { ...s[type], enabled } }));
    startTransition(async () => {
      const res = await setNotificationPref(type, enabled);
      if (!res.ok) flash(false, res.error ?? "Save failed");
    });
  }

  function changeTime(type: string, sendTime: string) {
    setState((s) => ({ ...s, [type]: { ...s[type], sendTime } }));
  }

  function saveTime(type: string) {
    startTransition(async () => {
      const res = await setNotificationPref(type, state[type].enabled, state[type].sendTime);
      if (res.ok) flash(true, "Time save ho gaya ✓");
      else flash(false, res.error ?? "Save failed");
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm space-y-4">
      {/* Sound & vibration — single toggle, always visible */}
      <div className="flex items-center gap-3 pb-1 border-b border-line">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="sr-only"
            checked={state["sound"].enabled}
            disabled={pending}
            onChange={(e) => toggleEnabled("sound", e.target.checked)}
          />
          <span
            className={`h-[26px] w-[46px] rounded-full transition-colors ${
              state["sound"].enabled ? "bg-terra" : "bg-line"
            }`}
          >
            <span
              className={`block h-[22px] w-[22px] translate-y-[2px] rounded-full bg-white shadow transition-transform ${
                state["sound"].enabled ? "translate-x-[22px]" : "translate-x-[2px]"
              }`}
            />
          </span>
        </label>
        <span className="text-sm font-medium text-ink">Sound &amp; vibration</span>
      </div>

      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d">
        Digest notifications
      </p>

      {DIGEST_TYPES.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="sr-only"
              checked={state[type].enabled}
              disabled={pending}
              onChange={(e) => toggleEnabled(type, e.target.checked)}
            />
            <span
              className={`h-[26px] w-[46px] rounded-full transition-colors ${
                state[type].enabled ? "bg-terra" : "bg-line"
              }`}
            >
              <span
                className={`block h-[22px] w-[22px] translate-y-[2px] rounded-full bg-white shadow transition-transform ${
                  state[type].enabled ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </span>
          </label>
          <span className="flex-1 text-sm text-ink">{label}</span>
          <input
            type="time"
            value={state[type].sendTime}
            disabled={!state[type].enabled || pending}
            onChange={(e) => changeTime(type, e.target.value)}
            onBlur={() => state[type].sendTime && saveTime(type)}
            className="rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink outline-none focus:border-terra disabled:opacity-40"
          />
        </div>
      ))}

      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sage-d pt-2">
        Event notifications
      </p>

      {[...EVENT_TYPES, ...(showClubReminders ? CLUB_TYPES : [])].map(({ type, label }) => (
        <div key={type} className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="sr-only"
              checked={state[type].enabled}
              disabled={pending}
              onChange={(e) => toggleEnabled(type, e.target.checked)}
            />
            <span
              className={`h-[26px] w-[46px] rounded-full transition-colors ${
                state[type].enabled ? "bg-terra" : "bg-line"
              }`}
            >
              <span
                className={`block h-[22px] w-[22px] translate-y-[2px] rounded-full bg-white shadow transition-transform ${
                  state[type].enabled ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </span>
          </label>
          <span className="text-sm text-ink">{label}</span>
        </div>
      ))}

      {msg && (
        <p
          role="alert"
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            msg.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
