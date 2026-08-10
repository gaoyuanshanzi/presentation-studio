'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SlideContent } from '@/types';
import { Image as ImageIcon } from 'lucide-react';

interface SlaveViewerProps {
  id: string;
  title: string;
  badgeText: string;
  badgeColor: string;
  data: SlideContent;
  isRecordingTarget?: boolean;
  /** When false and content is empty, shows only background (no placeholder). Default: true */
  showPlaceholder?: boolean;
  /** Pen drawing props */
  isPenMode?: boolean;
  penColor?: string;
  penSize?: 'fine' | 'medium' | 'thick';
  /** Changing this value clears the drawing canvas instantly */
  clearTrigger?: string;
  /** Incrementing this number triggers Undo Last Stroke */
  undoTrigger?: number;
  /** Incrementing this number triggers Clear All Strokes */
  clearAllTrigger?: number;
}

export default function SlaveViewer({
  id,
  title,
  badgeText,
  badgeColor,
  data,
  isRecordingTarget = true,
  showPlaceholder = true,
  isPenMode = false,
  penColor = '#facc15',
  penSize = 'fine',
  clearTrigger,
  undoTrigger,
  clearAllTrigger,
}: SlaveViewerProps) {
  const hasBgImage = Boolean(data.bgImage);
  const hasContent = data.content.trim().length > 0;

  // ── Drawing canvas refs & stroke history for Undo ──────────────────────────
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // Stack of ImageData snapshots before each stroke for Undo functionality
  const strokeHistory = useRef<ImageData[]>([]);

  // Clear canvas and history whenever clearTrigger or slide changes
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory.current = [];
  }, [clearTrigger, clearAllTrigger]);

  // Undo last stroke action
  useEffect(() => {
    if (!undoTrigger) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (strokeHistory.current.length > 0) {
      const lastState = strokeHistory.current.pop();
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [undoTrigger]);

  // Resize drawing canvas to match container
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => {
      const canvas = drawCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      // Preserve existing drawing during resize
      const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (imageData) canvas.getContext('2d')?.putImageData(imageData, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Drawing helpers: shared stroke logic ──────────────────────────────────
  const getPosFromXY = (clientX: number, clientY: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const pushHistory = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokeHistory.current.push(snapshot);
      if (strokeHistory.current.length > 30) strokeHistory.current.shift();
    }
  };

  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }, pressure = 1) => {
      const canvas = drawCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isHighlighter = penColor.startsWith('rgba') || ['#facc15', '#a3e635', '#fb923c', '#f472b6', '#60a5fa'].includes(penColor);

      let baseWidth = 2;
      if (penSize === 'medium') baseWidth = 5;
      if (penSize === 'thick') baseWidth = 12;

      // Galaxy S Pen pressure: scale width by pressure (0.5 ~ 1.5)
      const pressureFactor = pressure > 0 ? Math.max(0.5, Math.min(pressure * 1.5, 2.0)) : 1;

      ctx.save();
      ctx.globalAlpha = isHighlighter ? 0.45 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = (isHighlighter ? Math.max(8, baseWidth * 2.2) : baseWidth) * pressureFactor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    },
    [penColor, penSize]
  );

  // ── Mouse Events (Desktop) ─────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPenMode) return;
      pushHistory();
      isDrawing.current = true;
      lastPos.current = getPosFromXY(e.clientX, e.clientY);
    },
    [isPenMode]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPenMode || !isDrawing.current || !lastPos.current) return;
      const current = getPosFromXY(e.clientX, e.clientY);
      drawStroke(lastPos.current, current);
      lastPos.current = current;
    },
    [isPenMode, drawStroke]
  );

  const onMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  // ── Pointer Events (Galaxy S Pen + Stylus + Touch fallback) ───────────────
  // Pointer events API covers: mouse, touch, S Pen, and stylus with pressure
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPenMode) return;
      // Prevent scrolling the page while drawing
      e.currentTarget.setPointerCapture(e.pointerId);
      pushHistory();
      isDrawing.current = true;
      lastPos.current = getPosFromXY(e.clientX, e.clientY);
    },
    [isPenMode]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPenMode || !isDrawing.current || !lastPos.current) return;
      const current = getPosFromXY(e.clientX, e.clientY);
      // e.pressure: 0~1 (Galaxy S Pen provides real pressure, touch provides 0.5, mouse provides 0.5)
      drawStroke(lastPos.current, current, e.pressure || 0.5);
      lastPos.current = current;
    },
    [isPenMode, drawStroke]
  );

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  return (
    <div
      id={id}
      ref={containerRef}
      className="relative flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden transition-all group select-none"
    >
      {/* Top Header Badge — hidden during recording via data-export-ignore */}
      <div
        data-export-ignore="true"
        className="export-ignore-ui absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none"
      >
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md shadow-sm ${badgeColor}`}>
          {badgeText}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-md border border-slate-200 text-slate-700 shadow-sm">
          {title}
        </span>
      </div>

      {/* Background Color / Image Container */}
      <div
        data-slide-canvas="true"
        className="relative flex-1 w-full h-full p-8 md:p-12 flex flex-col justify-center overflow-auto transition-colors duration-300"
        style={{
          backgroundColor: data.bgColor || '#ffffff',
          color: data.textColor || '#0f172a',
        }}
      >
        {/* Background Image */}
        {hasBgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: `url(${data.bgImage})` }}
          />
        )}
        {/* Dark overlay on image — only shown when there IS content (for contrast) */}
        {hasBgImage && hasContent && (
          <div className="absolute inset-0 bg-slate-900/30 z-0" />
        )}

        {/* Markdown Content */}
        {hasContent ? (
          <div
            className={`relative z-10 w-full max-w-2xl mx-auto rounded-2xl transition-all ${
              hasBgImage
                ? 'p-6 bg-slate-950/40 backdrop-blur-md border border-white/20 shadow-xl'
                : ''
            }`}
            style={{ color: data.textColor || (hasBgImage ? '#ffffff' : '#0f172a') }}
          >
            <div className="slide-markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
            </div>
          </div>
        ) : showPlaceholder ? (
          /* ①_slave subtle hint */
          <div className="relative z-10 h-48 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200/40 rounded-xl">
            <p className="text-xs font-medium opacity-60">마크다운을 입력하면 실시간으로 렌더링됩니다.</p>
          </div>
        ) : null /* ②_slave empty — pure background, no overlay at all */}
      </div>

      {/* Pen Drawing Canvas Overlay — supports mouse, touch, Galaxy S Pen */}
      <canvas
        ref={drawCanvasRef}
        // Mouse events (desktop)
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        // Pointer events (touch / Galaxy S Pen / stylus with pressure)
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 z-20 rounded-xl"
        style={{
          pointerEvents: isPenMode ? 'all' : 'none',
          cursor: isPenMode ? 'crosshair' : 'default',
          // Prevent page scroll / zoom while drawing on touch devices
          touchAction: isPenMode ? 'none' : 'auto',
        }}
      />

      {/* Pen active indicator ring */}
      {isPenMode && (
        <div className="absolute inset-0 z-20 rounded-xl ring-2 ring-yellow-400 ring-offset-0 pointer-events-none" />
      )}

      {/* Bottom Footer — hidden during recording via data-export-ignore */}
      <div
        data-export-ignore="true"
        className="export-ignore-ui px-4 py-1.5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 z-30"
      >
        <span className="flex items-center gap-1 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE SYNCED
        </span>
        {hasBgImage && (
          <span className="flex items-center gap-1 text-slate-500 font-medium">
            <ImageIcon className="w-3 h-3" /> Image Overlay Mode
          </span>
        )}
      </div>
    </div>
  );
}
