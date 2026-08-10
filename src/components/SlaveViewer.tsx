'use client';

import React, { useRef, useEffect } from 'react';
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
  showPlaceholder?: boolean;
  isPenMode?: boolean;
  penColor?: string;
  penSize?: 'fine' | 'medium' | 'thick';
  clearTrigger?: string;
  undoTrigger?: number;
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

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const strokeHistory = useRef<ImageData[]>([]);

  // Keep refs for penColor/penSize so native event handlers always see latest values
  const penColorRef = useRef(penColor);
  const penSizeRef = useRef(penSize);
  const isPenModeRef = useRef(isPenMode);
  useEffect(() => { penColorRef.current = penColor; }, [penColor]);
  useEffect(() => { penSizeRef.current = penSize; }, [penSize]);
  useEffect(() => { isPenModeRef.current = isPenMode; }, [isPenMode]);

  // ── Clear canvas on slide/trigger change ───────────────────────────────────
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory.current = [];
  }, [clearTrigger, clearAllTrigger]);

  // ── Undo last stroke ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!undoTrigger) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (strokeHistory.current.length > 0) {
      const lastState = strokeHistory.current.pop();
      if (lastState) ctx.putImageData(lastState, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [undoTrigger]);

  // ── Resize canvas to container ─────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = drawCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
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

  // ── Native Pointer Events (mouse + touch + Galaxy S Pen) via useEffect ─────
  // Using native addEventListener (not React synthetic events) to enable
  // preventDefault() which is required to block page scroll while drawing on mobile.
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const getPosFromEvent = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const pushHistory = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokeHistory.current.push(snapshot);
      if (strokeHistory.current.length > 30) strokeHistory.current.shift();
    };

    const drawStroke = (from: { x: number; y: number }, to: { x: number; y: number }, pressure: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const color = penColorRef.current;
      const size = penSizeRef.current;
      const isHighlighter = ['#facc15', '#a3e635', '#fb923c', '#f472b6', '#60a5fa'].includes(color);

      let baseWidth = 2;
      if (size === 'medium') baseWidth = 5;
      if (size === 'thick') baseWidth = 12;

      // S Pen pressure support (0.0~1.0); finger touch = 0.5, mouse = 0.5
      const pFactor = Math.max(0.5, Math.min((pressure > 0 ? pressure : 0.5) * 1.8, 2.5));

      ctx.save();
      ctx.globalAlpha = isHighlighter ? 0.45 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = (isHighlighter ? Math.max(10, baseWidth * 2.5) : baseWidth) * pFactor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!isPenModeRef.current) return;
      // Crucial: prevent scroll/zoom on touch devices
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      pushHistory();
      isDrawing.current = true;
      lastPos.current = getPosFromEvent(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPenModeRef.current || !isDrawing.current || !lastPos.current) return;
      e.preventDefault();
      // getCoalescedEvents() returns all sub-events between frames for smoother drawing
      const events = (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() : [e];
      for (const ev of events) {
        const current = getPosFromEvent(ev);
        drawStroke(lastPos.current, current, ev.pressure ?? 0.5);
        lastPos.current = current;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      isDrawing.current = false;
      lastPos.current = null;
    };

    // Must use { passive: false } so preventDefault() works on touch devices
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
    canvas.addEventListener('pointerleave', onPointerUp, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, []); // Mount once — reads latest state via refs

  return (
    <div
      id={id}
      ref={containerRef}
      className="relative flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden transition-all group select-none"
    >
      {/* Top Header Badge */}
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
        {hasBgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: `url(${data.bgImage})` }}
          />
        )}
        {hasBgImage && hasContent && (
          <div className="absolute inset-0 bg-slate-900/30 z-0" />
        )}

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
          <div className="relative z-10 h-48 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200/40 rounded-xl">
            <p className="text-xs font-medium opacity-60">마크다운을 입력하면 실시간으로 렌더링됩니다.</p>
          </div>
        ) : null}
      </div>

      {/* Pen Drawing Canvas Overlay
          - touch-action:none prevents scroll hijacking on mobile when pen is active
          - Pointer events are registered via native addEventListener (not React) for proper preventDefault support */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 z-20 rounded-xl"
        style={{
          pointerEvents: isPenMode ? 'all' : 'none',
          cursor: isPenMode ? 'crosshair' : 'default',
          touchAction: 'none', // Always none — prevents scroll before JS checks isPenMode
        }}
      />

      {/* Pen active indicator ring */}
      {isPenMode && (
        <div className="absolute inset-0 z-20 rounded-xl ring-2 ring-yellow-400 ring-offset-0 pointer-events-none" />
      )}

      {/* Bottom Footer */}
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
