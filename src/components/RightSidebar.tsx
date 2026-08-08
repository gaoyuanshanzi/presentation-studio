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
  HardDrive,
  Pen,
  PenOff,
  Eraser,
  Monitor
} from 'lucide-react';
import { RecordingItem } from '@/types';

interface RightSidebarProps {
  neonRecordings: RecordingItem[];
  dbConnected: boolean;
  onRefreshRecordings: () => void;
  onSaveRecordingToNeonDb: (title: string, duration: number, videoData: string) => Promise<boolean>;
  onDeleteRecordingFromNeonDb: (id: string) => Promise<void>;
  onOpenGuideModal: () => void;
  /** Pen tool state lifted to parent for CenterGrid sync */
  isPenMode: boolean;
  penColor: string;
  onTogglePen: () => void;
  onChangePenColor: (color: string) => void;
}

const PEN_COLORS = [
  { label: '형광 노랑',  value: '#facc15', bg: 'bg-yellow-400' },
  { label: '형광 초록',  value: '#a3e635', bg: 'bg-lime-400' },
  { label: '형광 분홍',  value: '#f472b6', bg: 'bg-pink-400' },
  { label: '형광 파랑',  value: '#60a5fa', bg: 'bg-blue-400' },
  { label: '형광 주황',  value: '#fb923c', bg: 'bg-orange-400' },
  { label: '흰 색',     value: '#ffffff', bg: 'bg-white border border-slate-300' },
  { label: '검 정',     value: '#0f172a', bg: 'bg-slate-900' },
  { label: '빨 강',     value: '#ef4444', bg: 'bg-red-500' },
];

export default function RightSidebar({
  neonRecordings,
  dbConnected,
  onRefreshRecordings,
  onSaveRecordingToNeonDb,
  onDeleteRecordingFromNeonDb,
  onOpenGuideModal,
  isPenMode,
  penColor,
  onTogglePen,
  onChangePenColor,
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
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

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

  // ── Main Screen Share + Mic Audio Recording (MP4 Format) ─────────────────────
  const startRecording = async () => {
    try {
      // 1. Capture Display Media (Screen / Application Window / Browser Tab)
      // This records EVERYTHING over the presentation, including popped-up video, floating windows, overlays, etc.
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // or 'window' / 'browser'
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // Capture system audio if available
      });
      screenStreamRef.current = screenStream;

      // 2. Setup AudioContext & Combine Screen Audio + Mic Audio
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      // Connect screen audio track if available
      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioCtx.createMediaStreamSource(screenStream);
        screenAudioSource.connect(dest);
      }

      // Connect mic audio track if enabled
      let micStream: MediaStream | null = null;
      if (isMicEnabled) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(dest);
        } catch (e) {
          console.warn('Microphone stream access unavailable:', e);
        }
      }

      // Fallback silent audio anchor if no audio tracks exist
      if (screenStream.getAudioTracks().length === 0 && !micStream) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
      }

      // 3. Create Combined Stream: Screen Video + Mixed Audio
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTracks = dest.stream.getAudioTracks();

      const finalStream = new MediaStream([videoTrack, ...audioTracks]);

      // If user stops sharing screen via browser floating toolbar, automatically stop recording
      videoTrack.onended = () => {
        stopRecording();
      };

      // 4. Determine Best Supported MIME Type (Priority: MP4)
      const mimeTypeOptions = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9,opus',
        'video/webm',
      ];

      let selectedMimeType = 'video/mp4';
      for (const option of mimeTypeOptions) {
        if (MediaRecorder.isTypeSupported(option)) {
          selectedMimeType = option;
          break;
        }
      }

      // 5. Initialize MediaRecorder
      const recorder = new MediaRecorder(finalStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 6_000_000, // 6 Mbps high quality
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Cleanup active tracks
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const actualType = selectedMimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(chunksRef.current, { type: actualType });

        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedDataUrl(reader.result as string);
          setRecordedBlob(blob);
          setRecordedDuration(recordingTime);
          setShowSaveModal(true);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err) {
      console.error('Recording initialization error:', err);
      // User cancelled screen picker or denied permission
      if ((err as Error).name !== 'NotAllowedError') {
        alert('화면 및 음성 녹화 시작 중 오류가 발생했습니다.');
      }
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleSaveLocalMp4 = () => {
    if (recordedDataUrl && recordedBlob) {
      const isMp4 = recordedBlob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = recordedDataUrl;
      a.download = `Presentation_Recording_${new Date().getTime()}.${ext}`;
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
            <p className="text-[10px] text-slate-500 font-medium">MP4 원본 캡처 • 외부창/동영상 녹화 지원</p>
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
            <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            <span>화면+외부창+마이크 통합 녹화</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="col-span-3 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all"
            >
              <Video className="w-4 h-4 fill-white" />
              <span>화면 선택 & 녹화 시작</span>
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
                <span>녹화 종료 & MP4 저장</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Pen Drawing Tool Panel ────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Pen className="w-3.5 h-3.5 text-indigo-500" />
            드로잉 펜 도구
          </span>
          <button
            onClick={onTogglePen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              isPenMode
                ? 'bg-indigo-600 text-white shadow-indigo-300/30'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {isPenMode ? <PenOff className="w-3.5 h-3.5" /> : <Pen className="w-3.5 h-3.5" />}
            {isPenMode ? 'OFF' : 'ON'}
          </button>
        </div>

        {/* Color swatches */}
        <div className="grid grid-cols-8 gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChangePenColor(c.value)}
              title={c.label}
              className={`w-7 h-7 rounded-lg transition-all ${c.bg} ${
                penColor === c.value
                  ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110'
                  : 'hover:scale-110 opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        {isPenMode && (
          <p className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded-lg">
            ✏️ 펜 활성화 — slave 화면 위에서 마우스로 그리세요. 슬라이드 변경 시 자동 초기화.
          </p>
        )}
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
                  download={`${rec.title}.mp4`}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                  title="로컬 MP4 다운로드"
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
                <h3 className="font-bold text-slate-800 text-base">녹화 완료! MP4 저장 선택</h3>
                <p className="text-xs text-slate-500">녹화 시간: {formatTime(recordedDuration)} · MP4 포맷</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSaveLocalMp4}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>로컬 PC에 MP4 저장 (.mp4)</span>
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
