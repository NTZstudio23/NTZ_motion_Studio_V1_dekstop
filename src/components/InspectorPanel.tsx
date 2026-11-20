import React, { useState } from 'react';
import { Copy, Download, FileSpreadsheet, Sliders, Sparkles, Tag, Trash2 } from 'lucide-react';
import { ADOBE_CATS } from '../data/promptCatalog';
import {
  AspectRatioKey,
  AutoCsvMode,
  BgModeKey,
  DownloadLogEntry,
  EncoderSupportInfo,
  FormatKey,
  MetaState,
  ResolutionKey,
  StudioSettings,
} from '../types/studio';
import { catName, cleanTitle, parseKw } from '../utils/metadata';
import { META_DESC_MAX, META_TITLE_MAX } from '../utils/metadata';

interface InspectorPanelProps {
  studio: StudioSettings;
  meta: MetaState;
  downloadLog: DownloadLogEntry[];
  encoderInfo: EncoderSupportInfo;
  effectiveBitrate: number;
  targetMB: string;
  targetBytes: number;
  isRendering: boolean;
  metaMsg: string;
  onSetRatio: (r: AspectRatioKey) => void;
  onSetResolution: (r: ResolutionKey) => void;
  onSetDuration: (d: number) => void;
  onSetFps: (fps: number) => void;
  onSetFormat: (f: FormatKey) => void;
  onSetBgMode: (bg: BgModeKey) => void;
  onSetSolidColor: (c: string) => void;
  onSetBitrate: (mbps: number) => void;
  onSetTargetSizeMode: (mode: 'auto' | 'custom') => void;
  onSetTargetSizeMB: (mb: number) => void;
  onMetaChange: (patch: Partial<MetaState>, userEdited?: boolean) => void;
  onAutoFillMeta: () => void;
  onCopyMetaAiPrompt: () => void;
  onApplyMetaJson: (raw: string) => void;
  onExportCsv: (kind: 'adobe' | 'vecteezy' | 'both') => void;
  onCopyMetaField: (field: 'title' | 'desc' | 'kw') => void;
  onClearMetaLog: () => void;
}

const RATIO_OPTIONS: Array<{ id: AspectRatioKey; sub: string }> = [
  { id: '16:9', sub: 'YouTube' },
  { id: '9:16', sub: 'Shorts' },
  { id: '1:1', sub: 'Kotak' },
  { id: '4:5', sub: 'Feed' },
  { id: '21:9', sub: 'Sinema' },
  { id: '4:3', sub: 'Klasik' },
  { id: '3:4', sub: 'Potret' },
  { id: '3:2', sub: 'Foto' },
  { id: '2:3', sub: 'Pin' },
];

const RES_OPTIONS: ResolutionKey[] = ['720p', '1080p', '2K', '4K'];
const DUR_PRESETS = [5, 10, 15, 30, 60];
const FPS_OPTIONS = [24, 30, 60];
const BITRATE_OPTIONS = [
  { mbps: 12, label: 'Standar Web' },
  { mbps: 20, label: 'Tajam HD' },
  { mbps: 28, label: 'Microstock Pro' },
  { mbps: 45, label: 'Ultra Anti-Noise' },
  { mbps: 65, label: 'Master 2K/4K' },
  { mbps: 80, label: 'Master 4K Ultra' },
];
const REC_BITRATE: Record<ResolutionKey, number> = { '720p': 12, '1080p': 28, '2K': 45, '4K': 80 };

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  studio,
  meta,
  downloadLog,
  encoderInfo,
  effectiveBitrate,
  targetMB,
  targetBytes,
  isRendering,
  metaMsg,
  onSetRatio,
  onSetResolution,
  onSetDuration,
  onSetFps,
  onSetFormat,
  onSetBgMode,
  onSetSolidColor,
  onSetBitrate,
  onSetTargetSizeMode,
  onSetTargetSizeMB,
  onMetaChange,
  onAutoFillMeta,
  onCopyMetaAiPrompt,
  onApplyMetaJson,
  onExportCsv,
  onCopyMetaField,
  onClearMetaLog,
}) => {
  const [tab, setTab] = useState<'render' | 'meta'>('render');
  const [jsonInput, setJsonInput] = useState('');

  const totalFrames = Math.round(studio.duration * studio.fps);
  const titleLen = cleanTitle(meta.title).length;
  const descLen = meta.desc.trim().length;
  const kwCount = parseKw(meta.keywords).length;
  const recBitrate = REC_BITRATE[studio.res];

  return (
    <aside className="w-full lg:w-[410px] xl:w-[440px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-[#0C0F16] flex flex-col lg:h-full lg:overflow-hidden">
      {/* Segmented Inspector Tabs */}
      <div className="p-3 border-b border-slate-800/80 shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#090B10] border border-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('render')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'render' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pengaturan Render</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('meta')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'meta' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Metadata Stock</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {tab === 'render' ? (
          <>
            {/* Summary strip */}
            <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-100 font-mono tabular-nums">
                  {studio.width}×{studio.height} · {studio.ratio}
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                  {studio.duration}s · {studio.fps} fps · {totalFrames} frame · Est {targetMB} MB
                </div>
              </div>
              <span className="font-mono text-xs font-semibold text-cyan-400">{encoderInfo.ext.toUpperCase()}</span>
            </div>

            {/* Aspect Ratio & Resolution */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-300">Ukuran &amp; Rasio</div>
              <div className="grid grid-cols-3 gap-1.5">
                {RATIO_OPTIONS.map((opt) => {
                  const active = studio.ratio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetRatio(opt.id)}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer disabled:opacity-50 ${
                        active
                          ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-200'
                          : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold tabular-nums">{opt.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {RES_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetResolution(r)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                      studio.res === r
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                        : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-800/70" />

            {/* Duration & FPS */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">Durasi &amp; Frame Rate</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DUR_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetDuration(s)}
                    className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 ${
                      studio.duration === s
                        ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                        : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
                <div className="inline-flex items-center bg-[#090B10] border border-slate-800 rounded-md overflow-hidden ml-auto">
                  <button
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetDuration(studio.duration - 1)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    disabled={isRendering}
                    value={studio.duration}
                    onChange={(e) => onSetDuration(parseInt(e.target.value, 10) || 10)}
                    className="w-11 bg-transparent text-center text-xs font-bold text-slate-100 outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetDuration(studio.duration + 1)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-100 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {FPS_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetFps(f)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold tabular-nums transition-colors cursor-pointer disabled:opacity-50 ${
                        studio.fps === f
                          ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                          : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {f} fps
                    </button>
                  ))}
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums">{totalFrames} frame</span>
              </div>
            </div>

            <hr className="border-slate-800/70" />

            {/* Bitrate */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">Kualitas &amp; Bitrate</span>
                <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
                  {effectiveBitrate >= 10 ? Math.round(effectiveBitrate) : effectiveBitrate.toFixed(1)} Mbps
                </span>
              </div>

              {studio.targetSizeMode === 'custom' ? (
                <p className="text-[11px] text-slate-400">
                  Mode target MB aktif: bitrate otomatis mengikuti ukuran file ({targetMB} MB).
                </p>
              ) : (
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Rekomendasi {studio.res}: {recBitrate} Mbps</span>
                  {studio.bitrateMbps < recBitrate && (
                    <button
                      type="button"
                      onClick={() => onSetBitrate(recBitrate)}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                    >
                      Pakai {recBitrate} Mbps
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {BITRATE_OPTIONS.map((b) => {
                  const active = studio.targetSizeMode === 'auto' && studio.bitrateMbps === b.mbps;
                  return (
                    <button
                      key={b.mbps}
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetBitrate(b.mbps)}
                      className={`py-2 px-2 rounded-lg border text-center transition-colors cursor-pointer disabled:opacity-50 ${
                        active
                          ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-200'
                          : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold tabular-nums">{b.mbps} Mbps</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{b.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-slate-400 shrink-0">Custom</span>
                <input
                  type="range"
                  min={8}
                  max={80}
                  disabled={isRendering}
                  value={studio.bitrateMbps}
                  onChange={(e) => onSetBitrate(Number(e.target.value))}
                  className="studio-range flex-1"
                />
                <span className="font-mono text-xs text-slate-200 tabular-nums w-16 text-right">
                  {studio.bitrateMbps} Mbps
                </span>
              </div>
            </div>

            <hr className="border-slate-800/70" />

            {/* Format, Background & Target MB */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300">Format Output &amp; Background</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['MP4', 'H.264 Universal'],
                    ['WebM', 'VP9 Ringan'],
                    ['MOV', 'QuickTime / Stock'],
                  ] as Array<[FormatKey, string]>
                ).map(([fmt, desc]) => (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetFormat(fmt)}
                    className={`py-2 px-2 rounded-lg border text-center transition-colors cursor-pointer disabled:opacity-50 ${
                      studio.format === fmt
                        ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-200'
                        : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{fmt}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 bg-[#090B10] border border-slate-800/80 rounded-lg px-3 py-2 leading-relaxed">
                <p>{encoderInfo.note}</p>
                {encoderInfo.alphaWarning && <p className="text-amber-300 mt-1">{encoderInfo.alphaWarning}</p>}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['code', 'Sesuai Kode', 'Dari animasi'],
                    ['transparent', 'Transparan', 'Alpha Channel'],
                    ['solid', 'Solid', 'Satu warna'],
                  ] as Array<[BgModeKey, string, string]>
                ).map(([bg, label, desc]) => (
                  <button
                    key={bg}
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetBgMode(bg)}
                    className={`py-2 px-2 rounded-lg border text-center transition-colors cursor-pointer disabled:opacity-50 ${
                      studio.bgMode === bg
                        ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-200'
                        : 'bg-[#121722] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>

              {studio.bgMode === 'solid' && (
                <div className="flex items-center justify-between bg-[#090B10] border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-300">Warna Solid</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{studio.solidColor}</span>
                    <input
                      type="color"
                      disabled={isRendering}
                      value={studio.solidColor}
                      onChange={(e) => onSetSolidColor(e.target.value)}
                      className="w-7 h-6 bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Target Ukuran File (MB)</span>
                  <span className="font-mono text-cyan-300 tabular-nums">{targetMB} MB</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isRendering}
                    onClick={() => onSetTargetSizeMode('auto')}
                    className={`px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                      studio.targetSizeMode === 'auto'
                        ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                        : 'bg-[#121722] border-slate-800 text-slate-300'
                    }`}
                  >
                    Auto
                  </button>
                  {[15, 30, 50, 100].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetTargetSizeMB(mb)}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium tabular-nums cursor-pointer ${
                        studio.targetSizeMode === 'custom' && studio.targetSizeMB === mb
                          ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                          : 'bg-[#121722] border-slate-800 text-slate-300'
                      }`}
                    >
                      {mb} MB
                    </button>
                  ))}
                  <div className="inline-flex items-center bg-[#090B10] border border-slate-800 rounded-md overflow-hidden ml-auto">
                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetTargetSizeMB((studio.targetSizeMode === 'custom' ? studio.targetSizeMB : Math.round(Number(targetMB))) - 5)}
                      className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={5}
                      max={2000}
                      disabled={isRendering}
                      value={studio.targetSizeMode === 'custom' ? studio.targetSizeMB : Math.round(Number(targetMB))}
                      onChange={(e) => onSetTargetSizeMB(parseFloat(e.target.value) || 35)}
                      className="w-12 bg-transparent text-center text-xs font-bold text-slate-100 outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => onSetTargetSizeMB((studio.targetSizeMode === 'custom' ? studio.targetSizeMB : Math.round(Number(targetMB))) + 5)}
                      className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                {targetBytes > 1.2e9 && (
                  <p className="text-[11px] text-amber-400">
                    Estimasi &gt; 1.2 GB: render bisa gagal karena batas memori browser.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          /* METADATA STOCK TAB */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-300">
                {titleLen && kwCount && descLen ? `${kwCount} keyword · ${catName(meta.cat)}` : 'Belum lengkap'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onAutoFillMeta}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 text-xs font-medium cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto Isi</span>
                </button>
                <button
                  type="button"
                  onClick={onCopyMetaAiPrompt}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#121722] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Prompt AI</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="metaTitle" className="text-slate-300 font-medium">Judul Stock (maks. 150)</label>
                  <span className={`font-mono tabular-nums ${titleLen === 0 || titleLen > META_TITLE_MAX ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {titleLen}/{META_TITLE_MAX}
                  </span>
                </div>
                <input
                  id="metaTitle"
                  type="text"
                  maxLength={META_TITLE_MAX}
                  value={meta.title}
                  onChange={(e) => onMetaChange({ title: e.target.value }, true)}
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="metaDesc" className="text-slate-300 font-medium">Deskripsi (maks. 200)</label>
                  <span className={`font-mono tabular-nums ${descLen === 0 || descLen > META_DESC_MAX ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {descLen}/{META_DESC_MAX}
                  </span>
                </div>
                <textarea
                  id="metaDesc"
                  maxLength={META_DESC_MAX}
                  rows={3}
                  value={meta.desc}
                  onChange={(e) => onMetaChange({ desc: e.target.value }, true)}
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="metaKw" className="text-slate-300 font-medium">Keyword (koma, maks. 50)</label>
                  <span className={`font-mono tabular-nums ${kwCount === 0 || kwCount > 50 ? 'text-rose-400' : kwCount >= 25 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {kwCount}/50
                  </span>
                </div>
                <textarea
                  id="metaKw"
                  rows={4}
                  value={meta.keywords}
                  onChange={(e) => onMetaChange({ keywords: e.target.value }, true)}
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="metaCat" className="block text-xs text-slate-300 font-medium mb-1">Kategori Adobe Stock</label>
                <select
                  id="metaCat"
                  value={meta.cat}
                  onChange={(e) => onMetaChange({ cat: Number(e.target.value) || 8 }, true)}
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  {ADOBE_CATS.map(([id, name]) => (
                    <option key={id} value={id}>
                      {id} · {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meta.embed}
                  onChange={(e) => onMetaChange({ embed: e.target.checked }, true)}
                  className="mt-0.5 accent-cyan-500"
                />
                <span>Tanam metadata ke file video (MP4/MOV udta+XMP · WebM Tags)</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meta.shortName}
                  onChange={(e) => onMetaChange({ shortName: e.target.checked }, true)}
                  className="mt-0.5 accent-cyan-500"
                />
                <span>Nama file pendek (maks. 30 karakter untuk Adobe Stock)</span>
              </label>

              <div>
                <label htmlFor="metaAutoCsv" className="block text-xs text-slate-400 mb-1">
                  CSV metadata otomatis (khusus Render Massal)
                </label>
                <select
                  id="metaAutoCsv"
                  value={meta.autoCsv}
                  onChange={(e) => onMetaChange({ autoCsv: e.target.value as AutoCsvMode }, true)}
                  className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none"
                >
                  <option value="both">Adobe Stock + Vecteezy</option>
                  <option value="adobe">Hanya Adobe Stock</option>
                  <option value="vecteezy">Hanya Vecteezy</option>
                  <option value="none">Tidak otomatis</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Download video biasa tidak mengunduh CSV otomatis. CSV otomatis hanya berjalan di Render Massal.
                </p>
              </div>
            </div>

            {/* JSON Paste */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label htmlFor="metaAiJson" className="block text-xs text-slate-300 font-medium">
                Tempel JSON Metadata AI
              </label>
              <textarea
                id="metaAiJson"
                rows={2}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"title":"...","description":"...","keywords":["a","b"],"category":"Graphic Resources"}'
                className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-200 outline-none resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  onApplyMetaJson(jsonInput);
                  setJsonInput('');
                }}
                className="px-3 py-1.5 rounded-md bg-[#121722] hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-medium cursor-pointer"
              >
                Terapkan JSON
              </button>
            </div>

            {/* Export & Copy */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onExportCsv('adobe')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-xs font-medium cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Adobe</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportCsv('vecteezy')}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/50 text-emerald-200 text-xs font-medium cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Vecteezy</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onExportCsv('both')}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#121722] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV Keduanya</span>
              </button>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onCopyMetaField('title')}
                  className="py-1.5 px-2 rounded-md bg-[#121722] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                >
                  Salin Judul
                </button>
                <button
                  type="button"
                  onClick={() => onCopyMetaField('desc')}
                  className="py-1.5 px-2 rounded-md bg-[#121722] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                >
                  Salin Deskripsi
                </button>
                <button
                  type="button"
                  onClick={() => onCopyMetaField('kw')}
                  className="py-1.5 px-2 rounded-md bg-[#121722] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                >
                  Salin Keyword
                </button>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
                {downloadLog.length > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono">
                      {downloadLog.length} file: {downloadLog.slice(-3).map((e) => e.filename).join(' · ')}
                    </span>
                    <button
                      type="button"
                      onClick={onClearMetaLog}
                      title="Reset Riwayat CSV"
                      className="text-rose-400 hover:text-rose-300 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>Download video terlebih dahulu agar nama file tercatat ke CSV.</span>
                )}
              </div>

              {metaMsg && <p className="text-xs text-cyan-300 leading-relaxed">{metaMsg}</p>}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
