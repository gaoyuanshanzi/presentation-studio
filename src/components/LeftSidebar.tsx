'use client';

import React, { useState, useRef } from 'react';
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Database,
  FileCode2,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  HardDrive
} from 'lucide-react';
import { Slide, Project } from '@/types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

interface LeftSidebarProps {
  slides: Slide[];
  activeSlideId: string;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (id: string) => void;
  onDeleteSlide: (id: string) => void;
  onImportProject: (slides: Slide[], name: string) => void;
  projectName: string;
  setProjectName: (name: string) => void;
  neonProjects: Project[];
  dbConnected: boolean;
  onRefreshDbProjects: () => void;
  onSaveToNeonDb: (zipBase64: string) => Promise<boolean>;
  onDeleteFromNeonDb: (id: string) => Promise<void>;
  onOpenGuideModal: () => void;
}

export default function LeftSidebar({
  slides,
  activeSlideId,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onImportProject,
  projectName,
  setProjectName,
  neonProjects,
  dbConnected,
  onRefreshDbProjects,
  onSaveToNeonDb,
  onDeleteFromNeonDb,
  onOpenGuideModal
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<'slides' | 'directory'>('slides');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingZipBase64, setPendingZipBase64] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Zip containing high-res rendered PNGs and raw markdown slides.json
  const generateProjectZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('rendered_slides');

      // Render active elements or generate canvas images
      const slave1 = document.getElementById('slave-view-1');
      const slave2 = document.getElementById('slave-view-2');

      if (slave1 && slave2 && imagesFolder) {
        try {
          const canvas1 = await html2canvas(slave1, { scale: 2, useCORS: true, logging: false });
          const canvas2 = await html2canvas(slave2, { scale: 2, useCORS: true, logging: false });

          const imgData1 = canvas1.toDataURL('image/png').split(',')[1];
          const imgData2 = canvas2.toDataURL('image/png').split(',')[1];

          imagesFolder.file(`slide_active_slave1.png`, imgData1, { base64: true });
          imagesFolder.file(`slide_active_slave2.png`, imgData2, { base64: true });
        } catch (e) {
          console.warn('Canvas rendering notice:', e);
        }
      }

      // Add slides.json
      const projectMeta = {
        name: projectName || 'Untiled Presentation',
        exportedAt: new Date().toISOString(),
        slideCount: slides.length,
        slides: slides
      };

      zip.file('slides.json', JSON.stringify(projectMeta, null, 2));

      // Generate Zip Blob & Base64
      const blob = await zip.generateAsync({ type: 'blob' });
      const base64 = await zip.generateAsync({ type: 'base64' });

      setPendingBlob(blob);
      setPendingZipBase64(base64);
      setShowExportModal(true);
    } catch (err) {
      console.error('ZIP generation error:', err);
      alert('프로젝트 ZIP 파일 생성에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadLocalZip = () => {
    if (pendingBlob) {
      saveAs(pendingBlob, `${projectName.replace(/\s+/g, '_')}_project.zip`);
      setShowExportModal(false);
    }
  };

  const handleSaveZipToNeon = async () => {
    if (pendingZipBase64) {
      const success = await onSaveToNeonDb(pendingZipBase64);
      if (success) {
        setShowExportModal(false);
        onRefreshDbProjects();
      }
    }
  };

  // Local Zip File Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const slidesJsonFile = zip.file('slides.json');

      if (!slidesJsonFile) {
        alert('올바른 프로젝트 ZIP 파일이 아닙니다. (slides.json 미포함)');
        return;
      }

      const jsonText = await slidesJsonFile.async('string');
      const parsedData = JSON.parse(jsonText);

      if (parsedData && Array.isArray(parsedData.slides)) {
        onImportProject(parsedData.slides, parsedData.name || file.name.replace('.zip', ''));
        alert(`프로젝트 "${parsedData.name || file.name}"를 성공적으로 불러왔습니다.`);
      } else {
        alert('유효하지 않은 장표 데이터 형식입니다.');
      }
    } catch (err) {
      console.error('Import ZIP error:', err);
      alert('ZIP 파일 불러오기 실패');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-full select-none shadow-sm z-10">
      {/* Top Header & DB Status */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              P
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm leading-tight">Presentation Matrix</h1>
              <p className="text-[10px] text-slate-500 font-medium">White Mode Studio v1.0</p>
            </div>
          </div>

          {/* Database Connection Badge */}
          <button
            onClick={onOpenGuideModal}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 transition-all ${
              dbConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="Neon DB 연동 및 배포 설정 안내"
          >
            <Database className="w-3 h-3" />
            <span>{dbConnected ? 'Neon DB Online' : 'Neon DB Standby'}</span>
          </button>
        </div>

        {/* Project Name Editable Field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="프로젝트 제목 입력..."
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-2 gap-1 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('slides')}
          className={`flex-1 py-2 px-3 rounded-t-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'slides'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'hover:bg-slate-50 text-slate-500'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>장표 (1~100)</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {slides.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('directory');
            onRefreshDbProjects();
          }}
          className={`flex-1 py-2 px-3 rounded-t-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'directory'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'hover:bg-slate-50 text-slate-500'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Neon DB Directory</span>
        </button>
      </div>

      {/* Tab 1: Slide Thumbnails List */}
      {activeTab === 'slides' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>장표 목록 (최대 100 Page)</span>
            <button
              onClick={onAddSlide}
              disabled={slides.length >= 100}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>

          {slides.map((slide, index) => {
            const isActive = slide.id === activeSlideId;
            return (
              <div
                key={slide.id}
                onClick={() => onSelectSlide(slide.id)}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    Page {index + 1}
                  </span>

                  {/* Duplicate & Delete Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSlide(slide.id);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                      title="슬라이드 복제"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSlide(slide.id);
                        }}
                        className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-500 transition-colors"
                        title="슬라이드 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Thumbnail Mini Dual Preview */}
                <div className="grid grid-cols-2 gap-1.5 h-16 rounded-lg overflow-hidden bg-slate-100 p-1 border border-slate-200">
                  <div
                    className="h-full rounded p-1 text-[8px] overflow-hidden truncate"
                    style={{
                      backgroundColor: slide.master1.bgColor || '#ffffff',
                      color: slide.master1.textColor || '#0f172a'
                    }}
                  >
                    <span className="font-bold text-[7px] bg-blue-100 text-blue-700 px-1 rounded block mb-0.5">①</span>
                    {slide.master1.content || '내용 없음'}
                  </div>
                  <div
                    className="h-full rounded p-1 text-[8px] overflow-hidden truncate relative"
                    style={{
                      backgroundColor: slide.master2.bgColor || '#ffffff',
                      color: slide.master2.textColor || '#0f172a'
                    }}
                  >
                    {slide.master2.bgImage && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-40"
                        style={{ backgroundImage: `url(${slide.master2.bgImage})` }}
                      />
                    )}
                    <span className="font-bold text-[7px] bg-indigo-100 text-indigo-700 px-1 rounded block mb-0.5 relative z-10">②</span>
                    <span className="relative z-10">{slide.master2.content || '내용 없음'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Neon DB Directory */}
      {activeTab === 'directory' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold flex items-center gap-1 text-slate-700">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Neon DB Saved Projects
            </span>
            <button
              onClick={onRefreshDbProjects}
              className="text-[11px] text-blue-600 font-semibold hover:underline"
            >
              새로고침
            </button>
          </div>

          {neonProjects.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl bg-white space-y-2">
              <HardDrive className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300" />
              <p>Neon DB에 저장된 프로젝트가 없습니다.</p>
              <p className="text-[10px] text-slate-400">하단 [Export] 기능으로 프로젝트를 저장할 수 있습니다.</p>
            </div>
          ) : (
            neonProjects.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 truncate">{p.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                    {p.slides?.length || 1} Pages
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '최근 저장'}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (p.slides && p.slides.length > 0) {
                        onImportProject(p.slides, p.name);
                      }
                    }}
                    className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <span>불러오기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteFromNeonDb(p.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Neon DB에서 완전 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer Import / Export Actions */}
      <div className="p-3 border-t border-slate-200 bg-white space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".zip"
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          {/* Export button */}
          <button
            onClick={generateProjectZip}
            disabled={isExporting}
            className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>ZIP Export</span>
          </button>

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-slate-500" />}
            <span>ZIP Import</span>
          </button>
        </div>
      </div>

      {/* Export Options Choice Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">프로젝트 Export 저장 선택</h3>
                <p className="text-xs text-slate-500">장표 마크다운 원본과 이미지를 ZIP으로 묶었습니다.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadLocalZip}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>로컬 PC로 ZIP 다운로드</span>
              </button>

              <button
                onClick={handleSaveZipToNeon}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                <Database className="w-4 h-4" />
                <span>Neon DB에 프로젝트 저장</span>
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium text-center"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
