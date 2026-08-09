'use client';

import React, { useState, useEffect } from 'react';
import LoginModal from '@/components/LoginModal';
import LeftSidebar from '@/components/LeftSidebar';
import CenterGrid from '@/components/CenterGrid';
import RightSidebar from '@/components/RightSidebar';
import ImageSearchModal from '@/components/ImageSearchModal';
import VercelNeonGuideModal from '@/components/VercelNeonGuideModal';
import { Slide, Project, RecordingItem } from '@/types';

// Default initial presentation sample slide
const initialSlide: Slide = {
  id: 'slide-1',
  pageNumber: 1,
  master1: {
    content: `# 웹 기반 프레젠테이션 스튜디오\n\n- **화이트 모드 UI** 최적화\n- **실시간 마크다운 렌더링** Sync\n- 슬라이드 1~100장 생성 및 관리`,
    bgColor: '#ffffff',
    textColor: '#0f172a'
  },
  master2: {
    content: `# 비주얼 오버레이 슬라이드\n\n> 별도의 API Key 없이도 웹 공개 이미지를 검색하여 배경으로 적용할 수 있습니다.`,
    bgColor: '#f8fafc',
    textColor: '#ffffff',
    bgImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
  }
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Slides State
  const [slides, setSlides] = useState<Slide[]>([initialSlide]);
  const [activeSlideId, setActiveSlideId] = useState<string>('slide-1');
  const [projectName, setProjectName] = useState<string>('신규 프레젠테이션 프로젝트');

  // DB Sync State
  const [neonProjects, setNeonProjects] = useState<Project[]>([]);
  const [neonRecordings, setNeonRecordings] = useState<RecordingItem[]>([]);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  // Modals
  const [isImageSearchOpen, setIsImageSearchOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Check DB Connection & Init Tables on Mount
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/db-init');
        const data = await res.json();
        setDbConnected(!!data.connected);
      } catch (err) {
        console.warn('DB status check notice:', err);
        setDbConnected(false);
      }
    }
    checkDb();
  }, []);

  // Fetch Projects from Neon DB
  const refreshNeonProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects) {
        setNeonProjects(data.projects);
      }
      setDbConnected(!!data.dbConnected);
    } catch (err) {
      console.warn('Fetch neon projects error:', err);
    }
  };

  // Fetch Recordings from Neon DB
  const refreshNeonRecordings = async () => {
    try {
      const res = await fetch('/api/recordings');
      const data = await res.json();
      if (data.recordings) {
        setNeonRecordings(data.recordings);
      }
      setDbConnected(!!data.dbConnected);
    } catch (err) {
      console.warn('Fetch neon recordings error:', err);
    }
  };

  useEffect(() => {
    refreshNeonProjects();
    refreshNeonRecordings();
  }, []);

  // Get active slide
  const currentSlide = slides.find((s) => s.id === activeSlideId) || slides[0];

  // Pen drawing tool state
  const [isPenMode, setIsPenMode] = useState(false);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState<'fine' | 'medium' | 'thick'>('fine');
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [clearAllTrigger, setClearAllTrigger] = useState(0);

  // Master 1 & 2 Update Handlers
  const handleUpdateMaster1 = (updated: Partial<Slide['master1']>) => {
    setSlides((prev) =>
      prev.map((s) =>
        s.id === activeSlideId
          ? { ...s, master1: { ...s.master1, ...updated } }
          : s
      )
    );
  };

  const handleUpdateMaster2 = (updated: Partial<Slide['master2']>) => {
    setSlides((prev) =>
      prev.map((s) =>
        s.id === activeSlideId
          ? { ...s, master2: { ...s.master2, ...updated } }
          : s
      )
    );
  };

  // Slide Management (Max 100 Slides)
  const handleAddSlide = () => {
    if (slides.length >= 100) {
      alert('슬라이드는 최대 100장까지 생성 가능합니다.');
      return;
    }
    const newPageNumber = slides.length + 1;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      pageNumber: newPageNumber,
      master1: {
        content: `# Page ${newPageNumber} 제목\n\n내용을 입력하세요...`,
        bgColor: '#ffffff',
        textColor: '#0f172a'
      },
      master2: {
        content: `# Page ${newPageNumber} 우측 서브 제목\n\n배경 이미지 및 서식을 편집해보세요.`,
        bgColor: '#ffffff',
        textColor: '#0f172a'
      }
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
  };

  const handleDuplicateSlide = (id: string) => {
    if (slides.length >= 100) {
      alert('슬라이드는 최대 100장까지 생성 가능합니다.');
      return;
    }
    const target = slides.find((s) => s.id === id);
    if (!target) return;

    const newSlide: Slide = {
      ...JSON.parse(JSON.stringify(target)),
      id: `slide-${Date.now()}`,
      pageNumber: slides.length + 1
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
  };

  const handleDeleteSlide = (id: string) => {
    if (slides.length <= 1) {
      alert('최소 1장의 슬라이드는 유지되어야 합니다.');
      return;
    }
    const filtered = slides.filter((s) => s.id !== id);
    // Recalculate page numbers
    const updatedSlides = filtered.map((s, idx) => ({ ...s, pageNumber: idx + 1 }));
    setSlides(updatedSlides);
    if (activeSlideId === id) {
      setActiveSlideId(updatedSlides[0].id);
    }
  };

  // Reorder Slides Handler
  const handleReorderSlides = (reordered: Slide[]) => {
    setSlides(reordered);
    // Keep activeSlideId unchanged (it stays valid after reorder)
  };

  // Import Project Handler
  const handleImportProject = (importedSlides: Slide[], name: string) => {
    if (importedSlides.length > 0) {
      setSlides(importedSlides);
      setProjectName(name);
      setActiveSlideId(importedSlides[0].id);
    }
  };

  // Save Project Zip to Neon DB
  const handleSaveToNeonDb = async (zipBase64: string, customName?: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `proj-${Date.now()}`,
          name: customName || projectName,
          slides,
          zipBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Neon DB에 프로젝트가 저장되었습니다.');
        refreshNeonProjects();
        return true;
      } else {
        alert(`저장 실패: ${data.error || data.message}`);
        return false;
      }
    } catch (err) {
      console.error('Save to Neon error:', err);
      alert('Neon DB 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  // Delete Project from Neon DB
  const handleDeleteFromNeonDb = async (id: string) => {
    if (!confirm('해당 프로젝트를 Neon DB에서 완전히 삭제하시겠습니까? (용량이 완전 해제됩니다)')) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('프로젝트가 완전히 삭제되었습니다.');
        refreshNeonProjects();
      }
    } catch (err) {
      console.error('Delete project error:', err);
    }
  };

  // Save MP4 to Neon DB
  const handleSaveRecordingToNeonDb = async (title: string, duration: number, videoData: string) => {
    try {
      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `rec-${Date.now()}`,
          title,
          duration,
          videoData
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'MP4 동영상이 Neon DB에 저장되었습니다.');
        refreshNeonRecordings();
        return true;
      } else {
        alert(`저장 실패: ${data.error || data.message}`);
        return false;
      }
    } catch (err) {
      console.error('Save recording error:', err);
      alert('Neon DB MP4 저장 오류');
      return false;
    }
  };

  // Delete Recording from Neon DB
  const handleDeleteRecordingFromNeonDb = async (id: string) => {
    if (!confirm('해당 MP4 동영상을 Neon DB에서 완전히 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/recordings?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('동영상이 DB에서 완전히 삭제되었습니다.');
        refreshNeonRecordings();
      }
    } catch (err) {
      console.error('Delete recording error:', err);
    }
  };

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col bg-slate-100">
      {/* 1. Admin Login Gate Modal (User inputs admin / 123jesus) */}
      {!isAuthenticated && (
        <LoginModal onLoginSuccess={() => setIsAuthenticated(true)} />
      )}

      {/* Main Studio Studio App Layout */}
      {isAuthenticated && (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left Sidebar: Neon DB Directory & Slides 1-100 */}
          <LeftSidebar
            slides={slides}
            activeSlideId={activeSlideId}
            onSelectSlide={setActiveSlideId}
            onAddSlide={handleAddSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onReorderSlides={handleReorderSlides}
            onImportProject={handleImportProject}
            projectName={projectName}
            setProjectName={setProjectName}
            neonProjects={neonProjects}
            dbConnected={dbConnected}
            onRefreshDbProjects={refreshNeonProjects}
            onSaveToNeonDb={handleSaveToNeonDb}
            onDeleteFromNeonDb={handleDeleteFromNeonDb}
            onOpenGuideModal={() => setIsGuideModalOpen(true)}
          />

          {/* Center 2x2 Grid Layout: ①_slave, ②_slave, ①_master, ②_master */}
          <CenterGrid
            currentSlide={currentSlide}
            onUpdateMaster1={handleUpdateMaster1}
            onUpdateMaster2={handleUpdateMaster2}
            onOpenImageSearch={() => setIsImageSearchOpen(true)}
            isPenMode={isPenMode}
            penColor={penColor}
            penSize={penSize}
            clearTrigger={activeSlideId}
            undoTrigger={undoTrigger}
            clearAllTrigger={clearAllTrigger}
          />

          {/* Right Sidebar: Screen/Audio Recorder & Neon MP4 Storage */}
          <RightSidebar
            neonRecordings={neonRecordings}
            dbConnected={dbConnected}
            onRefreshRecordings={refreshNeonRecordings}
            onSaveRecordingToNeonDb={handleSaveRecordingToNeonDb}
            onDeleteRecordingFromNeonDb={handleDeleteRecordingFromNeonDb}
            onOpenGuideModal={() => setIsGuideModalOpen(true)}
            isPenMode={isPenMode}
            penColor={penColor}
            penSize={penSize}
            onTogglePen={() => setIsPenMode((v) => !v)}
            onChangePenColor={setPenColor}
            onChangePenSize={setPenSize}
            onUndoLastStroke={() => setUndoTrigger((v) => v + 1)}
            onClearAllStrokes={() => setClearAllTrigger((v) => v + 1)}
          />

          {/* Image Search Modal */}
          <ImageSearchModal
            isOpen={isImageSearchOpen}
            onClose={() => setIsImageSearchOpen(false)}
            onSelectImage={(url) => handleUpdateMaster2({ bgImage: url })}
          />

          {/* Vercel & Neon Guide Modal */}
          <VercelNeonGuideModal
            isOpen={isGuideModalOpen}
            onClose={() => setIsGuideModalOpen(false)}
            dbConnected={dbConnected}
          />
        </div>
      )}
    </main>
  );
}
