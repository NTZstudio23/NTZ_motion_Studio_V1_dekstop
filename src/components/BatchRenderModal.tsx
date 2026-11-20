import React, { useRef, useState } from 'react';
import { FileSpreadsheet, FolderOpen, FolderPlus, Play, Plus, Square, Trash2, Upload, X } from 'lucide-react';
import { BatchItem, StudioSettings } from '../types/studio';

interface BatchRenderModalProps {
  open: boolean;
  studio: StudioSettings;
  items: BatchItem[];
  maxItems: number;
  running: boolean;
  folderName: string | null;
  statusMsg: string;
  hasBatchLogs: boolean;
  onClose: () => void;
  onAddFiles: (files: File[]) => Promise<void>;
  onAddText: (raw: string) => void;
  onAddFromEditor: () => void;
  onRemoveItem: (id: number) => void;
  onClear: () => void;
  onPickFolder: () => Promise<void>;
  onStart: () => Promise<void>;
  onCancel: () => void;
  onDownloadBatchCsv: () => Promise<void>;
}

export const BatchRenderModal: React.FC<BatchRenderModalProps> = ({
  open,
  studio,
  items,
  maxItems,
  running,
  folderName,
  statusMsg,
  hasBatchLogs,
  onClose,
  onAddFiles,
  onAddText,
  onAddFromEditor,
  onRemoveItem,
  onClear,
  onPickFolder,
  onStart,
  onCancel,
  onDownloadBatchCsv,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const filesInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const doneCount = items.filter((x) => x.status === 'done').length;
  const failCount = items.filter((x) => x.status === 'fail').length;
  const hasPending = items.some((x) => x.status !== 'done');
  const canPickFolder = typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

  const statusLabel: Record<BatchItem['status'], string> = {
    wait: 'Menunggu',
    run: 'Merender',
    done: 'Selesai',
    fail: 'Gagal',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !running) onClose();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) onAddFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0F131C] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Render Massal — maks. {maxItems} video</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Menggunakan preset Studio: {studio.width}×{studio.height} · {studio.duration}s · {studio.fps}fps · {studio.format}
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

        <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-[#141925] border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={running}
                onClick={() => filesInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tambah File (.html/.js/.zip)</span>
              </button>
              <input
                ref={filesInputRef}
                type="file"
                accept=".html,.htm,.txt,.js,.zip,application/zip,application/x-zip-compressed"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) onAddFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                disabled={running}
                onClick={() => dirInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer disabled:opacity-50"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Tambah Folder</span>
              </button>
              <input
                ref={dirInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is supported in Chromium desktop browsers
                webkitdirectory=""
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) onAddFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                disabled={running}
                onClick={onAddFromEditor}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ambil dari Terminal</span>
              </button>

              {canPickFolder && (
                <button
                  type="button"
                  disabled={running}
                  onClick={onPickFolder}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-xs text-emerald-200 cursor-pointer disabled:opacity-50"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Pilih Folder Simpan</span>
                </button>
              )}
            </div>
            <span className="font-mono text-xs text-slate-400">
              Simpan: {folderName ? folderName : 'download otomatis'}
            </span>
          </div>

          {/* Dropzone */}
          <button
            type="button"
            onClick={() => filesInputRef.current?.click()}
            className={`w-full border border-dashed rounded-xl p-4 text-center text-xs transition-colors cursor-pointer ${
              dragOver
                ? 'border-cyan-400 bg-cyan-950/30 text-cyan-200'
                : 'border-slate-700 hover:border-cyan-500/60 bg-[#090B10] text-slate-400'
            }`}
          >
            Tarik &amp; lepas banyak file <strong className="text-slate-200">.html / .js / .zip</strong> di sini atau klik untuk memilih (maks. {maxItems} file)
          </button>

          {/* Multi-code paste */}
          <div className="space-y-2">
            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Atau tempel banyak kode sekaligus: pisahkan tiap kode dengan baris ===== atau blok kode ```html ... ```"
              className="code-editor w-full bg-[#090B10] border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-200 outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={running}
                onClick={() => {
                  onAddText(pasteText);
                  setPasteText('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2232] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-cyan-300 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambahkan ke Antrean</span>
              </button>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {items.length}/{maxItems} video · {doneCount} selesai · {failCount} gagal
              </span>
            </div>
          </div>

          {/* Queue list */}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 border border-slate-800/60 rounded-xl bg-[#090B10]">
                Belum ada video di antrean. Tambahkan file .html/.js atau tempel kode di atas.
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border bg-[#121722] space-y-1.5 ${
                    item.status === 'run'
                      ? 'border-cyan-500/70'
                      : item.status === 'done'
                        ? 'border-emerald-700/60'
                        : item.status === 'fail'
                          ? 'border-rose-700/60'
                          : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-slate-500 w-6 tabular-nums">{idx + 1}.</span>
                    <span className="flex-1 truncate font-medium text-slate-200" title={item.name}>
                      {item.name}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        item.status === 'done'
                          ? 'text-emerald-400'
                          : item.status === 'fail'
                            ? 'text-rose-400'
                            : item.status === 'run'
                              ? 'text-cyan-400'
                              : 'text-slate-400'
                      }`}
                    >
                      {statusLabel[item.status]}
                      {item.status === 'run' ? ` ${item.pct}%` : ''}
                    </span>
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-40 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-150 ${
                        item.status === 'done' ? 'bg-emerald-500' : item.status === 'fail' ? 'bg-rose-500' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${item.status === 'done' ? 100 : item.pct}%` }}
                    />
                  </div>
                  {item.msg && <p className="text-[11px] text-rose-300">{item.msg}</p>}
                </div>
              ))
            )}
          </div>

          {statusMsg && <p className="text-xs text-cyan-300">{statusMsg}</p>}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            disabled={running || items.length === 0}
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-200 text-xs font-medium cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Antrean</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={running || !hasBatchLogs}
              onClick={onDownloadBatchCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/60 text-emerald-200 text-xs font-medium cursor-pointer disabled:opacity-40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Metadata</span>
            </button>
            {running && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Batalkan</span>
              </button>
            )}
            <button
              type="button"
              disabled={running || !hasPending}
              onClick={onStart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{failCount > 0 && !running ? 'Ulangi yang Gagal / Lanjutkan' : 'Mulai Render Massal'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
