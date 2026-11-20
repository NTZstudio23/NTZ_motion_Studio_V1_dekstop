import React from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Film,
  Grid3X3,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Video,
  Zap,
} from 'lucide-react';
import { EncoderSupportInfo, StudioSettings } from '../types/studio';

interface PreviewStageProps {
  studio: StudioSettings;
  previewBoxRef: React.RefObject<HTMLDivElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewDims: { width: number; height: number };
  currentTime: number;
  isPlaying: boolean;
  isRendering: boolean;
  renderProgress: number;
  renderStatusMsg: string;
  renderBannerType: 'ready' | 'rendering' | 'done' | 'error';
  recordedBlobUrl: string | null;
  lastRenderedMB: string | null;
  needsReRender: boolean;
  filenamePreview: string;
  encoderInfo: EncoderSupportInfo;
  effectiveBitrate: number;
  targetMB: string;
  onTogglePlay: () => void;
  onStepFrame: (delta: number) => void;
  onResetTimeline: () => void;
  onToggleLoop: () => void;
  onScrubStart: () => void;
  onScrubChange: (val: number) => void;
  onScrubEnd: () => void;
  onToggleLightMode: () => void;
  onToggleGrid: () => void;
  onReload: () => void;
  onToggleFullscreen: () => void;
  isPseudoFullscreen: boolean;
  onExitPseudoFullscreen: () => void;
  onAnalyzeLoad: () => void;
  onOpenCode: () => void;
  onOpenVideoRef: () => void;
  onTitleChange: (val: string) => void;
  onStartRender: () => void;
  onCancelRender: () => void;
  onDownload: () => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  studio,
  previewBoxRef,
  previewCanvasRef,
  previewDims,
  currentTime,
  isPlaying,
  isRendering,
  renderProgress,
  renderStatusMsg,
  renderBannerType,
  recordedBlobUrl,
  lastRenderedMB,
  needsReRender,
  filenamePreview,
  encoderInfo,
  effectiveBitrate,
  targetMB,
  onTogglePlay,
  onStepFrame,
  onResetTimeline,
  onToggleLoop,
  onScrubStart,
  onScrubChange,
  onScrubEnd,
  onToggleLightMode,
  onToggleGrid,
  onReload,
  onToggleFullscreen,
  isPseudoFullscreen,
  onExitPseudoFullscreen,
  onAnalyzeLoad,
  onOpenCode,
  onOpenVideoRef,
  onTitleChange,
  onStartRender,
  onCancelRender,
  onDownload,
}) => {
  const totalFrames = Math.max(1, Math.round(studio.duration * studio.fps));
  const currentFrame = Math.min(totalFrames, Math.floor(currentTime * studio.fps));
  const scrubberVal = Math.round((currentTime / studio.duration) * 1000);
  const canDownload = Boolean(recordedBlobUrl && !needsReRender && !isRendering);

  const bannerColors =
    renderBannerType === 'rendering'
      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-100'
      : renderBannerType === 'error'
        ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
        : renderBannerType === 'done'
          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
          : 'bg-[#10141D] border-slate-800/80 text-slate-300';

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row">
      {/* Column 1: CapCut-Style Vertical Tool Rail */}
      <aside className="shrink-0 lg:w-[92px] border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#0C0F16] p-2 flex lg:flex-col items-center lg:items-stretch justify-between gap-2 overflow-x-auto lg:overflow-y-auto">
        <div className="flex lg:flex-col gap-1.5 w-full">
          <button
            type="button"
            onClick={onToggleLightMode}
            title="Mode Ringan membatasi preview maks 30fps & skala preview agar PC tetap dingin tanpa mengurangi kualitas hasil render"
            className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studio.lightMode
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">
              Ringan {studio.lightMode ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleGrid}
            title="Tampilkan / Sembunyikan Grid (G)"
            className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studio.gridVisible
                ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">Grid</span>
          </button>

          <button
            type="button"
            onClick={onReload}
            title="Muat ulang animasi dari detik 0"
            className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">Reload</span>
          </button>

          <button
            type="button"
            onClick={onAnalyzeLoad}
            title="Analisis spesifikasi & beban proyek"
            className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">Analisis</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            title="Mode Layar Penuh (F)"
            className={`flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isPseudoFullscreen
                ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {isPseudoFullscreen ? <Minimize2 className="w-4 h-4 shrink-0" /> : <Maximize2 className="w-4 h-4 shrink-0" />}
            <span className="lg:text-[10px] leading-tight text-center">Full</span>
          </button>

          <div className="hidden lg:block h-px bg-slate-800/80 my-1" />

          <button
            type="button"
            onClick={onOpenVideoRef}
            title="Amati video referensi menjadi prompt kode"
            className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border bg-[#121722] border-slate-800 text-slate-300 hover:border-cyan-600/60 hover:text-cyan-200 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">Video→AI</span>
          </button>

          <button
            type="button"
            onClick={onOpenCode}
            title="Buka Terminal Kode"
            className="flex flex-row lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-2.5 lg:px-1.5 py-2 rounded-lg border bg-[#121722] border-slate-800 text-slate-300 hover:border-cyan-600/60 hover:text-cyan-200 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <span className="lg:text-[10px] leading-tight text-center">Kode</span>
          </button>
        </div>

        <div className="hidden lg:flex flex-col items-center text-center pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-500 tabular-nums leading-tight">
          <span className="text-slate-300 font-semibold">{studio.width}×{studio.height}</span>
          <span>{studio.ratio} · {studio.fps}fps</span>
        </div>
      </aside>

      {/* Column 2: Center Auto-Fitted Canvas & Transport */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#090B10] p-4 gap-3 lg:overflow-y-auto">
        {/* Compact Status Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className={isRendering ? 'text-cyan-400 font-semibold' : isPlaying ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
              {isRendering ? 'Rendering' : isPlaying ? 'Playing' : 'Paused'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200">{studio.width}×{studio.height}</span>
            <span aria-hidden="true">·</span>
            <span>{studio.ratio}</span>
            <span aria-hidden="true">·</span>
            <span>{studio.fps} fps</span>
            <span aria-hidden="true">·</span>
            <span>{encoderInfo.ext.toUpperCase()}</span>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {studio.bgMode === 'transparent' ? 'Alpha Transparan' : studio.bgMode === 'solid' ? `Solid ${studio.solidColor}` : 'Background Kode'}
          </span>
        </div>

        {/* Main Canvas Stage (auto-fits desktop viewport cleanly, supports pseudo-fullscreen in iframes) */}
        <div
          className={
            isPseudoFullscreen
              ? 'fixed inset-0 z-50 bg-[#05070B] p-6 flex flex-col items-center justify-center gap-3'
              : 'flex-1 min-h-[180px] flex items-center justify-center bg-[#06080C] border border-slate-800/80 rounded-xl p-3 relative overflow-hidden'
          }
        >
          {isPseudoFullscreen && (
            <button
              type="button"
              onClick={onExitPseudoFullscreen}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Keluar Full Preview (Esc)</span>
            </button>
          )}
          <div
            ref={previewBoxRef}
            style={{ aspectRatio: `${studio.width} / ${studio.height}` }}
            className={`relative max-w-full max-h-full h-full w-auto flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 shadow-2xl ${
              studio.bgMode === 'transparent' ? 'checkerboard-bg' : 'bg-black'
            }`}
          >
            <canvas
              ref={previewCanvasRef}
              width={previewDims.width}
              height={previewDims.height}
              className="w-full h-full object-contain block"
            />
            {studio.gridVisible && <div className="absolute inset-0 pointer-events-none studio-grid-overlay" />}
            <div className="absolute bottom-2.5 right-2.5 pointer-events-none bg-black/75 border border-slate-800 text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded tabular-nums">
              {studio.width}×{studio.height} · {studio.lightMode ? 'Preview Ringan' : 'Preview HD'}
            </div>
          </div>
        </div>

      {/* Precision Timeline & Transport Bar */}
      <div className="shrink-0 bg-[#10141D] border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-cyan-400 tabular-nums w-14">
            {currentTime.toFixed(2)}s
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={scrubberVal}
            disabled={isRendering}
            onPointerDown={onScrubStart}
            onPointerUp={onScrubEnd}
            onPointerCancel={onScrubEnd}
            onChange={(e) => onScrubChange(Number(e.target.value))}
            aria-label="Timeline Scrubber"
            className="studio-range flex-1"
          />
          <span className="font-mono text-xs text-slate-400 tabular-nums w-14 text-right">
            {studio.duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={isRendering}
              title="Play / Pause (Spasi)"
              className="w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              type="button"
              onClick={() => onStepFrame(-1)}
              disabled={isRendering}
              title="Mundur 1 Frame (Panah Kiri)"
              className="w-8 h-8 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onStepFrame(1)}
              disabled={isRendering}
              title="Maju 1 Frame (Panah Kanan)"
              className="w-8 h-8 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onResetTimeline}
              disabled={isRendering}
              title="Kembali ke Frame 0 (Home)"
              className="w-8 h-8 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleLoop}
              title="Loop Timeline (L)"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                studio.loop
                  ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                  : 'bg-[#161C29] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <span className="ml-2 font-mono text-xs text-slate-400 tabular-nums">
              Frame <strong className="text-slate-100">{currentFrame}</strong> / {totalFrames}
            </span>
          </div>

          <div className="font-mono text-xs text-slate-400 tabular-nums">
            {studio.fps} fps · {encoderInfo.ext.toUpperCase()} · {effectiveBitrate >= 10 ? Math.round(effectiveBitrate) : effectiveBitrate.toFixed(1)} Mbps · Est {targetMB} MB
          </div>
        </div>
      </div>

      {/* Video Filename + Render Status + Export CTAs */}
      <div className="shrink-0 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 flex-wrap bg-[#10141D] border border-slate-800/80 rounded-xl px-3.5 py-2.5">
          <label htmlFor="videoTitleInput" className="text-xs font-medium text-slate-400 shrink-0">
            Nama Video
          </label>
          <input
            id="videoTitleInput"
            type="text"
            value={studio.videoTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="flex-1 min-w-[180px] bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
          />
          <span className="font-mono text-xs text-cyan-300 truncate max-w-[320px]" title={filenamePreview}>
            {filenamePreview}
          </span>
        </div>

        <div className={`border rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap text-xs ${bannerColors}`}>
          <div className="flex-1 min-w-[220px]">
            <p className="leading-relaxed">{renderStatusMsg}</p>
            {isRendering && (
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-cyan-400 transition-[width] duration-150"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0 font-mono tabular-nums">
            {isRendering && (
              <button
                type="button"
                onClick={onCancelRender}
                className="px-3 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/60 text-rose-200 font-semibold cursor-pointer"
              >
                Batalkan
              </button>
            )}
            <span className="text-slate-300 font-semibold">
              {isRendering ? `${renderProgress}%` : lastRenderedMB && !needsReRender ? `${lastRenderedMB} MB` : `Est ${targetMB} MB`}
            </span>
          </div>
        </div>

        <div className={`grid gap-2.5 ${canDownload ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={onStartRender}
            disabled={isRendering}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-wait text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>
              {isRendering
                ? `Merender... ${renderProgress}%`
                : recordedBlobUrl && !needsReRender
                  ? '1. Render Ulang'
                  : '1. Render Video'}
            </span>
          </button>

          {canDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>2. Download Video ({lastRenderedMB} MB)</span>
            </button>
          )}
        </div>
      </div>
    </section>
    </div>
  );
};
