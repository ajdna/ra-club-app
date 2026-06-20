"use client";

import { useEffect, useRef } from "react";

type Point = { weight: number; logged_at: string };

const DURATION = 900; // ms for chart draw animation

export function WeightChart({ weights }: { weights: Point[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weights.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Theme-aware colors read from CSS tokens (adapts to light/dark).
    const cs = getComputedStyle(document.documentElement);
    const ACCENT = cs.getPropertyValue("--terra").trim() || "#e07228";
    const LABEL = cs.getPropertyValue("--ink-2").trim() || "#6b6253";
    const GRID = cs.getPropertyValue("--line").trim() || "#e0d8c6";
    const CARD = cs.getPropertyValue("--card").trim() || "#fffefb";
    const toRGBA = (hex: string, a: number) => {
      const h = hex.replace("#", "");
      const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

    const pts = [...weights].reverse();
    const vals = pts.map((p) => Number(p.weight));
    const minV = Math.min(...vals) - 1.5;
    const maxV = Math.max(...vals) + 1.5;

    const xOf = (i: number) => PAD.left + (i / (pts.length - 1)) * (W - PAD.left - PAD.right);
    const yOf = (v: number) => PAD.top + ((maxV - v) / (maxV - minV)) * (H - PAD.top - PAD.bottom);

    function drawGrid() {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
        const y = PAD.top + f * (H - PAD.top - PAD.bottom);
        const v = maxV - f * (maxV - minV);
        ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
        ctx.fillStyle = LABEL;
        ctx.font = `${10}px system-ui`;
        ctx.textAlign = "right";
        ctx.fillText(`${v.toFixed(1)}`, PAD.left - 4, y + 4);
      });
    }

    function drawXLabels() {
      ctx.fillStyle = LABEL;
      ctx.font = `9px system-ui`;
      pts.forEach((p, i) => {
        const label = new Date(p.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        ctx.textAlign = "center";
        ctx.fillText(label, xOf(i), H - 6);
      });
    }

    function drawFillAndLine(progress: number) {
      const clipX = PAD.left + progress * (W - PAD.left - PAD.right);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, clipX, H);
      ctx.clip();

      // Fill
      const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
      grad.addColorStop(0, toRGBA(ACCENT, 0.18));
      grad.addColorStop(1, toRGBA(ACCENT, 0));
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
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      vals.forEach((v, i) => { if (i === 0) ctx.moveTo(xOf(i), yOf(v)); else ctx.lineTo(xOf(i), yOf(v)); });
      ctx.stroke();

      ctx.restore();
    }

    function drawDots() {
      vals.forEach((v, i) => {
        const x = xOf(i), y = yOf(v);
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ACCENT; ctx.fill();
        ctx.strokeStyle = CARD; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.fillStyle = LABEL;
        ctx.font = `bold 10px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(`${v}`, x, y - 10);
      });
    }

    // Draw static elements once
    drawGrid();
    drawXLabels();

    // Animate the line draw
    let startTime: number | null = null;

    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      // Clear only the chart area (preserving grid/labels is tricky, so just redraw all)
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      drawXLabels();
      drawFillAndLine(eased);
      if (progress >= 1) {
        drawDots();
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
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
