'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Download,
  Trash2,
  Film,
  Database,
  Volume2,
  Maximize2,
  X,
  Sparkles,
  Loader2,
  HardDrive
} from 'lucide-react';
import { RecordingItem } from '@/types';
import html2canvas from 'html2canvas';

interface RightSidebarProps {
  neonRecordings: RecordingItem[];
  dbConnected: boolean;
  onRefreshRecordings: () => void;
  onSaveRecordingToNeonDb: (title: string, duration: number, videoData: string) => Promise<boolean>;
  onDeleteRecordingFromNeonDb: (id: string) => Promise<void>;
  onOpenGuideModal: () => void;
}

export default function RightSidebar({
  neonRecordings,
  dbConnected,
  onRefreshRecordings,
  onSaveRecordingToNeonDb,
  onDeleteRecordingFromNeonDb,
  onOpenGuideModal
}: RightSidebarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDataUrl, setRecordedDataUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  // Ref so renderLoop closure can read the latest recording state without stale closure
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // ── Hide / restore UI chrome elements (badges + footers) ───────────────────
  const setUiVisibility = (visible: boolean) => {
    const els = document.querySelectorAll<HTMLElement>('[data-export-ignore]');
    els.forEach((el) => {
      el.style.visibility = visible ? '' : 'hidden';
    });
  };

  // ── Main recording start ────────────────────────────────────────────────────
  const startRecording = async () => {
    const slave1 = document.getElementById('slave-view-1');
    const slave2 = document.getElementById('slave-view-2');

    if (!slave1 || !slave2) {
      alert('프레젠테이션 뷰어를 찾을 수 없습니다.');
      return;
    }

    try {
      // Recording canvas: 1280 × 720 (YouTube HD)
      const REC_W = 1280;
      const REC_H = 720;
      const HALF = REC_W / 2;

      const canvas = document.createElement('canvas');
      canvas.width = REC_W;
      canvas.height = REC_H;
      const ctx = canvas.getContext('2d');

      // Audio: Mic + silent anchor
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      let micStream: MediaStream | null = null;
      if (isMicEnabled) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(dest);
        } catch (e) {
          console.warn('Microphone stream unavailable:', e);
        }
      }
      if (!micStream) {
        // Silent oscillator keeps audio track alive
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
      }

      // Render loop — captures clean (no UI chrome) at ~2 fps
      let lastCapture = 0;
      const INTERVAL_MS = 500;

      const renderLoop = async (timestamp: number) => {
        if (!ctx) return;

        if (timestamp - lastCapture >= INTERVAL_MS) {
          lastCapture = timestamp;
          try {
            // 1. Hide badges & footers
            setUiVisibility(false);

            // 2. Capture both slave panels — now clean, no badges/footers
            const [c1, c2] = await Promise.all([
              html2canvas(slave1, { scale: 1, useCORS: true, logging: false, allowTaint: true }),
              html2canvas(slave2, { scale: 1, useCORS: true, logging: false, allowTaint: true }),
            ]);

            // 3. Restore UI chrome
            setUiVisibility(true);

            // 4. Compose side-by-side onto recording canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, REC_W, REC_H);
            ctx.drawImage(c1, 0, 0, HALF, REC_H);
            ctx.drawImage(c2, HALF, 0, HALF, REC_H);

            // Thin centre line
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(HALF - 1, 0, 2, REC_H);
          } catch {
            setUiVisibility(true); // always restore
          }
        }

        if (isRecordingRef.current) {
          animFrameRef.current = requestAnimationFrame(renderLoop);
        }
      };

      // MediaRecorder @ 4 Mbps VP9
      const canvasStream = canvas.captureStream(30);
      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

      const recorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setUiVisibility(true);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedDataUrl(reader.result as string);
          setRecordedBlob(blob);
          setRecordedDuration(recordingTime);
          setShowSaveModal(true);
        };
        reader.readAsDataURL(blob);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      requestAnimationFrame(renderLoop);
    } catch (err) {
      console.error('Recording error:', err);
      alert('화면 및 음성 녹화 시작 중 오류가 발생했습니다.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleSaveLocalMp4 = () => {
    if (recordedDataUrl) {
      const a = document.createElement('a');
      a.href = recordedDataUrl;
      a.download = `Presentation_Recording_${new Date().getTime()}.webm`;
      a.click();
      setShowSaveModal(false);
    }
  };

  const handleSaveNeonMp4 = async () => {
    if (recordedDataUrl) {
      const title = `녹화 동영상_${new Date().toLocaleTimeString('ko-KR')}`;
      const success = await onSaveRecordingToNeonDb(title, recordedDuration, recordedDataUrl);
      if (success) {
        setShowSaveModal(false);
        onRefreshRecordings();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col h-full select-none shadow-sm z-10">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">화면/음성 녹화 센터</h2>
            <p className="text-[10px] text-slate-500 font-medium">1280×720 HD • 배지 없는 클린 녹화</p>
          </div>
        </div>

        <button
          onClick={() => setIsMicEnabled(!isMicEnabled)}
          className={`p-2 rounded-xl text-xs border transition-all ${
            isMicEnabled
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}
          title={isMicEnabled ? '마이크 입력 사용 중' : '마이크 음소거'}
        >
          {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Recording Control Box */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-4">
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isRecording ? (isPaused ? 'bg-amber-400' : 'bg-red-500 animate-ping') : 'bg-slate-600'
              }`}
            />
            <span className="font-mono font-bold text-2xl tracking-widest">
              {formatTime(recordingTime)}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
            <span>①_slave + ②_slave 합성 녹화</span>
            <Volume2 className="w-3 h-3 text-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="col-span-3 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all"
            >
              <Video className="w-4 h-4 fill-white" />
              <span>녹화 시작</span>
            </button>
          ) : (
            <>
              <button
                onClick={pauseRecording}
                className="col-span-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-md transition-all"
              >
                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
                <span>{isPaused ? '재개' : '일시정지'}</span>
              </button>

              <button
                onClick={stopRecording}
                className="col-span-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>녹화 종료 & 저장</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MP4 Directory Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
          <Film className="w-4 h-4 text-indigo-600" />
          Neon DB 녹화 저장소 Directory
        </span>
        <button onClick={onRefreshRecordings} className="text-[11px] text-indigo-600 font-semibold hover:underline">
          새로고침
        </button>
      </div>

      {/* MP4 List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30">
        {neonRecordings.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl bg-white space-y-2">
            <Film className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300" />
            <p>저장된 녹화 영상이 없습니다.</p>
            <p className="text-[10px] text-slate-400">녹화 종료 시 Neon DB에 저장할 수 있습니다.</p>
          </div>
        ) : (
          neonRecordings.map((rec) => (
            <div
              key={rec.id}
              className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-400 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 truncate">{rec.title}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                  {formatTime(rec.duration)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {rec.createdAt ? new Date(rec.createdAt).toLocaleString() : '녹화 완료'}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => { setPreviewVideoUrl(rec.videoUrl); setPreviewTitle(rec.title); }}
                  className="flex-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>재생</span>
                </button>
                <a
                  href={rec.videoUrl}
                  download={`${rec.title}.webm`}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                  title="로컬 다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onDeleteRecordingFromNeonDb(rec.id)}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="DB에서 완전 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recording Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">녹화 완료! 저장 선택</h3>
                <p className="text-xs text-slate-500">녹화 시간: {formatTime(recordedDuration)} · 1280×720 HD</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSaveLocalMp4}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>로컬 PC에 저장 (.webm)</span>
              </button>
              <button
                onClick={handleSaveNeonMp4}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20"
              >
                <Database className="w-4 h-4" />
                <span>Neon DB MP4 테이블로 저장</span>
              </button>
            </div>
            <button
              onClick={() => setShowSaveModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-medium text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm truncate">{previewTitle}</span>
              <button onClick={() => setPreviewVideoUrl(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <video src={previewVideoUrl} controls autoPlay className="max-h-[70vh] rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
