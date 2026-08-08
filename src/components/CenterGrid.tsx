'use client';

import React from 'react';
import MasterEditor from './MasterEditor';
import SlaveViewer from './SlaveViewer';
import { Slide } from '@/types';

interface CenterGridProps {
  currentSlide: Slide;
  onUpdateMaster1: (updated: Partial<Slide['master1']>) => void;
  onUpdateMaster2: (updated: Partial<Slide['master2']>) => void;
  onOpenImageSearch: () => void;
}

export default function CenterGrid({
  currentSlide,
  onUpdateMaster1,
  onUpdateMaster2,
  onOpenImageSearch
}: CenterGridProps) {
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
          />
        </div>

        {/* ②_slave (Right Presentation View) */}
        <div className="h-full">
          <SlaveViewer
            id="slave-view-2"
            title="슬라이드 2 뷰어"
            badgeText="②_slave"
            badgeColor="bg-indigo-600 text-white"
            data={currentSlide.master2}
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
