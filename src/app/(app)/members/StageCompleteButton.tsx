"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeStage } from "./actions";

const CONFETTI_COLORS = ["#E8724A", "#3DA48A", "#6AB85A", "#F2B347", "#5B8AD4", "#E06090"];

export function StageCompleteButton({
  memberId,
  currentStage,
}: {
  memberId: string;
  currentStage: number;
}) {
  const router = useRouter();
  const [celebrating, setCelebrating] = useState(false);
  const [completedStage, setCompletedStage] = useState(0);
  const [pending, startTransition] = useTransition();

  if (currentStage >= 6) return null;

  function handleComplete() {
    startTransition(async () => {
      const result = await completeStage(memberId);
      if (result.ok) {
        setCompletedStage(currentStage);
        setCelebrating(true);
        setTimeout(() => {
          setCelebrating(false);
          router.refresh();
        }, 2800);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending || celebrating}
        onClick={handleComplete}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-terra py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
      >
        <span>🎯</span>
        {pending ? "Completing…" : "Complete Stage " + currentStage + " → " + (currentStage + 1)}
      </button>

      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-14">
          {/* Falling confetti dots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: color,
                  left: (12 + i * 14) + "%",
                  top: -12,
                  animation: "stageConfettiFall 2.8s ease-in " + (i * 0.12) + "s both",
                }}
              />
            ))}
          </div>

          {/* Celebration card */}
          <div
            className="mx-6 w-full max-w-sm rounded-3xl bg-card px-8 py-8 text-center shadow-2xl"
            style={{ animation: "stageSlideUp 0.35s ease-out both" }}
          >
            <div style={{ fontSize: 56 }}>🎉</div>
            <h2 className="font-display mt-3 text-2xl font-bold text-emerald">
              Stage {completedStage} Complete!
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Advancing to Stage {completedStage + 1}
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-terra"
                style={{ animation: "stageTimerBar 2.8s linear both" }}
              />
            </div>
          </div>

          <style>{`
            @keyframes stageConfettiFall {
              0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
              100% { transform: translateY(105vh) rotate(400deg); opacity: 0; }
            }
            @keyframes stageSlideUp {
              from { transform: translateY(50px); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
            @keyframes stageTimerBar {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
