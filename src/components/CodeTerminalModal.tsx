import React, { useRef, useState } from 'react';
import { ClipboardPaste, FileCode, Play, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { stripMarkdownCodeFences } from '../utils/renderEngine';

interface CodeTerminalModalProps {
  open: boolean;
  code: string;
  isRendering: boolean;
  externalError: string;
  onChangeCode: (code: string) => void;
  onClose: () => void;
  onApply: (code: string, keepTitle?: boolean, explicitTitle?: string) => Promise<void>;
  onResetDefault: () => void;
  onOpenPrompt: () => void;
  onRouteMultiFilesToBatch: (files: File[]) => Promise<void>;
}

const TERM_MAX = 3_000_000;

export const CodeTerminalModal: React.FC<CodeTerminalModalProps> = ({
  open,
  code,
  isRendering,
  externalError,
  onChangeCode,
  onClose,
  onApply,
  onResetDefault,
  onOpenPrompt,
  onRouteMultiFilesToBatch,
}) => {
  const [statusMsg, setStatusMsg] = useState('Siap');
  const [applying, setApplying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const lineCount = code ? code.split('\n').length : 0;
  const displayStatus = externalError || statusMsg;

  const handlePaste = async () => {
    let pasted = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        pasted = await navigator.clipboard.readText();
      } catch {
        // fallback below
      }
    }
    if (pasted && pasted.length > TERM_MAX) {
      setStatusMsg('Kode terlalu besar (maks ~3 MB)');
      return;
    }
    if (pasted.trim()) {
      const cleaned = stripMarkdownCodeFences(pasted);
      onChangeCode(cleaned);
      setStatusMsg(`${cleaned.split('\n').length} baris ditempel`);
      textareaRef.current?.focus();
      return;
    }
    textareaRef.current?.focus();
    setStatusMsg('Tekan Ctrl+V di kotak kode, atau pakai Buka .HTML');
  };

  const handleFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const all = Array.from(ev.target.files || []);
    ev.target.value = '';
    const valid = all.filter((f) => /\.(html?|js|txt|zip)$/i.test(f.name));
    if (!valid.length) {
      setStatusMsg('Pilih file .html / .htm / .js / .txt / .zip');
      return;
    }
    if (valid.length > 1 || /\.zip$/i.test(valid[0].name)) {
      onClose();
      await onRouteMultiFilesToBatch(valid);
      return;
    }
    if (isRendering) return;
    const f = valid[0];
    if (f.size > TERM_MAX) {
      setStatusMsg('File terlalu besar (maks ~3 MB)');
      return;
    }
    try {
      const raw = await f.text();
      const cleaned = stripMarkdownCodeFences(raw);
      if (!cleaned) {
        setStatusMsg('File kosong');
        return;
      }
      onChangeCode(cleaned);
      const tm = cleaned.match(/<title[^>]*>([^<]{2,60})<\/title>/i);
      const titleHint = (tm && tm[1].trim()) || f.name.replace(/\.[^.]+$/, '');
      setStatusMsg(`"${f.name}" dimuat`);
      setApplying(true);
      await onApply(cleaned, false, titleHint);
    } catch (e) {
      setStatusMsg('Gagal membaca file: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setApplying(false);
    }
  };

  const handleRun = async () => {
    if (isRendering || applying) return;
    if (code.length > TERM_MAX) {
      setStatusMsg('Kode terlalu besar (maks ~3 MB)');
      return;
    }
    const cleaned = stripMarkdownCodeFences(code);
    if (!cleaned) {
      setStatusMsg('Editor masih kosong');
      return;
    }
    if (cleaned !== code) onChangeCode(cleaned);
    setApplying(true);
    setStatusMsg('Menjalankan kode...');
    try {
      await onApply(cleaned);
    } catch (e) {
      setStatusMsg('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setApplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const updated = code.slice(0, start) + '  ' + code.slice(end);
      onChangeCode(updated);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0F131C] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-100">Terminal Kode — HTML Canvas Lengkap atau JS</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>

        <div className="p-4 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[#141925] border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onChangeCode('');
                  setStatusMsg('Semua kode dihapus');
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-200 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Semua</span>
              </button>
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-200 text-xs font-medium cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste Kode</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Buka .HTML / .ZIP (banyak → Massal)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.txt,.js,.zip,application/zip,application/x-zip-compressed"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setStatusMsg('Reset ke default');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Default</span>
              </button>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {displayStatus} · {lineCount} baris · {code.length} kar.
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              onChangeCode(e.target.value);
              setStatusMsg('Siap');
            }}
            onPaste={() => {
              setTimeout(() => {
                if (textareaRef.current) {
                  const cleaned = stripMarkdownCodeFences(textareaRef.current.value);
                  if (cleaned !== textareaRef.current.value) onChangeCode(cleaned);
                  setStatusMsg('Kode ditempel');
                }
              }, 20);
            }}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            placeholder="Tempel kode HTML lengkap (<!DOCTYPE html>...) atau kode Canvas JS di sini..."
            className="code-editor w-full flex-1 min-h-[320px] bg-[#07090E] border border-slate-800 focus:border-cyan-500 rounded-xl p-4 text-xs leading-relaxed text-slate-200 outline-none resize-y"
          />
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPrompt();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buat Prompt AI</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 hidden sm:inline font-mono">Ctrl+Enter untuk jalankan</span>
            <button
              type="button"
              disabled={applying || isRendering}
              onClick={handleRun}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{applying ? 'Memuat...' : 'Terapkan & Jalankan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
