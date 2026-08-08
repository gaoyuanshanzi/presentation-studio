'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Image as ImageIcon, Loader2, Check, Sparkles } from 'lucide-react';
import { ImageSearchResult } from '@/types';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string) => void;
}

export default function ImageSearchModal({ isOpen, onClose, onSelectImage }: ImageSearchModalProps) {
  const [query, setQuery] = useState('nature background');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchImages = async (searchKeyword: string) => {
    if (!searchKeyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages(query);
    }
  }, [isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(query);
  };

  const presetTags = ['Nature', 'Technology', 'Business', 'Abstract', 'City', 'Gradient', 'Minimal'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                공개 웹 이미지 Gallery 검색
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> No Key Required
                </span>
              </h3>
              <p className="text-xs text-slate-500">키워드를 입력하면 무료 공개 배경 이미지를 실시간 탐색합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filter Presets */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색할 이미지 키워드를 입력하세요 (예: 비즈니스, 우주, 그래디언트)..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>검색</span>
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium">추천 키워드:</span>
            {presetTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  fetchImages(tag);
                }}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-medium transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Image Grid Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">고해상도 웹 이미지를 불러오는 중...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <ImageIcon className="w-12 h-12 stroke-[1.5]" />
              <p className="text-sm font-medium">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((img) => {
                const isSelected = selectedId === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedId(img.id);
                      onSelectImage(img.url);
                      onClose();
                    }}
                    className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-4 ring-blue-500/20 shadow-lg'
                        : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <img
                      src={img.thumb}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <p className="text-white text-xs font-semibold truncate">{img.title}</p>
                      <p className="text-slate-300 text-[10px] truncate">{img.author}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>클릭 시 ②_master 슬라이드의 배경 이미지로 즉시 적용됩니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
