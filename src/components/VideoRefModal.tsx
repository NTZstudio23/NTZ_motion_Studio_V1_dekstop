import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Film, Play, Sliders, Square, Upload, X } from 'lucide-react';
import { AspectRatioKey, StudioSettings } from '../types/studio';
import { analyzeVideoToPrompt, nearestAR, snapFps, VideoDetailLevel } from '../utils/videoAnalyzer';

interface VideoRefModalProps {
  open: boolean;
  studio: StudioSettings;
  promptBgStyle: string;
  promptCustomBgText: string;
  onClose: () => void;
  onSyncStudio: (patch: { ratio?: AspectRatioKey; duration?: number; fps?: number }) => void;
}

interface ThumbItem {
  url: string;
  title: string;
}

export const VideoRefModal: React.FC<VideoRefModalProps> = ({
  open,
  studio,
  promptBgStyle,
  promptCustomBgText,
  onClose,
  onSyncStudio,
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string>('Belum ada video dipilih');
  const [videoMeta, setVideoMeta] = useState<{
    width: number;
    height: number;
    duration: number;
    ar: number;
  } | null>(null);

  const [sampleCount, setSampleCount] = useState<'auto' | number>('auto');
  const [detail, setDetail] = useState<VideoDetailLevel>('standar');
  const [arSelection, setArSelection] = useState<'orig' | 'studio' | AspectRatioKey>('orig');
  const [bgModeChoice, setBgModeChoice] = useState<'ref' | 'studio'>('ref');
  const [note, setNote] = useState('');
  const [syncOnAnalyze, setSyncOnAnalyze] = useState(true);
  const [matchDuration, setMatchDuration] = useState(true);
  const [makeLoop, setMakeLoop] = useState(true);

  const [running, setRunning] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Pilih file video referensi untuk diamati secara lokal di browser.');
  const [thumbs, setThumbs] = useState<ThumbItem[]>([]);
  const [promptOut, setPromptOut] = useState('');
  const [lastSyncSpec, setLastSyncSpec] = useState<{ ratio: AspectRatioKey; duration: number; fps: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  if (!open) return null;

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    setVideoUrl(url);
    setVideoMeta(null);
    setThumbs([]);
    setPromptOut('');
    setLastSyncSpec(null);
    setProgressPct(0);
    setFileInfo(`Memuat "${f.name}"...`);
    setStatusMsg('Memuat metadata video...');
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    const dur = Math.min(v.duration || 10, 120);
    const ar = v.videoWidth / v.videoHeight;
    const near = nearestAR(ar);
    setVideoMeta({ width: v.videoWidth, height: v.videoHeight, duration: dur, ar });
    setFileInfo(`${v.videoWidth}×${v.videoHeight} (${near}) · ${(v.duration || 0).toFixed(2)} dtk`);
    setStatusMsg('Video siap diamati. Klik "Amati & Buat Prompt".');
  };

  const handleAnalyze = async () => {
    const v = videoRef.current;
    if (!v || !videoMeta || running) return;
    setRunning(true);
    cancelRef.current = false;
    setThumbs([]);
    setProgressPct(1);
    setStatusMsg('Menyiapkan pengamatan...');

    try {
      const result = await analyzeVideoToPrompt({
        video: v,
        rawDuration: v.duration || videoMeta.duration,
        sampleCount,
        detail,
        arSelection,
        bgModeChoice,
        promptBgStyle,
        promptCustomBgText,
        note,
        syncStudio: syncOnAnalyze,
        matchDuration,
        loop: makeLoop,
        studio,
        isCancelled: () => cancelRef.current,
        onProgress: (pct, msg) => {
          setProgressPct(pct);
          setStatusMsg(msg);
        },
        onThumbnail: (dataUrl, title) => {
          setThumbs((prev) => [...prev, { url: dataUrl, title }]);
        },
      });

      setPromptOut(result.prompt);
      const spec = { ratio: result.targetRatio, duration: result.targetDuration, fps: result.targetFps };
      setLastSyncSpec(spec);

      if (syncOnAnalyze) {
        onSyncStudio(spec);
        setStatusMsg(
          `Selesai · ${result.thumbsCount} frame diamati · ${result.tracksCount} objek terlacak · Studio disamakan (${spec.ratio}, ${spec.duration}s, ${spec.fps}fps)`
        );
      } else {
        setStatusMsg(`Selesai · ${result.thumbsCount} frame diamati · ${result.tracksCount} objek terlacak`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(cancelRef.current ? 'Pengamatan dibatalkan.' : `Gagal mengamati video: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSyncManual = () => {
    if (lastSyncSpec) {
      onSyncStudio(lastSyncSpec);
      setStatusMsg(`Studio disamakan ke ${lastSyncSpec.ratio} · ${lastSyncSpec.duration}s · ${lastSyncSpec.fps}fps.`);
      return;
    }
    if (videoMeta) {
      const ratio = arSelection === 'orig' ? nearestAR(videoMeta.ar) : arSelection === 'studio' ? studio.ratio : arSelection;
      const dur = matchDuration ? Math.max(1, Math.min(120, Math.round(videoMeta.duration))) : studio.duration;
      onSyncStudio({ ratio, duration: dur, fps: snapFps(studio.fps) || studio.fps });
      setStatusMsg(`Studio disamakan ke ${ratio} · ${dur}s.`);
    }
  };

  const handleCopyPrompt = async () => {
    if (!promptOut.trim()) return;
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(promptOut);
        ok = true;
      } catch {
        // fallback below
      }
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = promptOut;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!promptOut.trim()) return;
    const blob = new Blob([promptOut], { type: 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `prompt-referensi-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 15000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !running) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0F131C] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100">Video → Prompt (Amati Referensi Lokal)</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              Analisis frame-by-frame lokal di browser tanpa upload — menghasilkan prompt HTML5 Canvas presisi.
            </p>
          </div>
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Picker + Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 space-y-2.5">
              <div className="bg-[#090B10] border border-slate-800 rounded-xl aspect-video flex items-center justify-center overflow-hidden relative">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    muted
                    playsInline
                    preload="auto"
                    controls={!running}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4 text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Film className="w-7 h-7 text-slate-600" />
                    <span>Pilih video MP4, WebM, atau MOV</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={running}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{videoUrl ? 'Ganti Video' : 'Pilih File Video'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleSelectVideo}
                />
                <span className="font-mono text-[11px] text-slate-400 truncate" title={fileInfo}>
                  {fileInfo}
                </span>
              </div>
            </div>

            {/* Settings */}
            <div className="md:col-span-7 space-y-3 bg-[#121722] border border-slate-800 rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Frame Diamati</label>
                  <select
                    disabled={running}
                    value={sampleCount}
                    onChange={(e) => setSampleCount(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="auto">Otomatis</option>
                    <option value={12}>12 frame</option>
                    <option value={16}>16 frame</option>
                    <option value={24}>24 frame</option>
                    <option value={36}>36 frame</option>
                    <option value={48}>48 frame</option>
                    <option value={60}>60 frame</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Detail Data</label>
                  <select
                    disabled={running}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value as VideoDetailLevel)}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="ringkas">Ringkas</option>
                    <option value="standar">Standar</option>
                    <option value="maks">Maksimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Rasio Output</label>
                  <select
                    disabled={running}
                    value={arSelection}
                    onChange={(e) => setArSelection(e.target.value as 'orig' | 'studio' | AspectRatioKey)}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="orig">Ikuti Video Asli</option>
                    <option value="studio">Ikuti Studio ({studio.ratio})</option>
                    <option value="16:9">16:9 YouTube</option>
                    <option value="9:16">9:16 Shorts</option>
                    <option value="1:1">1:1 Kotak</option>
                    <option value="4:5">4:5 Feed</option>
                    <option value="21:9">21:9 Sinema</option>
                    <option value="4:3">4:3 Klasik</option>
                    <option value="3:4">3:4 Potret</option>
                    <option value="3:2">3:2 Foto</option>
                    <option value="2:3">2:3 Pin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Background</label>
                  <select
                    disabled={running}
                    value={bgModeChoice}
                    onChange={(e) => setBgModeChoice(e.target.value as 'ref' | 'studio')}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="ref">Sesuai Referensi</option>
                    <option value="studio">Sesuai Studio</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="vrNoteInput" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Catatan Tambahan / Teks yang Tampil di Video (Opsional)
                </label>
                <textarea
                  id="vrNoteInput"
                  rows={2}
                  disabled={running}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Ada teks 'SALE 50%' di tengah, atau perjelas efek cahaya neon..."
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={running}
                    checked={syncOnAnalyze}
                    onChange={(e) => setSyncOnAnalyze(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span>Samakan spec Studio otomatis</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={running}
                    checked={matchDuration}
                    onChange={(e) => setMatchDuration(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span>Samakan durasi referensi</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={running}
                    checked={makeLoop}
                    onChange={(e) => setMakeLoop(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span>Buat seamless loop</span>
                </label>
              </div>
            </div>
          </div>

          {/* Progress & Status */}
          <div className="bg-[#121722] border border-slate-800 rounded-xl px-3.5 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-cyan-300">{statusMsg}</span>
              <span className="font-mono text-slate-400 tabular-nums">{progressPct}%</span>
            </div>
            {(running || progressPct > 0) && (
              <div className="h-1.5 bg-[#090B10] rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-[width] duration-150" style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </div>

          {/* Extracted Thumbnails Strip */}
          {thumbs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {thumbs.map((th, idx) => (
                <div key={idx} className="shrink-0 bg-[#090B10] border border-slate-800 rounded-lg p-1 text-center">
                  <img src={th.url} alt={th.title} className="h-12 w-auto rounded block mx-auto" />
                  <span className="block font-mono text-[10px] text-slate-400 mt-0.5 tabular-nums">{th.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Output Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Hasil Prompt Replikasi ({promptOut.length} karakter)</span>
              {lastSyncSpec && (
                <span className="font-mono text-cyan-300">
                  {lastSyncSpec.ratio} · {lastSyncSpec.duration}s · {lastSyncSpec.fps}fps
                </span>
              )}
            </div>
            <textarea
              rows={9}
              value={promptOut}
              onChange={(e) => setPromptOut(e.target.value)}
              placeholder="Prompt hasil pengamatan frame demi frame akan muncul di sini..."
              className="code-editor w-full bg-[#07090E] border border-slate-800 focus:border-cyan-500 rounded-xl p-3.5 text-xs leading-relaxed text-slate-200 outline-none resize-y"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {running ? (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Batal</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!videoMeta}
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Amati &amp; Buat Prompt</span>
              </button>
            )}

            <button
              type="button"
              disabled={running || (!lastSyncSpec && !videoMeta)}
              onClick={handleSyncManual}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Samakan Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={!promptOut.trim()}
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .txt</span>
            </button>
            <button
              type="button"
              disabled={!promptOut.trim()}
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Prompt Tersalin!' : 'Salin Prompt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
