import React from 'react';
import { X } from 'lucide-react';
import { PRESETS } from '../data/presets';

interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (id: 'bokeh' | 'neon' | 'network') => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({ open, onClose, onSelectPreset }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-[#0F131C] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">Preset Animasi Bawaan</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.values(PRESETS).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p.id)}
              className="p-4 rounded-xl bg-[#141925] hover:bg-[#192030] border border-slate-800 hover:border-cyan-500/60 text-left transition-colors cursor-pointer"
            >
              <div className="text-sm font-bold" style={{ color: p.accent }}>
                {p.title}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#0F131C] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">Panduan &amp; Shortcut PC Desktop</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <p>
              <strong className="text-slate-100">1. Buat atau Muat Animasi:</strong> Buka <strong>Prompt AI</strong> untuk membuat prompt microstock siap pakai, lalu tempel kode HTML Canvas hasilnya ke <strong>Terminal Kode</strong>.
            </p>
            <p>
              <strong className="text-slate-100">2. Ringan di PC:</strong> Aktifkan <strong>Mode Ringan</strong> agar pratinjau berjalan efisien (maks 30 fps) sementara hasil ekspor tetap dirender pada resolusi &amp; FPS penuh (hingga 4K 60fps).
            </p>
            <p>
              <strong className="text-slate-100">3. Render Presisi Frame-by-Frame:</strong> Engine WebCodecs merender setiap frame secara deterministik tanpa frame-drop, lalu menanamkan metadata (MP4/MOV XMP/udta atau WebM Tags) dan menghasilkan CSV Adobe Stock / Vecteezy.
            </p>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="font-semibold text-slate-200 mb-2">Shortcut Keyboard Desktop</div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Play / Pause</span>
                <span className="text-cyan-300">Space</span>
              </div>
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Geser ±1 Frame</span>
                <span className="text-cyan-300">← / →</span>
              </div>
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Reset ke Frame 0</span>
                <span className="text-cyan-300">Home</span>
              </div>
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Toggle Grid / Loop</span>
                <span className="text-cyan-300">G / L</span>
              </div>
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Full Preview</span>
                <span className="text-cyan-300">F</span>
              </div>
              <div className="flex justify-between bg-[#090B10] border border-slate-800 rounded px-2.5 py-1.5">
                <span className="text-slate-400">Jalankan Kode</span>
                <span className="text-cyan-300">Ctrl + Enter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
