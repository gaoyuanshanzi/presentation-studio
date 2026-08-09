'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  HardDrive,
  GripVertical,
  Globe,
  Stamp,
  X,
  CheckSquare,
  Square,
  FileType
} from 'lucide-react';
import { Slide, Project } from '@/types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { renderSlideToCombinedCanvas } from '@/lib/exporter';
import { WATERMARK_KO_BASE64 } from './watermarkKoData';
import { WATERMARK_EN_BASE64 } from './watermarkEnData';

interface LeftSidebarProps {
  slides: Slide[];
  activeSlideId: string;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (id: string) => void;
  onDeleteSlide: (id: string) => void;
  onReorderSlides: (reordered: Slide[]) => void;
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
  onReorderSlides,
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
  const [mounted, setMounted] = useState(false);

  // Export options state (default ZIP: true, HTML: false, Watermark: false)
  const [exportFormats, setExportFormats] = useState<{ zip: boolean; html: boolean }>({ zip: true, html: false });
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkLang, setWatermarkLang] = useState<'ko' | 'en'>('ko');

  // Drag state for slide reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Drag & Drop Reorder ────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...slides];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const renumbered = reordered.map((s, i) => ({ ...s, pageNumber: i + 1 }));
    onReorderSlides(renumbered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Robust Watermark Helper ─────────────────────────────────────────
  const drawWatermarkOnCanvas = (canvas: HTMLCanvasElement, lang: 'ko' | 'en'): Promise<HTMLCanvasElement> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(canvas);
    const wmDataUrl = lang === 'ko' ? WATERMARK_KO_BASE64 : WATERMARK_EN_BASE64;
    return new Promise<HTMLCanvasElement>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // High visibility dimensions on 1920x1080 canvas
        const targetW = 440;
        const aspect = img.height > 0 ? img.height / img.width : 0.25;
        const targetH = targetW * aspect;
        const padding = 32;
        const x = padding;
        const y = canvas.height - targetH - padding;

        ctx.save();
        // Background container badge for max contrast
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        const bgPad = 14;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x - bgPad, y - bgPad, targetW + bgPad * 2, targetH + bgPad * 2, 14);
          ctx.fill();
        } else {
          ctx.fillRect(x - bgPad, y - bgPad, targetW + bgPad * 2, targetH + bgPad * 2);
        }

        // Draw watermark image
        ctx.drawImage(img, x, y, targetW, targetH);
        ctx.restore();

        resolve(canvas);
      };
      img.onerror = (err) => {
        console.error('Watermark load failed:', err);
        resolve(canvas);
      };
      img.src = wmDataUrl;
    });
  };

  // ── HTML Export Generator ──────────────────────────────────────────
  const generateHtmlExport = (
    slideImages: { page: number; dataUrl: string }[],
    projectMeta: any
  ): string => {
    const slideHtml = slideImages
      .map(
        ({ page, dataUrl }) => `
    <section class="slide-page" id="slide-${page}">
      <div class="slide-wrapper">
        <img src="${dataUrl}" alt="Slide ${page}" class="slide-img"/>
        <div class="slide-num">Page ${page}</div>
      </div>
    </section>`
      )
      .join('\n');

    const jsonMetaString = JSON.stringify(projectMeta);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${projectName || 'Presentation'} - HTML Export</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0f172a; color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .header { background:#1e293b; color:#f1f5f9; padding:20px 32px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #334155; position:sticky; top:0; z-index:100; }
    .header h1 { font-size:20px; font-weight:700; }
    .header p { font-size:12px; color:#94a3b8; margin-top:2px; }
    .slides-container { max-width:1280px; margin:0 auto; padding:40px 20px; display:flex; flex-direction:column; gap:40px; }
    .slide-page { position:relative; border-radius:16px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.5); border:1px solid #334155; background:#000; }
    .slide-wrapper { position:relative; width:100%; }
    .slide-img { width:100%; height:auto; display:block; }
    .slide-num { position:absolute; bottom:16px; right:20px; background:rgba(15,23,42,0.85); color:#f1f5f9; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.1); }
    .nav { position:fixed; bottom:28px; right:28px; display:flex; flex-direction:column; gap:10px; z-index:100; }
    .nav a { background:#3b82f6; color:#fff; padding:12px 22px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:600; text-align:center; box-shadow:0 4px 14px rgba(59,130,246,0.4); transition:all 0.2s; }
    .nav a:hover { background:#2563eb; transform:translateY(-2px); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${projectName || 'Presentation Matrix'}</h1>
      <p>HTML Presentation Export — ${new Date().toLocaleString()} | Total ${slideImages.length} Slides</p>
    </div>
  </div>
  <div class="slides-container">
    ${slideHtml}
  </div>
  <div class="nav">
    <a href="#slide-1">↑ 처음으로</a>
  </div>
  <!-- Embedded Presentation Matrix Slide Metadata for Re-import -->
  <script id="presentation-matrix-data" type="application/json">
    ${jsonMetaString}
  </script>
</body>
</html>`;
  };

  // ── Core Export Process ──
  const executeExportProcess = async (): Promise<{ blob: Blob | null; zipBase64: string | null; htmlContent: string | null }> => {
    const zip = new JSZip();
    const imagesFolder = zip.folder('rendered_slides');
    const slideImages: { page: number; dataUrl: string }[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      try {
        let canvas = await renderSlideToCombinedCanvas(slide);
        if (watermarkEnabled) {
          canvas = await drawWatermarkOnCanvas(canvas, watermarkLang);
        }
        const dataUrl = canvas.toDataURL('image/png');
        const imgData = dataUrl.split(',')[1];
        const pageNumStr = String(i + 1).padStart(2, '0');
        if (imagesFolder) {
          imagesFolder.file(`slide_${pageNumStr}_combined_1920x1080.png`, imgData, { base64: true });
        }
        slideImages.push({ page: i + 1, dataUrl });
      } catch (e) {
        console.warn(`Canvas rendering error for slide page ${i + 1}:`, e);
      }
    }

    const projectMeta = {
      name: projectName || 'Untitled Presentation',
      exportedAt: new Date().toISOString(),
      slideCount: slides.length,
      slides: slides
    };
    zip.file('slides.json', JSON.stringify(projectMeta, null, 2));

    let htmlContent: string | null = null;
    if (exportFormats.html) {
      htmlContent = generateHtmlExport(slideImages, projectMeta);
      zip.file('index.html', htmlContent);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    return { blob, zipBase64, htmlContent };
  };

  // Handle Download to Local PC
  const handleDownloadToLocal = async () => {
    if (!exportFormats.zip && !exportFormats.html) {
      alert('저장 형식(ZIP 또는 HTML)을 최소 하나 이상 선택해 주세요.');
      return;
    }
    setIsExporting(true);
    try {
      const { blob, htmlContent } = await executeExportProcess();
      const safeProjectName = projectName.replace(/\s+/g, '_') || 'presentation';

      if (exportFormats.zip && blob) {
        saveAs(blob, `${safeProjectName}_project.zip`);
      }
      if (exportFormats.html && htmlContent) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        saveAs(htmlBlob, `${safeProjectName}_presentation.html`);
      }
      setShowExportModal(false);
    } catch (err) {
      console.error('Export download error:', err);
      alert('파일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Save to Neon DB
  const handleSaveToNeonDbAction = async () => {
    setIsExporting(true);
    try {
      const { zipBase64 } = await executeExportProcess();
      if (zipBase64) {
        const success = await onSaveToNeonDb(zipBase64);
        if (success) {
          setShowExportModal(false);
          onRefreshDbProjects();
        }
      }
    } catch (err) {
      console.error('Save to Neon error:', err);
      alert('Neon DB 저장 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import Handler (Supports ZIP and HTML Files) ─────────────────────
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const fileNameLower = file.name.toLowerCase();

      // Case 1: Import HTML File (.html, .htm)
      if (fileNameLower.endsWith('.html') || fileNameLower.endsWith('.htm')) {
        const textContent = await file.text();
        // Parse embedded JSON script
        const parser = new DOMParser();
        const doc = parser.parseFromString(textContent, 'text/html');
        const scriptData = doc.getElementById('presentation-matrix-data');

        if (scriptData && scriptData.textContent) {
          const parsedData = JSON.parse(scriptData.textContent.trim());
          if (parsedData && Array.isArray(parsedData.slides)) {
            onImportProject(parsedData.slides, parsedData.name || file.name.replace(/\.html?$/i, ''));
            alert(`HTML 프로젝트 "${parsedData.name || file.name}"를 성공적으로 불러왔습니다.`);
          } else {
            alert('HTML 파일 내에 유효한 슬라이드 데이터가 없습니다.');
          }
        } else {
          alert('선택하신 HTML 파일은 Presentation Matrix 프로젝트 데이터가 포함되지 않은 일반 HTML입니다.');
        }
      } 
      // Case 2: Import ZIP File (.zip)
      else {
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
          alert(`ZIP 프로젝트 "${parsedData.name || file.name}"를 성공적으로 불러왔습니다.`);
        } else {
          alert('유효하지 않은 장표 데이터 형식입니다.');
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('파일 불러오기에 실패했습니다.');
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

      {/* Tab 1: Slide Thumbnails List with Drag Reorder */}
      {activeTab === 'slides' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <GripVertical className="w-3 h-3 text-slate-400" />
              <span>드래그로 순서 변경</span>
            </span>
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
            const isDragging = dragIndex === index;
            const isOver = dragOverIndex === index;
            return (
              <div
                key={slide.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSlide(slide.id)}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDragging ? 'opacity-40 scale-95' : ''
                } ${
                  isOver && !isDragging
                    ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50/60 translate-y-[-2px]'
                    : isActive
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
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
          accept=".zip, .html, .htm"
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2">
          {/* Export button -> Open modal options first */}
          <button
            onClick={() => setShowExportModal(true)}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ZIP / HTML Export</span>
          </button>

          {/* Import button (Supports ZIP and HTML) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200"
            title="ZIP 또는 HTML 파일 불러오기 지원"
          >
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-slate-500" />}
            <span>ZIP / HTML Import</span>
          </button>
        </div>
      </div>

      {/* ── Export Options Modal rendered at document.body via Portal to guarantee TOP LAYER (z-[999999]) ── */}
      {mounted &&
        showExportModal &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-fade-in"
            style={{ zIndex: 999999 }}
          >
            <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-5 relative">
              {/* Close X Button */}
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <FileCode2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">프로젝트 Export 설정</h3>
                  <p className="text-xs text-slate-500">저장 형식과 워터마크 옵션을 선택하세요</p>
                </div>
              </div>

              {/* 1. Format Selection */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>📦 내보낼 저장 형식 선택</span>
                  <span className="text-[10px] text-blue-600 font-normal">(중복 선택 가능)</span>
                </p>

                {/* ZIP Format Checkbox Option */}
                <div
                  onClick={() => setExportFormats((f) => ({ ...f, zip: !f.zip }))}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportFormats.zip
                      ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${exportFormats.zip ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {exportFormats.zip ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">ZIP (1920x1080 PNG + slides.json)</span>
                      <span className="text-[10px] text-slate-500">고해상도 장표 이미지들과 프로젝트 원본 파일</span>
                    </div>
                  </div>
                </div>

                {/* HTML Format Checkbox Option */}
                <div
                  onClick={() => setExportFormats((f) => ({ ...f, html: !f.html }))}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    exportFormats.html
                      ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${exportFormats.html ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {exportFormats.html ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">HTML (단독 웹 프레젠테이션 파일)</span>
                      <span className="text-[10px] text-slate-500">웹 브라우저에서 발표 가능 + 다시 불러오기 지원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Watermark Option */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div
                  onClick={() => setWatermarkEnabled((v) => !v)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    watermarkEnabled
                      ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-500/20 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${watermarkEnabled ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Stamp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">워터마크 삽입 (좌측 하단)</span>
                      <span className="text-[10px] text-slate-500">슬라이드 이미지 좌측 하단에 금색 타이틀 삽입</span>
                    </div>
                  </div>
                  {watermarkEnabled ? <CheckSquare className="w-4 h-4 text-violet-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                </div>

                {watermarkEnabled && (
                  <div className="space-y-2 pt-1 pl-1">
                    <p className="text-[11px] font-semibold text-slate-600">워터마크 언어 선택:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWatermarkLang('ko')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          watermarkLang === 'ko'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🇰🇷 한국어</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermarkLang('en')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          watermarkLang === 'en'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🇺🇸 English</span>
                      </button>
                    </div>

                    {/* Live Watermark Image Preview */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 p-3 mt-2 shadow-inner">
                      <p className="text-[10px] font-semibold text-slate-400 mb-2">워터마크 이미지 미리보기:</p>
                      <div className="bg-slate-950/80 p-2 rounded-lg flex items-center justify-center border border-slate-800">
                        <img
                          src={watermarkLang === 'ko' ? WATERMARK_KO_BASE64 : WATERMARK_EN_BASE64}
                          alt="watermark preview"
                          className="w-full max-w-[280px] max-h-16 object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <button
                  onClick={handleDownloadToLocal}
                  disabled={isExporting || (!exportFormats.zip && !exportFormats.html)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>로컬 PC로 다운로드</span>
                </button>

                <button
                  onClick={handleSaveToNeonDbAction}
                  disabled={isExporting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>Neon DB에 프로젝트 저장</span>
                </button>

                <button
                  onClick={() => setShowExportModal(false)}
                  disabled={isExporting}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium text-center transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  );
}
