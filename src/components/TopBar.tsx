import React from 'react';
import { Code2, Film, FolderKanban, HelpCircle, Layers, Play, Sparkles, Square } from 'lucide-react';

interface TopBarProps {
  isRendering: boolean;
  onOpenCode: () => void;
  onOpenPrompt: () => void;
  onOpenPreset: () => void;
  onOpenBatch: () => void;
  onOpenVideoRef: () => void;
  onOpenHelp: () => void;
  onRenderOrCancel: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isRendering,
  onOpenCode,
  onOpenPrompt,
  onOpenPreset,
  onOpenBatch,
  onOpenVideoRef,
  onOpenHelp,
  onRenderOrCancel,
}) => {
  return (
    <header className="h-14 shrink-0 border-b border-slate-800/80 bg-[#0C0F16] px-5 flex items-center justify-between gap-8">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="8" fill="#131926" stroke="#253147" strokeWidth="1.5" />
          <path fill="#22D3EE" d="M10 30V10h4.5l10 12.5V10H29v20h-4.5l-10-12.5V30z" />
        </svg>
        <span className="text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          NTZ Motion Studio
        </span>
      </div>

      {/* Zone 2: Clean single-line workspace navigation */}
      <nav className="flex items-center gap-3 lg:gap-5 text-xs font-medium text-slate-400 overflow-x-auto">
        <button
          type="button"
          onClick={onOpenCode}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Terminal Kode</span>
        </button>
        <button
          type="button"
          onClick={onOpenPrompt}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Prompt AI</span>
        </button>
        <button
          type="button"
          onClick={onOpenVideoRef}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Video → Prompt</span>
        </button>
        <button
          type="button"
          onClick={onOpenPreset}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Preset</span>
        </button>
        <button
          type="button"
          onClick={onOpenBatch}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Render Massal</span>
        </button>
        <button
          type="button"
          onClick={onOpenHelp}
          className="inline-flex items-center gap-1.5 py-1.5 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Panduan</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onRenderOrCancel}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isRendering
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
          }`}
        >
          {isRendering ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isRendering ? 'Batalkan Render' : 'Render Video'}</span>
        </button>
      </div>
    </header>
  );
};
