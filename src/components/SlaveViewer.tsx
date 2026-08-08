'use client';

import React from 'react';
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
  /** When false and content is empty, shows only background (no placeholder hint box). Default: true */
  showPlaceholder?: boolean;
}

export default function SlaveViewer({
  id,
  title,
  badgeText,
  badgeColor,
  data,
  isRecordingTarget = true,
  showPlaceholder = true
}: SlaveViewerProps) {
  const hasBgImage = Boolean(data.bgImage);

  return (
    <div
      id={id}
      className="relative flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden transition-all group select-none"
    >
      {/* Top Header Badge - Excluded during PNG Export */}
      <div
        data-export-ignore="true"
        className="export-ignore-ui absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none"
      >
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md shadow-sm ${badgeColor}`}>
          {badgeText}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-md border border-slate-200 text-slate-700 shadow-sm">
          {title}
        </span>
      </div>

      {/* Background Image / Color Container */}
      <div
        className="relative flex-1 w-full h-full p-8 md:p-12 flex flex-col justify-center overflow-auto transition-colors duration-300"
        style={{
          backgroundColor: data.bgColor || '#ffffff',
          color: data.textColor || '#0f172a'
        }}
      >
        {/* Background Image Layer if present */}
        {hasBgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500 z-0"
            style={{ backgroundImage: `url(${data.bgImage})` }}
          >
            {/* Soft overlay mask for contrast readability */}
            <div className="absolute inset-0 bg-slate-900/30 backdrop-brightness-95" />
          </div>
        )}

        {/* Rendered Markdown Content Layer */}
        <div
          className={`relative z-10 w-full max-w-2xl mx-auto rounded-2xl transition-all ${
            hasBgImage ? 'p-6 bg-slate-950/40 backdrop-blur-md border border-white/20 text-white shadow-xl' : ''
          }`}
          style={!hasBgImage ? { color: data.textColor || '#0f172a' } : undefined}
        >
          {data.content.trim() ? (
            <div className="slide-markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.content}
              </ReactMarkdown>
            </div>
          ) : showPlaceholder ? (
            // ①_slave: show subtle hint when empty
            <div className="h-48 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-200/40 rounded-xl">
              <p className="text-xs font-medium opacity-60">마크다운을 입력하면 실시간으로 렌더링됩니다.</p>
            </div>
          ) : null /* ②_slave with no content: show only clean background */}
        </div>
      </div>

      {/* Bottom Footer Info Bar - Excluded during PNG Export */}
      <div
        data-export-ignore="true"
        className="export-ignore-ui px-4 py-1.5 bg-slate-50/80 backdrop-blur-sm border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400 z-20"
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
