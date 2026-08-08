'use client';

import React, { useRef } from 'react';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Upload,
  Search,
  Trash2,
  Heading1,
  Bold,
  Italic,
  List,
  Code,
  Quote
} from 'lucide-react';
import { SlideContent } from '@/types';

interface MasterEditorProps {
  title: string;
  badgeText: string;
  badgeColor: string;
  data: SlideContent;
  onChange: (updated: Partial<SlideContent>) => void;
  onOpenImageSearch?: () => void;
  hasImageFeature?: boolean;
}

export default function MasterEditor({
  title,
  badgeText,
  badgeColor,
  data,
  onChange,
  onOpenImageSearch,
  hasImageFeature = false
}: MasterEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({ bgImage: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById(`editor-${badgeText}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || '텍스트';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onChange({ content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  // Quick preset color swatches for white mode accessibility
  const colorPresets = ['#ffffff', '#f8fafc', '#f1f5f9', '#eff6ff', '#f0fdf4', '#fff7ed', '#fef2f2', '#faf5ff'];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Editor Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${badgeColor}`}>
            {badgeText}
          </span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>

        {/* Controls toolbar */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Background Color Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium hidden sm:inline">배경:</span>
            <input
              type="color"
              value={data.bgColor || '#ffffff'}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-none p-0 bg-transparent"
              title="배경색 변경"
            />
          </div>

          {/* Text Color Picker & Quick Presets */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg">
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium hidden sm:inline">글자:</span>
            <input
              type="color"
              value={data.textColor || '#0f172a'}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-none p-0 bg-transparent"
              title="커스텀 글자색 선택"
            />
            {/* Quick Text Color Palette Swatches */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-0.5">
              {[
                { name: '검정', hex: '#0f172a', bg: 'bg-slate-900' },
                { name: '파랑', hex: '#2563eb', bg: 'bg-blue-600' },
                { name: '빨강', hex: '#dc2626', bg: 'bg-red-600' },
                { name: '노랑', hex: '#eab308', bg: 'bg-yellow-500' },
                { name: '초록', hex: '#059669', bg: 'bg-emerald-600' },
                { name: '보라', hex: '#7c3aed', bg: 'bg-purple-600' },
                { name: '주황', hex: '#ea580c', bg: 'bg-orange-600' },
                { name: '흰색', hex: '#ffffff', bg: 'bg-white border border-slate-300' },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onChange({ textColor: c.hex })}
                  title={`${c.name} 글자색 선택`}
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${c.bg} ${
                    (data.textColor || '#0f172a').toLowerCase() === c.hex.toLowerCase()
                      ? 'ring-2 ring-indigo-500 ring-offset-1 scale-125'
                      : 'hover:scale-125 opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Image feature for ②_master */}
          {hasImageFeature && (
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-lg flex items-center gap-1 transition-all"
                title="로컬 이미지 업로드"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden md:inline">업로드</span>
              </button>

              <button
                type="button"
                onClick={onOpenImageSearch}
                className="px-2 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-medium rounded-lg flex items-center gap-1 transition-all"
                title="공개 웹 이미지 검색"
              >
                <Search className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">웹 검색</span>
              </button>

              {data.bgImage && (
                <button
                  type="button"
                  onClick={() => onChange({ bgImage: null })}
                  className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all"
                  title="배경 이미지 제거"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Formatting Markdown Shortcut Bar */}
      <div className="px-3 py-1.5 bg-white border-b border-slate-100 flex items-center gap-1 overflow-x-auto text-slate-600">
        <button
          type="button"
          onClick={() => insertMarkdown('# ')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('**', '**')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('*', '*')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          onClick={() => insertMarkdown('- ')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('`', '`')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('> ')}
          className="p-1 hover:bg-slate-100 rounded text-slate-700"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        {/* Color Presets */}
        <div className="ml-auto flex items-center gap-1 pl-2">
          <span className="text-[10px] text-slate-400 font-medium">Quick BG:</span>
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ bgColor: c })}
              style={{ backgroundColor: c }}
              className="w-3.5 h-3.5 rounded-full border border-slate-300 hover:scale-125 transition-transform"
              title={`배경 ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Active Image Indicator if attached */}
      {hasImageFeature && data.bgImage && (
        <div className="px-4 py-1.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-700">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            선택된 배경 이미지 적용 중
          </span>
          <button
            type="button"
            onClick={() => onChange({ bgImage: null })}
            className="text-[11px] font-semibold hover:underline"
          >
            이미지 삭제
          </button>
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        id={`editor-${badgeText}`}
        value={data.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder={`${title} 마크다운 내용을 입력하세요...\n\n# 제목\n- 항목 1\n- 항목 2\n\n> 강조하고 싶은 내용을 적어보세요.`}
        className="w-full flex-1 p-4 bg-white text-slate-800 focus:outline-none resize-none font-mono text-sm leading-relaxed"
      />
    </div>
  );
}
