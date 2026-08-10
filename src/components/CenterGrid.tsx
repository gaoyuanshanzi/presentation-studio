'use client';

import React from 'react';
import MasterEditor from './MasterEditor';
import SlaveViewer from './SlaveViewer';
import { Slide } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CenterGridProps {
  currentSlide: Slide;
  currentSlideIndex: number;
  totalSlides: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onUpdateMaster1: (updated: Partial<Slide['master1']>) => void;
  onUpdateMaster2: (updated: Partial<Slide['master2']>) => void;
  onOpenImageSearch: () => void;
  /** Pen drawing props passed through to SlaveViewers */
  isPenMode?: boolean;
  penColor?: string;
  penSize?: 'fine' | 'medium' | 'thick';
  /** When this string changes, all drawing canvases are cleared */
  clearTrigger?: string;
  undoTrigger?: number;
  clearAllTrigger?: number;
}

export default function CenterGrid({
  currentSlide,
  currentSlideIndex,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  onUpdateMaster1,
  onUpdateMaster2,
  onOpenImageSearch,
  isPenMode = false,
  penColor = '#facc15',
  penSize = 'fine',
  clearTrigger,
  undoTrigger,
  clearAllTrigger,
}: CenterGridProps) {
  const hasPrev = currentSlideIndex > 0;
  const hasNext = currentSlideIndex < totalSlides - 1;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-3 md:p-4 gap-3 md:gap-4 bg-slate-100/70">
      {/* Top Row: Dual Presentation Slave Viewers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 min-h-[320px] lg:h-1/2">
        {/* ①_slave (Left Presentation View) */}
        <div className="h-full">
          <SlaveViewer
            id="slave-view-1"
            title="슬라이드 1 뷰어"
            badgeText="①_slave"
            badgeColor="bg-blue-600 text-white"
            data={currentSlide.master1}
            showPlaceholder={true}
            isPenMode={isPenMode}
            penColor={penColor}
            penSize={penSize}
            clearTrigger={clearTrigger}
            undoTrigger={undoTrigger}
            clearAllTrigger={clearAllTrigger}
          />
        </div>

        {/* ②_slave (Right Presentation View with Previous / Next Buttons) */}
        <div className="h-full relative">
          {/* Previous / Next Slide Nav Bar floating at top right of ②_slave */}
          <div className="absolute top-3 right-3 z-40 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-md">
            <span className="text-[11px] font-bold text-slate-600 px-2 font-mono">
              {currentSlideIndex + 1} / {totalSlides}
            </span>

            <button
              onClick={onPrevSlide}
              disabled={!hasPrev}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 text-slate-700 flex items-center gap-1 transition-all shadow-sm"
              title="이전 슬라이드로 이동 (Previous)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={onNextSlide}
              disabled={!hasNext}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 text-slate-700 flex items-center gap-1 transition-all shadow-sm"
              title="다음 슬라이드로 이동 (Next)"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <SlaveViewer
            id="slave-view-2"
            title="슬라이드 2 뷰어"
            badgeText="②_slave"
            badgeColor="bg-indigo-600 text-white"
            data={currentSlide.master2}
            showPlaceholder={false}
            isPenMode={isPenMode}
            penColor={penColor}
            penSize={penSize}
            clearTrigger={clearTrigger}
            undoTrigger={undoTrigger}
            clearAllTrigger={clearAllTrigger}
          />
        </div>
      </div>

      {/* Bottom Row: Dual Master Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 min-h-[300px] lg:h-1/2">
        {/* ①_master (Left Editor) */}
        <div className="h-full">
          <MasterEditor
            title="좌측 마크다운 에디터"
            badgeText="①_master"
            badgeColor="bg-blue-100 text-blue-700"
            data={currentSlide.master1}
            onChange={onUpdateMaster1}
            hasImageFeature={false}
          />
        </div>

        {/* ②_master (Right Editor) */}
        <div className="h-full">
          <MasterEditor
            title="우측 마크다운 & 이미지 에디터"
            badgeText="②_master"
            badgeColor="bg-indigo-100 text-indigo-700"
            data={currentSlide.master2}
            onChange={onUpdateMaster2}
            onOpenImageSearch={onOpenImageSearch}
            hasImageFeature={true}
          />
        </div>
      </div>
    </div>
  );
}
