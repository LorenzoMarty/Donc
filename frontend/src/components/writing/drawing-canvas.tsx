"use client";

import { useEffect, useRef } from "react";

export type DrawingTool = "pen-black" | "pen-blue" | "pen-red" | "highlighter" | "eraser";

export type Stroke = {
  id: string;
  tool: DrawingTool;
  /** Pontos em fração 0..1 do tamanho do canvas — resiliente a resize. */
  points: { x: number; y: number }[];
};

const TOOL_STYLE: Record<DrawingTool, { color: string; width: number; alpha: number; erase?: boolean }> = {
  "pen-black": { color: "#1f2a24", width: 2.2, alpha: 0.92 },
  "pen-blue": { color: "#1d4ed8", width: 2.2, alpha: 0.92 },
  "pen-red": { color: "#b3122a", width: 2.2, alpha: 0.92 },
  highlighter: { color: "#fbbf24", width: 14, alpha: 0.35 },
  eraser: { color: "#000000", width: 22, alpha: 1, erase: true },
};

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  if (stroke.points.length < 2) return;
  const style = TOOL_STYLE[stroke.tool];
  ctx.save();
  ctx.globalCompositeOperation = style.erase ? "destination-out" : "source-over";
  ctx.globalAlpha = style.alpha;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  stroke.points.forEach((point, index) => {
    const x = point.x * width;
    const y = point.y * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

/**
 * Canvas de desenho livre sobre a folha de redação. Captura ponteiro só quando `activeTool` !=
 * null (senão o texto por baixo permanece digitável). Strokes ficam no estado do pai (não no
 * canvas) para sobreviver à troca folha/motivadores, que desmonta este componente.
 */
export function DrawingCanvas({
  strokes,
  activeTool,
  onStrokeComplete,
}: {
  strokes: Stroke[];
  activeTool: DrawingTool | null;
  onStrokeComplete: (stroke: Stroke) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<{ x: number; y: number }[] | null>(null);

  function redrawAll() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) drawStroke(ctx, stroke, canvas.width, canvas.height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawAll();
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  function toFraction(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeTool) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draftRef.current = [toFraction(event)];
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeTool || !draftRef.current) return;
    draftRef.current.push(toFraction(event));
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawStroke(ctx, { id: "draft", tool: activeTool, points: draftRef.current }, canvas.width, canvas.height);
  }

  function handlePointerUp() {
    if (!activeTool || !draftRef.current) return;
    if (draftRef.current.length > 1) {
      onStrokeComplete({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: activeTool,
        points: draftRef.current,
      });
    }
    draftRef.current = null;
  }

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={activeTool ? "pointer-events-auto touch-none" : "pointer-events-none"}
        style={{ width: "100%", height: "100%", cursor: activeTool ? "crosshair" : "default" }}
      />
    </div>
  );
}
