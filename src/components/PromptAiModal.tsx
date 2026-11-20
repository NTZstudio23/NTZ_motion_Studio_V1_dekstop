import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, Search, X } from 'lucide-react';
import {
  generateAiPromptText,
  PROMPT_CATEGORIES,
  TYPO_STYLES,
  VISUAL_STYLE_GROUPS,
  VISUAL_STYLES_FLAT,
} from '../data/promptCatalog';
import { AspectRatioKey, PromptConfig, ResolutionKey, StudioSettings } from '../types/studio';

interface PromptAiModalProps {
  open: boolean;
  studio: StudioSettings;
  config: PromptConfig;
  isRendering: boolean;
  onChangeConfig: (patch: Partial<PromptConfig>) => void;
  onChangeStudioSpec: (patch: { ratio?: AspectRatioKey; res?: ResolutionKey; duration?: number; fps?: number }) => void;
  onClose: () => void;
  onGoTerminal: () => void;
  onSyncPromptTitle: (title: string) => void;
}

export const PromptAiModal: React.FC<PromptAiModalProps> = ({
  open,
  studio,
  config,
  isRendering,
  onChangeConfig,
  onChangeStudioSpec,
  onClose,
  onGoTerminal,
  onSyncPromptTitle,
}) => {
  const [tab, setTab] = useState<'theme' | 'style' | 'text' | 'result'>('theme');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const generated = useMemo(() => generateAiPromptText(config, studio), [config, studio]);

  if (!open) return null;

  const activeCategory = PROMPT_CATEGORIES.find((c) => c[0] === config.catId) || PROMPT_CATEGORIES[0];
  const filteredTemplates = activeCategory[2]
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return item[0].toLowerCase().includes(q) || item[1].toLowerCase().includes(q);
    });

  const activeTypo = TYPO_STYLES.find((x) => x[0] === config.typoStyle);

  const handleCopy = async () => {
    onSyncPromptTitle(generated.title);
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(generated.prompt);
        ok = true;
      } catch {
        // fallback
      }
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = generated.prompt;
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl h-[min(88vh,680px)] bg-[#0F131C] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100">Prompt AI Generator</h2>
            <p className="text-xs text-slate-400 font-mono truncate">
              {generated.title} · {studio.width}×{studio.height} · {studio.duration}s · {studio.fps} fps
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 py-2 border-b border-slate-800 bg-[#0B0E15] grid grid-cols-4 gap-1.5 shrink-0">
          {(
            [
              ['theme', '1. Tema'],
              ['style', '2. Gaya & Spec'],
              ['text', '3. Teks & Typo'],
              ['result', '4. Prompt Siap'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#121722] text-slate-300 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {tab === 'theme' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#090B10] border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ inputMode: 'template' })}
                  className={`py-2 rounded-md text-xs font-semibold cursor-pointer ${
                    config.inputMode === 'template' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  Pilih Template Microstock
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ inputMode: 'manual' })}
                  className={`py-2 rounded-md text-xs font-semibold cursor-pointer ${
                    config.inputMode === 'manual' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
                  }`}
                >
                  Tulis Tema Manual
                </button>
              </div>

              {config.inputMode === 'template' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="promptCat" className="block text-xs font-medium text-slate-400 mb-1">
                        Kategori ({PROMPT_CATEGORIES.length})
                      </label>
                      <select
                        id="promptCat"
                        value={config.catId}
                        onChange={(e) => onChangeConfig({ catId: e.target.value, tplIndex: 0 })}
                        className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                      >
                        {PROMPT_CATEGORIES.map((c) => (
                          <option key={c[0]} value={c[0]}>
                            {c[1]} ({c[2].length})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="promptSearch" className="block text-xs font-medium text-slate-400 mb-1">
                        Cari Template
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="promptSearch"
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Cari bokeh, aurora, ramadan..."
                          className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1">
                    {filteredTemplates.map(({ item, idx }) => {
                      const active = config.tplIndex === idx;
                      return (
                        <button
                          key={item[0]}
                          type="button"
                          onClick={() => onChangeConfig({ tplIndex: idx })}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-950/50 border-cyan-500/70'
                              : 'bg-[#121722] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100 leading-snug">{item[0]}</span>
                            {item[2] === 1 && (
                              <span className="text-[10px] font-semibold text-amber-400 shrink-0">Hot</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item[1]}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#121722] border border-slate-800 rounded-xl p-4">
                  <div>
                    <label htmlFor="manualThemeTitle" className="block text-xs font-medium text-slate-300 mb-1">
                      Judul / Tema Animasi Custom
                    </label>
                    <input
                      id="manualThemeTitle"
                      type="text"
                      value={config.manualTitle}
                      onChange={(e) => onChangeConfig({ manualTitle: e.target.value })}
                      placeholder="Contoh: Gelombang Partikel Emas Futuristik"
                      className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="manualThemeDesc" className="block text-xs font-medium text-slate-300 mb-1">
                      Deskripsi Gerakan &amp; Elemen Visual
                    </label>
                    <textarea
                      id="manualThemeDesc"
                      rows={5}
                      value={config.manualDesc}
                      onChange={(e) => onChangeConfig({ manualDesc: e.target.value })}
                      placeholder="Jelaskan detail animasi, warna, dan pergerakan objek..."
                      className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'style' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="promptBgStyle" className="block text-xs font-medium text-slate-400 mb-1">
                    Background
                  </label>
                  <select
                    id="promptBgStyle"
                    value={config.bgStyle}
                    onChange={(e) => onChangeConfig({ bgStyle: e.target.value })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                  >
                    <option value="sync">Sesuai Studio (Otomatis)</option>
                    <option value="dark_cinematic">Hitam Pekat / Dark Cinematic</option>
                    <option value="deep_navy">Biru Tua Gradasi / Deep Navy</option>
                    <option value="clean_white">Putih Bersih / Clean Studio</option>
                    <option value="gradient_modern">Gradasi Halus Modern</option>
                    <option value="transparent">Transparan Alpha (Overlay)</option>
                    <option value="greenscreen">Green Screen (#00FF00)</option>
                    <option value="custom">Custom Background...</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="promptColorStyle" className="block text-xs font-medium text-slate-400 mb-1">
                    Gaya Visual ({VISUAL_STYLES_FLAT.length} pilihan)
                  </label>
                  <select
                    id="promptColorStyle"
                    value={config.colorStyle}
                    onChange={(e) => onChangeConfig({ colorStyle: e.target.value })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                  >
                    {VISUAL_STYLE_GROUPS.map(([groupName, items]) => (
                      <optgroup key={groupName} label={groupName}>
                        {items.map(([name]) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {config.bgStyle === 'custom' && (
                <div>
                  <label htmlFor="customBgText" className="block text-xs font-medium text-slate-400 mb-1">
                    Deskripsi Background Custom
                  </label>
                  <input
                    id="customBgText"
                    type="text"
                    value={config.customBgText}
                    onChange={(e) => onChangeConfig({ customBgText: e.target.value })}
                    placeholder="Contoh: Gradasi ungu tua ke hitam"
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rasio</label>
                  <select
                    disabled={isRendering}
                    value={studio.ratio}
                    onChange={(e) => onChangeStudioSpec({ ratio: e.target.value as AspectRatioKey })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none"
                  >
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
                  <label className="block text-xs font-medium text-slate-400 mb-1">Kualitas</label>
                  <select
                    disabled={isRendering}
                    value={studio.res}
                    onChange={(e) => onChangeStudioSpec({ res: e.target.value as ResolutionKey })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none"
                  >
                    <option value="720p">HD 720p</option>
                    <option value="1080p">FHD 1080p</option>
                    <option value="2K">2K QHD</option>
                    <option value="4K">4K UHD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Durasi</label>
                  <select
                    disabled={isRendering}
                    value={studio.duration}
                    onChange={(e) => onChangeStudioSpec({ duration: Number(e.target.value) })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none"
                  >
                    {[5, 8, 10, 12, 15, 20, 30, 45, 60, 90, 120].map((d) => (
                      <option key={d} value={d}>
                        {d} detik
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">FPS</label>
                  <select
                    disabled={isRendering}
                    value={studio.fps}
                    onChange={(e) => onChangeStudioSpec({ fps: Number(e.target.value) })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none"
                  >
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah Scene</label>
                  <select
                    value={config.sceneCount}
                    onChange={(e) => onChangeConfig({ sceneCount: Number(e.target.value) })}
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Scene
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={config.customNote}
                    onChange={(e) => onChangeConfig({ customNote: e.target.value })}
                    placeholder="Contoh: gerakan lambat, warna hangat, partikel halus..."
                    className="w-full bg-[#090B10] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'text' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="promptTextOverlay" className="block text-xs font-medium text-slate-300 mb-1">
                  Teks di Video (Opsional)
                </label>
                <input
                  id="promptTextOverlay"
                  type="text"
                  value={config.textOverlay}
                  onChange={(e) => onChangeConfig({ textOverlay: e.target.value })}
                  placeholder="Kosongkan = tanpa teks"
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <label htmlFor="promptTypoStyle" className="block text-xs font-medium text-slate-300 mb-1">
                  Gaya Teks Tipografi ({TYPO_STYLES.length} pilihan)
                </label>
                <select
                  id="promptTypoStyle"
                  value={config.typoStyle}
                  onChange={(e) => onChangeConfig({ typoStyle: e.target.value })}
                  className="w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                >
                  <option value="auto">Otomatis (AI memilih)</option>
                  {TYPO_STYLES.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#121722] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed">
                {activeTypo
                  ? `${activeTypo[1]}: ${activeTypo[2]}.`
                  : 'Otomatis: AI memilih gaya teks sendiri (hanya dipakai bila ada teks).'}
              </div>
            </div>
          )}

          {tab === 'result' && (
            <div className="space-y-2.5 h-full flex flex-col">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Prompt Siap Pakai ({generated.prompt.length} karakter)</span>
                <span className="font-mono text-cyan-300">
                  {studio.width}×{studio.height} · {studio.duration}s · {studio.fps}fps
                </span>
              </div>
              <textarea
                readOnly
                value={generated.prompt}
                className="code-editor w-full flex-1 min-h-[340px] bg-[#07090E] border border-slate-800 rounded-xl p-3.5 text-xs leading-relaxed text-slate-200 outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoTerminal();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Ke Terminal Kode</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Prompt Tersalin!' : 'Salin Prompt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
