import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Presentation & Screen Recorder Matrix Studio',
  description: '웹 기반 프레젠테이션 제작, 실시간 마크다운 슬라이드 렌더링, 듀얼 화면/음성 MP4 녹화 및 Neon PostgreSQL 연동 웹 애플리케이션',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
