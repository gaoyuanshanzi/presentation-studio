'use client';

import React, { useRef } from 'react';
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
  isPenMode?: boolean;
  penColor?: string;
  penSize?: 'fine' | 'medium' | 'thick';
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

  // Ref for horizontal scroll container (mobile)
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToPanel = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const panelWidth = container.clientWidth;
    container.scrollTo({ left: index * panelWidth, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100/70">

      {/* ────────── MOBILE LAYOUT (< md) ────────── */}
      {/* Horizontal slide-scroll: [①_slave + ①_master] swipe → [②_slave + ②_master] */}
      <div className="flex flex-col h-full md:hidden">

        {/* Slide-set Indicator + Prev/Next nav bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollToPanel(0)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm"
            >
              ① 1번 슬라이드
            </button>
            <button
              onClick={() => scrollToPanel(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm"
            >
              ② 2번 슬라이드
            </button>
          </div>

          {/* Slide page navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-600 px-1.5 font-mono">
              {currentSlideIndex + 1}/{totalSlides}
            </span>
            <button
              onClick={onPrevSlide}
              disabled={!hasPrev}
              className="p-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white disabled:opacity-30 text-slate-700 transition-all shadow-sm"
              title="이전 장표"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextSlide}
              disabled={!hasNext}
              className="p-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white disabled:opacity-30 text-slate-700 transition-all shadow-sm"
              title="다음 장표"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontally scrollable panel container — snap to each panel */}
        <div
          ref={scrollRef}
          className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {/* Panel ①: ①_slave + ①_master stacked vertically */}
          <div
            className="flex-shrink-0 w-full h-full flex flex-col gap-3 p-3 snap-start overflow-y-auto"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* ①_slave */}
            <div className="min-h-[240px] flex-shrink-0">
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

            {/* ①_master */}
            <div className="min-h-[260px] flex-shrink-0">
              <MasterEditor
                title="좌측 마크다운 에디터"
                badgeText="①_master"
                badgeColor="bg-blue-100 text-blue-700"
                data={currentSlide.master1}
                onChange={onUpdateMaster1}
                hasImageFeature={false}
              />
            </div>
          </div>

          {/* Panel ②: ②_slave + ②_master stacked vertically */}
          <div
            className="flex-shrink-0 w-full h-full flex flex-col gap-3 p-3 snap-start overflow-y-auto"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* ②_slave */}
            <div className="min-h-[240px] flex-shrink-0">
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

            {/* ②_master */}
            <div className="min-h-[260px] flex-shrink-0">
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
      </div>

      {/* ────────── DESKTOP LAYOUT (≥ md) ────────── */}
      {/* 2×2 grid: top row = slaves, bottom row = editors */}
      <div className="hidden md:flex flex-col flex-1 h-full overflow-y-auto p-4 gap-4">
        {/* Top Row: Dual Slave Viewers */}
        <div className="grid grid-cols-2 gap-4 min-h-[320px] lg:h-1/2">
          {/* ①_slave */}
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

          {/* ②_slave with Previous / Next Nav */}
          <div className="h-full relative">
            <div className="absolute top-3 right-3 z-40 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-md">
              <span className="text-[11px] font-bold text-slate-600 px-2 font-mono">
                {currentSlideIndex + 1} / {totalSlides}
              </span>
              <button
                onClick={onPrevSlide}
                disabled={!hasPrev}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 text-slate-700 flex items-center gap-1 transition-all shadow-sm"
                title="이전 슬라이드"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={onNextSlide}
                disabled={!hasNext}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-400 text-slate-700 flex items-center gap-1 transition-all shadow-sm"
                title="다음 슬라이드"
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
        <div className="grid grid-cols-2 gap-4 min-h-[300px] lg:h-1/2">
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
    </div>
  );
}
