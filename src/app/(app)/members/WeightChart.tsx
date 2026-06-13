"use client";

import { useEffect, useRef } from "react";

type Point = { weight: number; logged_at: string };

export function WeightChart({ weights }: { weights: Point[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weights.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

    const pts = [...weights].reverse();
    const vals = pts.map((p) => Number(p.weight));
    const minV = Math.min(...vals) - 1.5;
    const maxV = Math.max(...vals) + 1.5;

    const xOf = (i: number) => PAD.left + (i / (pts.length - 1)) * (W - PAD.left - PAD.right);
    const yOf = (v: number) => PAD.top + ((maxV - v) / (maxV - minV)) * (H - PAD.top - PAD.bottom);

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const y = PAD.top + f * (H - PAD.top - PAD.bottom);
      const v = maxV - f * (maxV - minV);
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
      ctx.fillStyle = "rgba(90,74,58,0.45)";
      ctx.font = `${10}px system-ui`;
      ctx.textAlign = "right";
      ctx.fillText(`${v.toFixed(1)}`, PAD.left - 4, y + 4);
    });

    // Fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
    grad.addColorStop(0, "rgba(211,84,0,0.2)");
    grad.addColorStop(1, "rgba(211,84,0,0)");
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(vals[0]));
    vals.forEach((v, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(v)); });
    ctx.lineTo(xOf(pts.length - 1), H - PAD.bottom);
    ctx.lineTo(xOf(0), H - PAD.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = "#d35400";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    vals.forEach((v, i) => { if (i === 0) ctx.moveTo(xOf(i), yOf(v)); else ctx.lineTo(xOf(i), yOf(v)); });
    ctx.stroke();

    // Dots + values
    vals.forEach((v, i) => {
      const x = xOf(i), y = yOf(v);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#d35400"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = "#5a4a3a";
      ctx.font = `bold 10px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`${v}`, x, y - 10);
    });

    // X-axis dates
    ctx.fillStyle = "rgba(90,74,58,0.5)";
    ctx.font = `9px system-ui`;
    pts.forEach((p, i) => {
      const label = new Date(p.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      ctx.textAlign = "center";
      ctx.fillText(label, xOf(i), H - 6);
    });
  }, [weights]);

  if (weights.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center text-sm text-ink/40">
        Log at least 2 weights to see trend
      </div>
    );
  }

  return <canvas ref={canvasRef} className="h-36 w-full" />;
}
