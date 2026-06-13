"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { logMyWeight, markMyAttendance } from "./actions";

type WeightLog = { weight: number; logged_at: string };
type AttendanceDay = { date: string; present: boolean };
type Task = { activity: string; due_date: string; status: string; cycle: number; day_number: number };
type MemberInfo = {
  name: string;
  currentWeight: number | null;
  idealWeight: number | null;
  stage: number;
  membership: string;
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: "📞 Call",
  home_visit: "🏠 Home visit",
  reminder: "📲 Reminder",
};

function WeightChart({ weights }: { weights: WeightLog[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || weights.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const pad = { top: 12, right: 16, bottom: 28, left: 36 };
    const pts = [...weights].reverse();
    const vals = pts.map((p) => Number(p.weight));
    const minV = Math.min(...vals) - 2;
    const maxV = Math.max(...vals) + 2;

    function xOf(i: number) { return pad.left + (i / (pts.length - 1)) * (w - pad.left - pad.right); }
    function yOf(v: number) { return pad.top + ((maxV - v) / (maxV - minV)) * (h - pad.top - pad.bottom); }

    // Grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (i / 3) * (h - pad.top - pad.bottom);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }

    // Fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, "rgba(211,84,0,0.18)");
    grad.addColorStop(1, "rgba(211,84,0,0)");
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(vals[0]));
    pts.forEach((_, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(vals[i])); });
    ctx.lineTo(xOf(pts.length - 1), h - pad.bottom);
    ctx.lineTo(xOf(0), h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#d35400";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    pts.forEach((_, i) => {
      if (i === 0) ctx.moveTo(xOf(i), yOf(vals[i]));
      else ctx.lineTo(xOf(i), yOf(vals[i]));
    });
    ctx.stroke();

    // Dots + labels
    pts.forEach((p, i) => {
      const x = xOf(i), y = yOf(vals[i]);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#d35400";
      ctx.fill();

      ctx.fillStyle = "#5a4a3a";
      ctx.font = `bold ${10 * dpr / dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${vals[i]}`, x, y - 8);
    });

    // X labels (dates)
    ctx.fillStyle = "rgba(90,74,58,0.55)";
    ctx.font = `${9 * dpr / dpr}px sans-serif`;
    pts.forEach((p, i) => {
      const label = new Date(p.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      ctx.textAlign = "center";
      ctx.fillText(label, xOf(i), h - 6);
    });
  }, [weights]);

  if (weights.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-ink/40">
        Log 2+ weights to see chart
      </div>
    );
  }

  return <canvas ref={canvasRef} className="h-32 w-full" />;
}

export function MyProgressClient({
  member,
  weights,
  attendance,
  tasks,
  presentToday,
}: {
  member: MemberInfo;
  weights: WeightLog[];
  attendance: AttendanceDay[];
  tasks: Task[];
  presentToday: boolean;
}) {
  const [weightVal, setWeightVal] = useState("");
  const [weightPending, startWeight] = useTransition();
  const [attendancePending, startAttendance] = useTransition();
  const [weightError, setWeightError] = useState<string | null>(null);
  const [markedPresent, setMarkedPresent] = useState(presentToday);
  const [optimisticWeights, setOptimisticWeights] = useState(weights);

  const today = new Date().toISOString().split("T")[0];
  const weightGap = member.currentWeight && member.idealWeight
    ? Math.round((member.currentWeight - member.idealWeight) * 10) / 10
    : null;

  const streakDays = (() => {
    let s = 0;
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    for (const a of sorted) {
      if (a.present) s++;
      else break;
    }
    return s;
  })();

  const stageProgress = Math.round((member.stage / 6) * 100);
  const upcomingTasks = tasks.filter(t => t.status === "pending" && t.due_date >= today).slice(0, 5);

  function submitWeight() {
    const w = parseFloat(weightVal);
    setWeightError(null);
    startWeight(async () => {
      const res = await logMyWeight(w);
      if (res.ok) {
        setOptimisticWeights(prev => [{ weight: w, logged_at: new Date().toISOString() }, ...prev].slice(0, 12));
        setWeightVal("");
      } else {
        setWeightError((res as { ok: false; error: string }).error);
      }
    });
  }

  function submitAttendance() {
    startAttendance(async () => {
      const res = await markMyAttendance();
      if (res.ok) setMarkedPresent(true);
    });
  }

  return (
    <div className="space-y-5">
      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-card p-3 text-center shadow-sm">
          <div className="font-display text-2xl font-bold text-terra-d">
            {member.currentWeight ? `${member.currentWeight}` : "—"}
          </div>
          <div className="text-xs text-ink/55">kg now</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3 text-center shadow-sm">
          <div className="font-display text-2xl font-bold text-sage-d">
            {streakDays}
          </div>
          <div className="text-xs text-ink/55">day streak</div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3 text-center shadow-sm">
          <div className="font-display text-2xl font-bold text-emerald">
            {member.stage}/6
          </div>
          <div className="text-xs text-ink/55">stage</div>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-ink">Journey Progress</span>
          <span className="text-xs text-ink/55">{member.membership} member</span>
        </div>
        <div className="h-3 w-full rounded-full bg-line overflow-hidden">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-emerald to-terra transition-all duration-700"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-ink/45">
          <span>Stage 1</span>
          <span className="font-semibold text-emerald">{stageProgress}% complete</span>
          <span>Stage 6</span>
        </div>
        {weightGap !== null && (
          <p className="mt-2 text-sm text-ink/70">
            {weightGap > 0
              ? `🎯 ${weightGap} kg to ideal weight (${member.idealWeight} kg)`
              : "🎉 At ideal weight!"}
          </p>
        )}
      </div>

      {/* Weight chart */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-ink">⚖️ Weight Trend</h2>
        <WeightChart weights={optimisticWeights.slice(0, 8)} />
        <div className="mt-3 flex gap-2">
          <input
            inputMode="decimal"
            value={weightVal}
            onChange={(e) => setWeightVal(e.target.value)}
            placeholder="Today's weight (kg)"
            className="min-w-0 flex-1 rounded-xl border border-line bg-cream-2 px-3 py-2 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-terra"
          />
          <button
            onClick={submitWeight}
            disabled={weightPending || !weightVal}
            className="rounded-xl bg-terra px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {weightPending ? "…" : "Log"}
          </button>
        </div>
        {weightError && <p className="mt-1 text-xs text-bad">{weightError}</p>}
      </div>

      {/* Attendance */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">📍 Club Attendance</h2>
          {markedPresent ? (
            <span className="rounded-full bg-good/15 px-3 py-1 text-xs font-semibold text-good">
              ✅ Marked today
            </span>
          ) : (
            <button
              onClick={submitAttendance}
              disabled={attendancePending}
              className="rounded-xl bg-emerald px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {attendancePending ? "…" : "Mark Present"}
            </button>
          )}
        </div>
        {attendance.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map((a) => (
              <span
                key={a.date}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  a.present ? "bg-good/15 text-good" : "bg-line text-ink/40"
                }`}
              >
                {new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming tasks */}
      {upcomingTasks.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-ink">📋 Upcoming Follow-ups</h2>
          <div className="space-y-2">
            {upcomingTasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink">{ACTIVITY_LABEL[t.activity] ?? t.activity}</span>
                <span className="text-xs text-ink/50">
                  {new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {" · Cycle "}{t.cycle}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
