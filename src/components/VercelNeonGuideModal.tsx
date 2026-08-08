'use client';

import React from 'react';
import { X, Database, Globe, Github, CheckCircle2, Copy, Sparkles, ExternalLink } from 'lucide-react';

interface VercelNeonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbConnected: boolean;
}

export default function VercelNeonGuideModal({
  isOpen,
  onClose,
  dbConnected
}: VercelNeonGuideModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('클립보드에 복사되었습니다!');
  };

  const accountEmail = 'gaoyuanshanzi@gmail.com';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                Neon DB & Vercel 배포 연동 안내
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {accountEmail}
                </span>
              </h3>
              <p className="text-xs text-slate-500">GitHub, Vercel, Neon.tech 통합 배포 가이드</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* DB Status Alert */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              dbConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-xs">
                {dbConnected
                  ? 'Neon PostgreSQL 데이터베이스 연동 활성화 상태'
                  : 'Neon DB 접속 대기 중 (Local Storage Fallback 가동 중)'}
              </p>
              <p className="text-xs opacity-90">
                {dbConnected
                  ? 'Neon DB 테이블이 연동되어 프로젝트 ZIP과 MP4 파일이 Cloud DB에 즉시 저장됩니다.'
                  : 'DATABASE_URL 환경 변수가 입력되면 자동으로 Neon PostgreSQL로 즉시 동기화됩니다.'}
              </p>
            </div>
          </div>

          {/* 1. Neon.tech Setup */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2 border-slate-100">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
              Neon.tech PostgreSQL 데이터베이스 준비
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 pl-7 list-disc">
              <li>
                <strong className="text-slate-800">{accountEmail}</strong> 계정으로{' '}
                <a
                  href="https://neon.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  Neon Console <ExternalLink className="w-3 h-3" />
                </a>
                에 접속합니다.
              </li>
              <li>새로운 PostgreSQL 프로젝트를 생성한 후 Connection String (PostgreSQL URL)을 복사합니다.</li>
            </ul>

            {/* Connection String Command example */}
            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl text-xs font-mono flex items-center justify-between">
              <span className="truncate">DATABASE_URL="postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"</span>
              <button
                onClick={() => copyToClipboard('DATABASE_URL="postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"')}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="복사"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. GitHub Push */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2 border-slate-100">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
              GitHub 레포지토리 업로드
            </h4>
            <div className="bg-slate-100 p-3 rounded-xl text-xs font-mono space-y-1">
              <p>git init</p>
              <p>git add .</p>
              <p>git commit -m "feat: presentation recorder studio web app with neon db"</p>
              <p>git remote add origin https://github.com/gaoyuanshanzi/presentation-studio.git</p>
              <p>git push -u origin main</p>
            </div>
          </div>

          {/* 3. Vercel Deployment */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm border-b pb-2 border-slate-100">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
              Vercel 대시보드 One-Click 배포
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 pl-7 list-disc">
              <li>
                <strong className="text-slate-800">{accountEmail}</strong> 계정으로{' '}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  Vercel Dashboard <ExternalLink className="w-3 h-3" />
                </a>
                에 로그인합니다.
              </li>
              <li>GitHub 저장소를 가져와(Import) 환경변수에 <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">DATABASE_URL</code>을 등록하고 [Deploy]를 클릭합니다.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
