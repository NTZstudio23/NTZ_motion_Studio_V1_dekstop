import React, { useState } from 'react';
import { Download, MonitorDown, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install NTZ Motion Studio ke Desktop / Start Menu seperti aplikasi biasa"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <MonitorDown className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full max-w-md bg-[#0F131C] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-100">Install Sebagai Aplikasi Desktop</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg bg-[#161C29] hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-300 leading-relaxed">
              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">Cara Install di iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Tekan tombol <strong>Share</strong> di bilah Safari.</li>
                    <li>Gulir ke bawah dan pilih <strong>Add to Home Screen</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="font-semibold text-slate-100">
                    Pasang di Windows / Mac (Chrome atau Microsoft Edge):
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>
                      Buka alamat aplikasi langsung di tab browser biasa (bukan dalam iframe preview), lalu klik ikon{' '}
                      <strong>Install</strong> di ujung kanan address bar.
                    </li>
                    <li>
                      Atau buka menu browser <strong>⋮</strong> (pojok kanan atas) → pilih{' '}
                      <strong>Cast, save, and share</strong> → <strong>Install page as app...</strong> (di Edge:{' '}
                      <strong>Apps → Install this site as an app</strong>).
                    </li>
                    <li>
                      Klik <strong>Install</strong>. Aplikasi akan membuat shortcut di <strong>Desktop &amp; Start Menu</strong> dan berjalan di jendela desktop terpisah tanpa address bar.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
