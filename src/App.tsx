import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BatchRenderModal } from './components/BatchRenderModal';
import { CodeTerminalModal } from './components/CodeTerminalModal';
import { InspectorPanel } from './components/InspectorPanel';
import { HelpModal, PresetModal } from './components/PresetAndHelpModals';
import { PreviewStage } from './components/PreviewStage';
import { PromptAiModal } from './components/PromptAiModal';
import { TopBar } from './components/TopBar';
import { VideoRefModal } from './components/VideoRefModal';
import { PRESETS } from './data/presets';
import { ADOBE_CATS } from './data/promptCatalog';
import {
  AspectRatioKey,
  BatchItem,
  BgModeKey,
  DownloadLogEntry,
  EncoderSupportInfo,
  FormatKey,
  MetaSnapshot,
  MetaState,
  PromptConfig,
  RATIOS,
  ResolutionKey,
  StudioSettings,
} from './types/studio';
import {
  buildFilename,
  buildMeta,
  catName,
  cleanTitle,
  detectVideoTitleFromCode,
  exportBatchCsvToDir,
  exportCsvFiles,
  extractMetaFromCode,
  fitDesc,
  fitTitle,
  META_DESC_MAX,
  META_TITLE_MAX,
  noBrand,
  parseKw,
} from './utils/metadata';
import { getEffectiveBitrateMbps, getTargetBytes, inspectEncoderSupport } from './utils/muxers';
import {
  compileJsCanvasFn,
  drawFrameToTarget,
  executeVideoRender,
  isHtmlDocumentCode,
  loadHtmlIntoSandbox,
  stripMarkdownCodeFences,
  UserDrawFn,
  waitForSandboxCanvas,
} from './utils/renderEngine';
import { readZipHtml } from './utils/zipReader';

const BATCH_MAX = 50;

export default function App() {
  const [studio, setStudio] = useState<StudioSettings>({
    ratio: '16:9',
    res: '1080p',
    width: 1920,
    height: 1080,
    duration: 10,
    fps: 60,
    format: 'MP4',
    bgMode: 'code',
    solidColor: '#080d1a',
    bitrateMbps: 28,
    targetSizeMode: 'auto',
    targetSizeMB: 35,
    lightMode: true,
    loop: true,
    gridVisible: false,
    videoTitle: PRESETS.bokeh.title,
    codeMode: 'js',
    rawHtmlCode: '',
    jsCode: PRESETS.bokeh.code,
    lastPromptTitle: PRESETS.bokeh.title,
  });

  const [editorCode, setEditorCode] = useState<string>(PRESETS.bokeh.code);
  const [metaCodeSource, setMetaCodeSource] = useState<string>(PRESETS.bokeh.code);
  const [terminalError, setTerminalError] = useState<string>('');

  const [meta, setMeta] = useState<MetaState>(() => {
    const initial = buildMeta(PRESETS.bokeh.title, PRESETS.bokeh.code, {
      width: 1920,
      height: 1080,
      duration: 10,
      fps: 60,
      loop: true,
      bgMode: 'code',
    });
    return {
      title: initial.title,
      desc: initial.description,
      keywords: initial.keywords.join(', '),
      cat: initial.cat,
      embed: true,
      shortName: true,
      autoCsv: 'both',
      touched: false,
    };
  });
  const [metaMsg, setMetaMsg] = useState<string>('');
  const [downloadLog, setDownloadLog] = useState<DownloadLogEntry[]>([]);

  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    inputMode: 'template',
    catId: 'bestsellers',
    tplIndex: 0,
    manualTitle: '',
    manualDesc: '',
    bgStyle: 'sync',
    customBgText: '',
    colorStyle: 'Flat Vector',
    sceneCount: 1,
    customNote: '',
    textOverlay: '',
    typoStyle: 'auto',
  });

  // Playback & Render UI state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeUi, setCurrentTimeUi] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatusMsg, setRenderStatusMsg] = useState(
    'Siap Render Presisi: Engine Offline Frame-by-Frame menjaga durasi, FPS, & kelancaran gerakan 100% akurat.'
  );
  const [renderBannerType, setRenderBannerType] = useState<'ready' | 'rendering' | 'done' | 'error'>('ready');
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedExt, setRecordedExt] = useState<string>('mp4');
  const [lastRenderedMB, setLastRenderedMB] = useState<string | null>(null);
  const [needsReRender, setNeedsReRender] = useState(true);
  const [downloadSeq, setDownloadSeq] = useState(0);
  const [embedSig, setEmbedSig] = useState('');

  const [encoderInfo, setEncoderInfo] = useState<EncoderSupportInfo>({
    ext: 'mp4',
    engineLabel: 'WebCodecs Frame-Exact',
    note: 'Memeriksa encoder browser...',
    alphaWarning: '',
    alphaSupported: false,
  });

  // Modals
  const [openModalName, setOpenModalName] = useState<'code' | 'prompt' | 'preset' | 'batch' | 'videoref' | 'help' | null>(null);

  // Batch queue
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatusMsg, setBatchStatusMsg] = useState('');
  const [batchFolderName, setBatchFolderName] = useState<string | null>(null);
  const [hasBatchLogs, setHasBatchLogs] = useState(false);
  const batchSeqRef = useRef(0);
  const batchCancelRef = useRef(false);
  const batchDirRef = useRef<FileSystemDirectoryHandle | null>(null);
  const batchLogStartRef = useRef(0);

  // Mutable engine refs for zero-overhead 60fps RAF loop
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sandboxRef = useRef<HTMLIFrameElement | null>(null);

  const studioRef = useRef(studio);
  studioRef.current = studio;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isRenderingRef = useRef(isRendering);
  isRenderingRef.current = isRendering;
  const isScrubRef = useRef(false);
  const currentTimeRef = useRef(0);
  const lastDrawnTRef = useRef(-1);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = openModalName !== null;
  const cancelRenderRef = useRef(false);
  const activeEncoderRef = useRef<VideoEncoder | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const userFnRef = useRef<UserDrawFn>(compileJsCanvasFn(PRESETS.bokeh.code));

  if (!renderCanvasRef.current && typeof document !== 'undefined') {
    renderCanvasRef.current = document.createElement('canvas');
  }

  // Preview resolution scaling (Light mode keeps desktop GPU cool & ultra-responsive)
  const previewDims = useMemo(() => {
    const maxD = studio.lightMode ? 720 : 1280;
    const sc = Math.min(1, maxD / Math.max(studio.width, studio.height));
    return {
      width: Math.max(2, Math.round(studio.width * sc)),
      height: Math.max(2, Math.round(studio.height * sc)),
    };
  }, [studio.width, studio.height, studio.lightMode]);

  const targetBytes = useMemo(() => getTargetBytes(studio), [studio]);
  const targetMB = useMemo(() => (targetBytes / 1048576).toFixed(2), [targetBytes]);
  const effectiveBitrate = useMemo(() => getEffectiveBitrateMbps(studio), [studio]);

  const filenamePreview = useMemo(
    () => buildFilename(encoderInfo.ext || studio.format.toLowerCase(), meta.title, meta.shortName, studio, downloadSeq + 1),
    [encoderInfo.ext, studio, meta.title, meta.shortName, downloadSeq]
  );

  // Inspect WebCodecs support whenever video configuration changes
  useEffect(() => {
    let cancelled = false;
    inspectEncoderSupport(studio).then((info) => {
      if (!cancelled) setEncoderInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [studio.width, studio.height, studio.fps, studio.format, studio.bgMode, studio.bitrateMbps, studio.targetSizeMode, studio.targetSizeMB, studio.duration]);

  // Global sandbox bridge callbacks
  useEffect(() => {
    const win = window as Window & {
      __studioErr?: (msg: string) => void;
      __studioIdle?: () => boolean;
      __studioRendering?: () => boolean;
    };
    let lastErrAt = 0;
    win.__studioErr = (msg: string) => {
      const m = String(msg || '');
      if (!m || /ResizeObserver|^Script error\.?$/i.test(m)) return;
      const now = performance.now();
      if (now - lastErrAt < 2000) return;
      lastErrAt = now;
      setTerminalError('Error di kode HTML: ' + m.slice(0, 140));
    };
    win.__studioIdle = () => modalOpenRef.current || document.hidden || !isPlayingRef.current;
    win.__studioRendering = () => isRenderingRef.current;
    return () => {
      delete win.__studioErr;
      delete win.__studioIdle;
      delete win.__studioRendering;
    };
  }, []);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    };
  }, []);

  const invalidateRender = useCallback(() => {
    setNeedsReRender(true);
    setLastRenderedMB(null);
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    setRecordedBlobUrl(null);
    setRenderBannerType('ready');
    setRenderStatusMsg(
      'Siap Render Presisi: Engine Offline Frame-by-Frame menjaga durasi, FPS, & kelancaran gerakan 100% akurat.'
    );
  }, []);

  const drawSinglePreviewFrame = useCallback((tSec: number) => {
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !ctx) return;
    lastDrawnTRef.current = tSec;
    drawFrameToTarget(ctx, canvas.width, canvas.height, tSec, studioRef.current, userFnRef.current, sandboxRef.current, false, false);
  }, []);

  // Reload HTML sandbox whenever previewDims or HTML source changes
  useEffect(() => {
    if (studio.codeMode === 'html' && studio.rawHtmlCode && sandboxRef.current && !isRendering) {
      loadHtmlIntoSandbox(sandboxRef.current, studio.rawHtmlCode, previewDims.width, previewDims.height, studio, currentTimeRef.current).then(
        () => {
          drawSinglePreviewFrame(currentTimeRef.current);
        }
      );
    }
  }, [studio.codeMode, studio.rawHtmlCode, studio.bgMode, previewDims.width, previewDims.height, isRendering, drawSinglePreviewFrame]);

  // Lightweight RAF Loop: sleeps completely when paused, hidden, or modal is open (0% idle CPU)
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let lastDraw = 0;
    let lastUiSync = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      if (!isRenderingRef.current) {
        const s = studioRef.current;
        const cap = s.lightMode ? Math.min(30, s.fps) : s.fps;

        if (isPlayingRef.current && !isScrubRef.current) {
          let nextT = currentTimeRef.current + dt;
          if (nextT >= s.duration) {
            if (s.loop) {
              nextT %= s.duration;
            } else {
              nextT = s.duration;
              isPlayingRef.current = false;
              setIsPlaying(false);
            }
          }
          currentTimeRef.current = nextT;
        }

        const timeChanged = currentTimeRef.current !== lastDrawnTRef.current;
        const canDraw = !document.hidden && !modalOpenRef.current;
        const shouldDraw = canDraw && (isPlayingRef.current || isScrubRef.current || timeChanged);

        if (shouldDraw && now - lastDraw >= 1000 / cap - 2) {
          lastDraw = now;
          drawSinglePreviewFrame(currentTimeRef.current);
          if (!isScrubRef.current && now - lastUiSync >= 40) {
            lastUiSync = now;
            setCurrentTimeUi(currentTimeRef.current);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [drawSinglePreviewFrame]);

  // Redraw preview immediately when visual settings change while paused
  useEffect(() => {
    if (!isRendering) {
      drawSinglePreviewFrame(currentTimeRef.current);
    }
  }, [studio.bgMode, studio.solidColor, previewDims.width, previewDims.height, isRendering, drawSinglePreviewFrame]);

  // Helper: sync metadata resolution/fps text if unedited
  const syncMetaWithSpec = useCallback((nextStudio: StudioSettings) => {
    setMeta((prev) => {
      const re = /\b\d{3,5}x\d{3,5}, [\d.]+s at \d+ fps/;
      if (!re.test(prev.desc)) return prev;
      let v = prev.desc.replace(re, `${nextStudio.width}x${nextStudio.height}, ${nextStudio.duration}s at ${nextStudio.fps} fps`);
      if (v.length > META_DESC_MAX) {
        v = v.replace(/\s*Ideal for intros, presentations and video backgrounds\.?/, '').trim();
      }
      if (v === prev.desc) return prev;
      return { ...prev, desc: fitDesc(v, META_DESC_MAX) };
    });
  }, []);

  const updateStudioSetting = useCallback(
    (updater: (prev: StudioSettings) => StudioSettings, shouldInvalidate = true) => {
      if (isRenderingRef.current) return;
      setStudio((prev) => {
        const next = updater(prev);
        syncMetaWithSpec(next);
        return next;
      });
      if (shouldInvalidate) invalidateRender();
    },
    [invalidateRender, syncMetaWithSpec]
  );

  const handleSetRatio = (r: AspectRatioKey) => {
    updateStudioSetting((prev) => {
      const [w, h] = RATIOS[r][prev.res];
      return { ...prev, ratio: r, width: w, height: h };
    });
  };

  const handleSetResolution = (r: ResolutionKey) => {
    updateStudioSetting((prev) => {
      const [w, h] = RATIOS[prev.ratio][r];
      return { ...prev, res: r, width: w, height: h };
    });
  };

  const handleSetDuration = (d: number) => {
    const clamped = Math.max(1, Math.min(120, isNaN(d) ? 10 : Math.round(d)));
    if (currentTimeRef.current > clamped) {
      currentTimeRef.current = 0;
      setCurrentTimeUi(0);
    }
    updateStudioSetting((prev) => ({ ...prev, duration: clamped }));
  };

  const handleSetFps = (fps: number) => {
    updateStudioSetting((prev) => ({ ...prev, fps }));
  };

  const handleSetFormat = (format: FormatKey) => {
    updateStudioSetting((prev) => ({ ...prev, format }));
  };

  const handleSetBgMode = (bgMode: BgModeKey) => {
    updateStudioSetting((prev) => ({ ...prev, bgMode }));
  };

  const handleSetSolidColor = (solidColor: string) => {
    updateStudioSetting((prev) => ({ ...prev, solidColor }));
  };

  const handleSetBitrate = (mbps: number) => {
    const clamped = Math.max(8, Math.min(80, Math.round(mbps) || 28));
    updateStudioSetting((prev) => ({ ...prev, bitrateMbps: clamped, targetSizeMode: 'auto' }));
  };

  const handleSetTargetSizeMode = (mode: 'auto' | 'custom') => {
    updateStudioSetting((prev) => ({ ...prev, targetSizeMode: mode }));
  };

  const handleSetTargetSizeMB = (mb: number) => {
    const clamped = Math.max(5, Math.min(2000, Math.round(mb) || 35));
    updateStudioSetting((prev) => ({ ...prev, targetSizeMode: 'custom', targetSizeMB: clamped }));
  };

  // Transport controls
  const togglePlay = useCallback(() => {
    if (isRenderingRef.current) return;
    setIsPlaying((prev) => {
      const next = !prev;
      if (next && currentTimeRef.current >= studioRef.current.duration) {
        currentTimeRef.current = 0;
        setCurrentTimeUi(0);
      }
      return next;
    });
  }, []);

  const stepFrame = useCallback(
    (delta: number) => {
      if (isRenderingRef.current) return;
      setIsPlaying(false);
      const s = studioRef.current;
      const step = 1 / s.fps;
      let next = currentTimeRef.current + delta * step;
      if (next < 0) next = s.duration + next;
      if (next >= s.duration) next %= s.duration;
      currentTimeRef.current = next;
      setCurrentTimeUi(next);
      drawSinglePreviewFrame(next);
    },
    [drawSinglePreviewFrame]
  );

  const resetTimeline = useCallback(() => {
    if (isRenderingRef.current) return;
    currentTimeRef.current = 0;
    setCurrentTimeUi(0);
    drawSinglePreviewFrame(0);
  }, [drawSinglePreviewFrame]);

  const toggleFullscreen = useCallback(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const reloadAnimation = useCallback(() => {
    if (isRenderingRef.current) return;
    currentTimeRef.current = 0;
    setCurrentTimeUi(0);
    setIsPlaying(true);
    if (studioRef.current.codeMode === 'html' && studioRef.current.rawHtmlCode && sandboxRef.current) {
      loadHtmlIntoSandbox(
        sandboxRef.current,
        studioRef.current.rawHtmlCode,
        previewDims.width,
        previewDims.height,
        studioRef.current,
        0
      ).then(() => drawSinglePreviewFrame(0));
    } else {
      drawSinglePreviewFrame(0);
    }
  }, [previewDims.width, previewDims.height, drawSinglePreviewFrame]);

  const analyzeLoad = useCallback(() => {
    const eff = effectiveBitrate >= 10 ? Math.round(effectiveBitrate) : effectiveBitrate.toFixed(1);
    const tf = Math.round(studio.duration * studio.fps);
    setRenderBannerType('ready');
    setRenderStatusMsg(
      `Analisis Proyek: "${studio.videoTitle}" · ${studio.width}×${studio.height} (${studio.ratio}) · ${studio.duration}s @ ${studio.fps}fps (${tf} frame) · ${eff} Mbps · Estimasi ${targetMB} MB · Engine ${encoderInfo.engineLabel}.`
    );
  }, [effectiveBitrate, studio, targetMB, encoderInfo.engineLabel]);

  // Metadata helpers
  const buildLiveMetaSnapshot = useCallback(
    (overrideTitle?: string): MetaSnapshot => {
      const t = fitTitle(noBrand(overrideTitle || meta.title.trim() || studio.videoTitle), META_TITLE_MAX) || 'Motion Background';
      const d = noBrand(meta.desc.trim());
      const kws = parseKw(meta.keywords).map(noBrand).filter(Boolean).slice(0, 50);
      return {
        title: t,
        desc: fitDesc(d || t, META_DESC_MAX),
        keywords: kws,
        cat: meta.cat,
        catName: catName(meta.cat),
      };
    },
    [meta, studio.videoTitle]
  );

  const applyExtractedMetaToState = useCallback(
    (code: string, nameHint?: string) => {
      setMetaCodeSource(code);
      const ex = extractMetaFromCode(code, studioRef.current, nameHint);
      setMeta((prev) => ({
        ...prev,
        title: fitTitle(ex.title, META_TITLE_MAX),
        desc: fitDesc(ex.description, META_DESC_MAX),
        keywords: ex.keywords.slice(0, 50).join(', '),
        cat: ex.cat,
        touched: false,
      }));
      const cleanT = cleanTitle(ex.title);
      if (cleanT) {
        setStudio((prev) => ({ ...prev, videoTitle: cleanT }));
      }
      setMetaMsg(
        (ex.found ? `Metadata dari tag kode HTML: ${ex.fields.join(', ')}.` : 'Tidak ada tag stock-* di kode.') +
          (ex.derived.length ? ` Dilengkapi dari analisis isi animasi: ${ex.derived.join(', ')}.` : '') +
          (ex.brandRemoved ? ' Nama brand dibuang.' : '')
      );
    },
    []
  );

  const handleAutoFillMeta = () => {
    const src = editorCode.trim() ? stripMarkdownCodeFences(editorCode) : metaCodeSource;
    const d = buildMeta(studio.videoTitle, src, studio);
    setMeta((prev) => ({
      ...prev,
      title: d.title,
      desc: d.description,
      keywords: d.keywords.join(', '),
      cat: d.cat,
      touched: false,
    }));
    setMetaMsg(
      src
        ? 'Terisi otomatis dari analisis kode HTML. Edit sesuai kebutuhan.'
        : 'Terisi dari judul video.'
    );
  };

  const handleCopyText = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setMetaMsg(`${label} berhasil disalin.`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setMetaMsg(`${label} berhasil disalin.`);
      } catch {
        setMetaMsg('Gagal menyalin otomatis, silakan salin manual.');
      }
      ta.remove();
    }
  };

  const handleCopyMetaAiPrompt = () => {
    const names = ADOBE_CATS.map((c) => c[1]).join(' | ');
    const d = buildMeta(studio.videoTitle, metaCodeSource, studio);
    const looks = [
      d.visuals.length ? `visual elements: ${d.visuals.slice(0, 12).join(', ')}` : '',
      d.colors.length ? `main colors: ${d.colors.join(', ')}` : '',
      d.texts.length ? `text shown in video: ${d.texts.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('; ');
    const prompt = `Act as a stock video metadata expert for Adobe Stock and Vecteezy.
Video: "${noBrand(studio.videoTitle)}" - animated motion graphics, ${studio.width}x${studio.height}, ${studio.duration}s, ${studio.fps}fps${studio.loop ? ', seamless loop' : ''}.
${looks ? `What is actually visible in the video (${looks}).\n` : ''}Base the metadata ONLY on what is really visible in the video. Do not invent elements or colors. Never mention any website, studio, software, tool or brand name.
Return ONLY one JSON object, no explanation:
{"title":"max ${META_TITLE_MAX} chars, English, descriptive, no commas or special characters","description":"1-2 sentences, max ${META_DESC_MAX} chars, English","keywords":["exactly 50 English keywords","ordered by importance","no duplicates","no brand names"],"category":"one of: ${names}"}`;
    handleCopyText(prompt, 'Prompt Metadata AI');
  };

  const handleApplyMetaJson = (rawInput: string) => {
    try {
      const raw = stripMarkdownCodeFences(rawInput);
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      setMeta((prev) => {
        const next = { ...prev, touched: true };
        if (j.title) next.title = fitTitle(noBrand(j.title), META_TITLE_MAX);
        if (j.description) next.desc = fitDesc(noBrand(j.description), META_DESC_MAX);
        if (j.keywords) {
          next.keywords = parseKw(Array.isArray(j.keywords) ? j.keywords.join(',') : j.keywords)
            .map(noBrand)
            .filter(Boolean)
            .slice(0, 50)
            .join(', ');
        }
        if (j.category != null) {
          const found = ADOBE_CATS.find(
            (x) => String(x[0]) === String(j.category) || x[1].toLowerCase() === String(j.category).toLowerCase()
          );
          if (found) next.cat = found[0];
        }
        return next;
      });
      setMetaMsg('JSON metadata berhasil diterapkan.');
    } catch (e) {
      setMetaMsg('JSON tidak valid: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleExportCsv = (kind: 'adobe' | 'vecteezy' | 'both') => {
    const snap = buildLiveMetaSnapshot();
    const res = exportCsvFiles(kind, downloadLog, snap);
    if (!res.count) {
      setMetaMsg('Download video dulu — CSV memakai nama file hasil download supaya cocok saat upload.');
      return;
    }
    setMetaMsg(
      `CSV ${res.count} baris diunduh.` +
        (res.longCount && kind !== 'vecteezy'
          ? ` ${res.longCount} nama file >30 karakter (batas Adobe) — aktifkan "Nama file pendek".`
          : '')
    );
  };

  // Apply custom code from Terminal or Preset
  const applyCodeToStudio = useCallback(
    async (rawCode: string, keepTitle = false, explicitTitle?: string) => {
      if (isRenderingRef.current) return;
      const code = stripMarkdownCodeFences(rawCode);
      if (!code) return;

      setTerminalError('');
      const nextTitle = keepTitle
        ? explicitTitle || studioRef.current.videoTitle
        : explicitTitle || detectVideoTitleFromCode(code, studioRef.current.lastPromptTitle);

      if (isHtmlDocumentCode(code)) {
        setStudio((prev) => ({
          ...prev,
          codeMode: 'html',
          rawHtmlCode: code,
          videoTitle: nextTitle,
        }));
        applyExtractedMetaToState(code, nextTitle);
        if (sandboxRef.current) {
          await loadHtmlIntoSandbox(
            sandboxRef.current,
            code,
            previewDims.width,
            previewDims.height,
            studioRef.current,
            0
          );
          const canvasFound = await waitForSandboxCanvas(sandboxRef.current, 3000);
          if (!canvasFound) {
            setRenderBannerType('error');
            setRenderStatusMsg('HTML dimuat, tetapi tidak ada elemen <canvas>. Studio hanya mendukung animasi HTML5 Canvas.');
          }
        }
        currentTimeRef.current = 0;
        setCurrentTimeUi(0);
        setIsPlaying(true);
        invalidateRender();
        setOpenModalName(null);
        return;
      }

      // Compile JS Canvas function
      const fn = compileJsCanvasFn(code);
      userFnRef.current = fn;
      if (sandboxRef.current) sandboxRef.current.srcdoc = '';
      setStudio((prev) => ({
        ...prev,
        codeMode: 'js',
        rawHtmlCode: '',
        jsCode: code,
        videoTitle: nextTitle,
      }));
      applyExtractedMetaToState(code, nextTitle);
      currentTimeRef.current = 0;
      setCurrentTimeUi(0);
      setIsPlaying(true);
      invalidateRender();
      setOpenModalName(null);
      drawSinglePreviewFrame(0);
    },
    [applyExtractedMetaToState, drawSinglePreviewFrame, invalidateRender, previewDims.width, previewDims.height]
  );

  // Single Video Render
  const handleStartRender = async () => {
    if (isRenderingRef.current || batchRunning) return;
    const renderCanvas = renderCanvasRef.current;
    const renderCtx = renderCanvas?.getContext('2d', { alpha: true });
    if (!renderCanvas || !renderCtx) return;

    setIsRendering(true);
    isRenderingRef.current = true;
    cancelRenderRef.current = false;
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTimeUi(0);
    setRenderProgress(0);
    setRenderBannerType('rendering');
    setRenderStatusMsg(`Menyiapkan kanvas (${studio.width}×${studio.height})...`);

    const totalFrames = Math.max(1, Math.round(studio.duration * studio.fps));
    const snap = meta.embed ? buildLiveMetaSnapshot() : null;
    if (snap) setEmbedSig(JSON.stringify(snap));
    else setEmbedSig('');

    try {
      const result = await executeVideoRender(
        studio,
        userFnRef.current,
        sandboxRef.current,
        renderCanvas,
        renderCtx,
        snap,
        {
          isCancelled: () => cancelRenderRef.current,
          onProgress: (pct, _frame, _tot, message) => {
            setRenderProgress(pct);
            setRenderStatusMsg(message);
          },
          onPreviewUpdate: (tSec, rc) => {
            currentTimeRef.current = tSec;
            setCurrentTimeUi(tSec);
            const pCanvas = previewCanvasRef.current;
            const pCtx = pCanvas?.getContext('2d', { alpha: true });
            if (pCanvas && pCtx) {
              pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
              pCtx.drawImage(rc, 0, 0, pCanvas.width, pCanvas.height);
            }
          },
          onEncoderRef: (enc) => {
            activeEncoderRef.current = enc;
          },
        }
      );

      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
      const url = URL.createObjectURL(result.blob);
      recordedUrlRef.current = url;
      setRecordedBlobUrl(url);
      setRecordedExt(result.ext);
      setNeedsReRender(false);

      const actualMB = (result.blob.size / 1048576).toFixed(2);
      const actualMbps = ((result.blob.size * 8) / (studio.duration * 1_000_000)).toFixed(1);
      setLastRenderedMB(actualMB);
      setRenderProgress(100);
      setRenderBannerType('done');
      setRenderStatusMsg(
        `${result.viaMR ? 'Render Selesai (MediaRecorder):' : 'Render Selesai Presisi!'} "${studio.videoTitle}" (${studio.duration.toFixed(2)}s · ${totalFrames} frame @ ${studio.fps}fps · ${actualMB} MB · ~${actualMbps} Mbps)` +
          (meta.embed && !result.viaMR ? ' · Metadata tertanam di file.' : '')
      );
    } catch (err) {
      try {
        if (activeEncoderRef.current && activeEncoderRef.current.state !== 'closed') {
          activeEncoderRef.current.close();
        }
      } catch {
        // ignore
      }
      activeEncoderRef.current = null;
      const cancelled = cancelRenderRef.current;
      setRenderBannerType(cancelled ? 'ready' : 'error');
      setRenderStatusMsg(
        cancelled
          ? 'Render dibatalkan.'
          : `Gagal render: ${err instanceof Error ? err.message : 'Error encoder'}. Coba format WebM atau turunkan resolusi/bitrate.`
      );
    } finally {
      setIsRendering(false);
      isRenderingRef.current = false;
      setIsPlaying(true);
    }
  };

  const handleCancelRender = () => {
    cancelRenderRef.current = true;
    batchCancelRef.current = true;
  };

  const handleDownload = () => {
    if (!recordedBlobUrl || needsReRender) return;
    const nextSeq = downloadSeq + 1;
    setDownloadSeq(nextSeq);
    const fn = buildFilename(recordedExt, meta.title, meta.shortName, studio, nextSeq);
    const snap = buildLiveMetaSnapshot();

    setDownloadLog((prev) => [
      ...prev.map((e) => ({ ...e, live: false })),
      { filename: fn, live: true, snap },
    ]);

    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setRenderStatusMsg(`Terunduh: ${fn}`);
    if (meta.embed && embedSig && embedSig !== JSON.stringify(snap)) {
      setMetaMsg('Metadata diubah setelah render: file memuat versi lama, CSV memakai versi terbaru.');
    }
  };

  // === BATCH RENDER QUEUE HANDLERS ===
  const addBatchCodes = useCallback(
    (codes: string[], names?: string[]) => {
      let added = 0;
      let skipped = 0;
      setBatchItems((prev) => {
        const next = [...prev];
        codes.forEach((raw, i) => {
          const code = stripMarkdownCodeFences(raw);
          if (!code) return;
          if (next.length >= BATCH_MAX) {
            skipped++;
            return;
          }
          const mt = extractMetaFromCode(code, studioRef.current);
          next.push({
            id: ++batchSeqRef.current,
            code,
            name: (names && names[i]) || mt.title || detectVideoTitleFromCode(code, `Video ${next.length + 1}`),
            status: 'wait',
            pct: 0,
            msg: '',
            meta: mt,
          });
          added++;
        });
        return next;
      });
      setBatchStatusMsg(
        added || skipped
          ? `${added} video ditambahkan ke antrean.` + (skipped ? ` ${skipped} dilewati (maksimal ${BATCH_MAX}).` : '')
          : 'Tidak ada kode valid untuk ditambahkan.'
      );
    },
    []
  );

  const handleAddBatchFiles = useCallback(
    async (files: File[]) => {
      if (batchRunning) return;
      const zips = files.filter((f) => /\.zip$/i.test(f.name));
      const ok = files
        .filter((f) => /\.(html?|js|txt)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const bad = files.length - ok.length - zips.length;
      const codes: string[] = [];
      const names: string[] = [];
      let fail = 0;
      const zipErrors: string[] = [];

      for (const z of zips) {
        try {
          const res = await readZipHtml(z);
          res.items.forEach((it) => {
            if (it.text.trim()) {
              codes.push(it.text);
              names.push(it.name);
            } else {
              fail++;
            }
          });
          fail += res.skipped;
          if (!res.items.length && !res.skipped) {
            zipErrors.push(`"${z.name}" tidak berisi file HTML`);
          }
        } catch (err) {
          zipErrors.push(`"${z.name}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      for (const f of ok) {
        try {
          const tx = await f.text();
          if (tx.trim()) {
            codes.push(tx);
            names.push(f.name.replace(/\.[^.]+$/, ''));
          } else fail++;
        } catch {
          fail++;
        }
      }

      addBatchCodes(codes, names);
      const notes: string[] = [];
      if (zips.length) notes.push(`dari ${zips.length} ZIP`);
      if (bad) notes.push(`${bad} file bukan HTML/JS/ZIP dilewati`);
      if (fail) notes.push(`${fail} kosong/dienkripsi/gagal`);
      if (zipErrors.length) notes.push(zipErrors.join('; '));
      if (notes.length) {
        setBatchStatusMsg((m) => `${m} (${notes.join(' · ')})`);
      }
    },
    [addBatchCodes, batchRunning]
  );

  const handleAddBatchText = (raw: string) => {
    if (batchRunning) return;
    const t = raw || '';
    const blocks = [...t.matchAll(/```[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```/g)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    const codes = blocks.length ? blocks : t.split(/^[ \t]*={3,}.*$/m).map((x) => x.trim()).filter(Boolean);
    if (!codes.length) {
      setBatchStatusMsg('Tempel kode dulu. Pisahkan banyak kode dengan baris ===== atau blok kode.');
      return;
    }
    addBatchCodes(codes);
  };

  const handlePickBatchFolder = async () => {
    const picker = (window as Window & { showDirectoryPicker?: (opts: { mode: string }) => Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker;
    if (!picker) return;
    try {
      const dir = await picker({ mode: 'readwrite' });
      batchDirRef.current = dir;
      setBatchFolderName(dir.name);
    } catch {
      setBatchStatusMsg('Pemilihan folder dibatalkan. Memakai download otomatis.');
    }
  };

  const handleStartBatch = async () => {
    if (batchRunning || isRenderingRef.current) return;
    const renderCanvas = renderCanvasRef.current;
    const renderCtx = renderCanvas?.getContext('2d', { alpha: true });
    if (!renderCanvas || !renderCtx) return;

    const todo = batchItems.filter((x) => x.status !== 'done');
    if (!todo.length) return;

    setBatchRunning(true);
    setIsRendering(true);
    isRenderingRef.current = true;
    batchCancelRef.current = false;
    cancelRenderRef.current = false;
    setIsPlaying(false);
    setBatchStatusMsg('');
    batchLogStartRef.current = downloadLog.length;

    let wakeLock: WakeLockSentinel | null = null;
    try {
      if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    } catch {
      // optional
    }

    const keepUserFn = userFnRef.current;
    const keepStudio = { ...studioRef.current };
    const newLogs: DownloadLogEntry[] = [];
    let okCount = 0;
    let failCount = 0;
    let seqCursor = downloadSeq;

    try {
      for (let i = 0; i < todo.length; i++) {
        if (batchCancelRef.current) break;
        const item = todo[i];
        setBatchItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: 'run', pct: 0, msg: '' } : x))
        );
        setRenderBannerType('rendering');
        setRenderStatusMsg(`Render Massal [${i + 1}/${todo.length}] "${item.name}"...`);

        try {
          const isHtml = isHtmlDocumentCode(item.code);
          const itemStudio: StudioSettings = {
            ...keepStudio,
            codeMode: isHtml ? 'html' : 'js',
            rawHtmlCode: isHtml ? item.code : '',
            videoTitle: item.name,
          };
          const itemFn = isHtml ? keepUserFn : compileJsCanvasFn(item.code);

          const snap: MetaSnapshot | null = meta.embed
            ? {
                title: fitTitle(noBrand(item.meta.title || item.name), META_TITLE_MAX) || 'Motion Background',
                desc: fitDesc(noBrand(item.meta.description || item.name), META_DESC_MAX),
                keywords: item.meta.keywords.slice(0, 50),
                cat: item.meta.cat || 8,
                catName: catName(item.meta.cat || 8),
              }
            : null;

          const res = await executeVideoRender(itemStudio, itemFn, sandboxRef.current, renderCanvas, renderCtx, snap, {
            isCancelled: () => batchCancelRef.current,
            onProgress: (pct) => {
              setRenderProgress(pct);
              setBatchItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, pct } : x)));
            },
            onPreviewUpdate: () => {},
            onEncoderRef: (enc) => {
              activeEncoderRef.current = enc;
            },
          });

          seqCursor += 1;
          const fn = buildFilename(res.ext, item.meta.title || item.name, meta.shortName, itemStudio, seqCursor);
          const logSnap: MetaSnapshot = snap || {
            title: fitTitle(noBrand(item.meta.title || item.name), META_TITLE_MAX),
            desc: fitDesc(noBrand(item.meta.description || item.name), META_DESC_MAX),
            keywords: item.meta.keywords.slice(0, 50),
            cat: item.meta.cat || 8,
            catName: catName(item.meta.cat || 8),
          };
          newLogs.push({ filename: fn, live: false, snap: logSnap });

          if (batchDirRef.current) {
            try {
              const fh = await batchDirRef.current.getFileHandle(fn, { create: true });
              const writable = await fh.createWritable();
              await writable.write(res.blob);
              await writable.close();
            } catch {
              batchDirRef.current = null;
              setBatchFolderName(null);
              const u = URL.createObjectURL(res.blob);
              const a = document.createElement('a');
              a.href = u;
              a.download = fn;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(u), 25000);
              await new Promise((r) => setTimeout(r, 700));
            }
          } else {
            const u = URL.createObjectURL(res.blob);
            const a = document.createElement('a');
            a.href = u;
            a.download = fn;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(u), 25000);
            await new Promise((r) => setTimeout(r, 700));
          }

          okCount++;
          setBatchItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'done', pct: 100 } : x))
          );
        } catch (err) {
          if (batchCancelRef.current) {
            setBatchItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: 'wait', pct: 0 } : x)));
            break;
          }
          failCount++;
          const msg = err instanceof Error ? err.message : String(err);
          setBatchItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'fail', pct: 0, msg } : x))
          );
        }
      }
    } finally {
      userFnRef.current = keepUserFn;
      if (keepStudio.codeMode === 'html' && keepStudio.rawHtmlCode && sandboxRef.current) {
        loadHtmlIntoSandbox(
          sandboxRef.current,
          keepStudio.rawHtmlCode,
          previewDims.width,
          previewDims.height,
          keepStudio,
          currentTimeRef.current
        );
      } else if (sandboxRef.current) {
        sandboxRef.current.srcdoc = '';
      }

      let csvCount = 0;
      if (newLogs.length) {
        setDownloadSeq(seqCursor);
        const mergedLogs = [...downloadLog, ...newLogs];
        setDownloadLog(mergedLogs);
        setHasBatchLogs(true);
        if (meta.autoCsv !== 'none') {
          csvCount = await exportBatchCsvToDir(meta.autoCsv, newLogs, batchDirRef.current);
        }
      }

      setBatchRunning(false);
      setIsRendering(false);
      isRenderingRef.current = false;
      setIsPlaying(true);
      if (wakeLock) wakeLock.release().catch(() => {});

      const doneMsg =
        (batchCancelRef.current
          ? `Render massal dibatalkan. ${okCount} selesai, ${failCount} gagal.`
          : `Render massal selesai: ${okCount} berhasil, ${failCount} gagal.`) +
        (csvCount ? ` · CSV metadata (${csvCount} baris) tersimpan.` : '');
      setBatchStatusMsg(doneMsg);
      setRenderBannerType(failCount > 0 && okCount === 0 ? 'error' : 'done');
      setRenderStatusMsg(doneMsg);
      return;
    }
  };

  const handleDownloadBatchCsv = async () => {
    const logs = downloadLog.slice(batchLogStartRef.current);
    const rows = logs.length ? logs : downloadLog;
    if (!rows.length) {
      setBatchStatusMsg('Belum ada video selesai dirender di sesi Render Massal ini.');
      return;
    }
    const kind = meta.autoCsv === 'none' ? 'both' : meta.autoCsv;
    const cnt = await exportBatchCsvToDir(kind, rows, batchDirRef.current);
    setBatchStatusMsg(
      `CSV metadata (${cnt} baris) ${batchDirRef.current ? `tersimpan ke folder "${batchDirRef.current.name}"` : 'diunduh'}.`
    );
  };

  // Desktop keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!batchRunning) setOpenModalName(null);
        return;
      }
      if (openModalName !== null) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        resetTimeline();
      } else if (e.key === 'g' || e.key === 'G') {
        updateStudioSetting((p) => ({ ...p, gridVisible: !p.gridVisible }), false);
      } else if (e.key === 'l' || e.key === 'L') {
        updateStudioSetting((p) => ({ ...p, loop: !p.loop }), false);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openModalName, batchRunning, togglePlay, stepFrame, resetTimeline, toggleFullscreen, updateStudioSetting]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#090B10] text-slate-100 lg:overflow-hidden">
      {/* Hidden deterministic HTML5 Canvas sandbox */}
      <iframe
        ref={sandboxRef}
        title="HTML Canvas Sandbox"
        sandbox="allow-scripts allow-same-origin"
        className="fixed top-0 left-0 border-0 opacity-[0.001] pointer-events-none -z-10 scale-[0.01] origin-top-left"
      />

      <TopBar
        isRendering={isRendering}
        onOpenCode={() => setOpenModalName('code')}
        onOpenPrompt={() => setOpenModalName('prompt')}
        onOpenPreset={() => setOpenModalName('preset')}
        onOpenBatch={() => setOpenModalName('batch')}
        onOpenVideoRef={() => setOpenModalName('videoref')}
        onOpenHelp={() => setOpenModalName('help')}
        onRenderOrCancel={isRendering ? handleCancelRender : handleStartRender}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <PreviewStage
          studio={studio}
          previewBoxRef={previewBoxRef}
          previewCanvasRef={previewCanvasRef}
          previewDims={previewDims}
          currentTime={currentTimeUi}
          isPlaying={isPlaying}
          isRendering={isRendering}
          renderProgress={renderProgress}
          renderStatusMsg={renderStatusMsg}
          renderBannerType={renderBannerType}
          recordedBlobUrl={recordedBlobUrl}
          lastRenderedMB={lastRenderedMB}
          needsReRender={needsReRender}
          filenamePreview={filenamePreview}
          encoderInfo={encoderInfo}
          effectiveBitrate={effectiveBitrate}
          targetMB={targetMB}
          onTogglePlay={togglePlay}
          onStepFrame={stepFrame}
          onResetTimeline={resetTimeline}
          onToggleLoop={() => updateStudioSetting((p) => ({ ...p, loop: !p.loop }), false)}
          onScrubStart={() => {
            isScrubRef.current = true;
          }}
          onScrubEnd={() => {
            isScrubRef.current = false;
          }}
          onScrubChange={(val) => {
            if (isRenderingRef.current) return;
            const nextT = (val / 1000) * studioRef.current.duration;
            currentTimeRef.current = nextT;
            setCurrentTimeUi(nextT);
            drawSinglePreviewFrame(nextT);
          }}
          onToggleLightMode={() => updateStudioSetting((p) => ({ ...p, lightMode: !p.lightMode }), false)}
          onToggleGrid={() => updateStudioSetting((p) => ({ ...p, gridVisible: !p.gridVisible }), false)}
          onReload={reloadAnimation}
          onToggleFullscreen={toggleFullscreen}
          onAnalyzeLoad={analyzeLoad}
          onOpenCode={() => setOpenModalName('code')}
          onOpenVideoRef={() => setOpenModalName('videoref')}
          onTitleChange={(val) => {
            const clean = noBrand(val) || 'Motion Video';
            setStudio((prev) => ({ ...prev, videoTitle: clean }));
            if (!meta.touched) {
              const d = buildMeta(clean, metaCodeSource, studio);
              setMeta((prev) => ({ ...prev, title: d.title, desc: d.description, keywords: d.keywords.join(', '), cat: d.cat }));
            }
          }}
          onStartRender={handleStartRender}
          onCancelRender={handleCancelRender}
          onDownload={handleDownload}
        />

        <InspectorPanel
          studio={studio}
          meta={meta}
          downloadLog={downloadLog}
          encoderInfo={encoderInfo}
          effectiveBitrate={effectiveBitrate}
          targetMB={targetMB}
          targetBytes={targetBytes}
          isRendering={isRendering}
          metaMsg={metaMsg}
          onSetRatio={handleSetRatio}
          onSetResolution={handleSetResolution}
          onSetDuration={handleSetDuration}
          onSetFps={handleSetFps}
          onSetFormat={handleSetFormat}
          onSetBgMode={handleSetBgMode}
          onSetSolidColor={handleSetSolidColor}
          onSetBitrate={handleSetBitrate}
          onSetTargetSizeMode={handleSetTargetSizeMode}
          onSetTargetSizeMB={handleSetTargetSizeMB}
          onMetaChange={(patch, userEdited) =>
            setMeta((prev) => ({ ...prev, ...patch, touched: userEdited ? true : prev.touched }))
          }
          onAutoFillMeta={handleAutoFillMeta}
          onCopyMetaAiPrompt={handleCopyMetaAiPrompt}
          onApplyMetaJson={handleApplyMetaJson}
          onExportCsv={handleExportCsv}
          onCopyMetaField={(field) => {
            const snap = buildLiveMetaSnapshot();
            handleCopyText(
              field === 'title' ? snap.title : field === 'desc' ? snap.desc : snap.keywords.join(', '),
              field === 'title' ? 'Judul' : field === 'desc' ? 'Deskripsi' : 'Keyword'
            );
          }}
          onClearMetaLog={() => {
            setDownloadLog([]);
            batchLogStartRef.current = 0;
            setHasBatchLogs(false);
            setMetaMsg('Riwayat CSV dikosongkan.');
          }}
        />
      </main>

      <CodeTerminalModal
        open={openModalName === 'code'}
        code={editorCode}
        isRendering={isRendering}
        externalError={terminalError}
        onChangeCode={(c) => {
          setEditorCode(c);
          setTerminalError('');
        }}
        onClose={() => setOpenModalName(null)}
        onApply={applyCodeToStudio}
        onResetDefault={() => {
          setEditorCode(PRESETS.bokeh.code);
          applyCodeToStudio(PRESETS.bokeh.code, false, PRESETS.bokeh.title);
        }}
        onOpenPrompt={() => setOpenModalName('prompt')}
        onRouteMultiFilesToBatch={async (files) => {
          await handleAddBatchFiles(files);
          setOpenModalName('batch');
        }}
      />

      <PromptAiModal
        open={openModalName === 'prompt'}
        studio={studio}
        config={promptConfig}
        isRendering={isRendering}
        onChangeConfig={(patch) => setPromptConfig((prev) => ({ ...prev, ...patch }))}
        onChangeStudioSpec={(patch) => {
          if (patch.ratio) handleSetRatio(patch.ratio);
          if (patch.res) handleSetResolution(patch.res);
          if (patch.duration !== undefined) handleSetDuration(patch.duration);
          if (patch.fps !== undefined) handleSetFps(patch.fps);
        }}
        onClose={() => setOpenModalName(null)}
        onGoTerminal={() => setOpenModalName('code')}
        onSyncPromptTitle={(title) => setStudio((prev) => ({ ...prev, lastPromptTitle: title }))}
      />

      <BatchRenderModal
        open={openModalName === 'batch'}
        studio={studio}
        items={batchItems}
        maxItems={BATCH_MAX}
        running={batchRunning}
        folderName={batchFolderName}
        statusMsg={batchStatusMsg}
        hasBatchLogs={hasBatchLogs || downloadLog.length > 0}
        onClose={() => {
          if (!batchRunning) setOpenModalName(null);
        }}
        onAddFiles={handleAddBatchFiles}
        onAddText={handleAddBatchText}
        onAddFromEditor={() => {
          const c = stripMarkdownCodeFences(editorCode);
          if (!c) {
            setBatchStatusMsg('Terminal Kode masih kosong.');
            return;
          }
          addBatchCodes([c], [studio.videoTitle]);
        }}
        onRemoveItem={(id) => {
          if (!batchRunning) setBatchItems((prev) => prev.filter((x) => x.id !== id));
        }}
        onClear={() => {
          if (!batchRunning) {
            setBatchItems([]);
            setBatchStatusMsg('');
          }
        }}
        onPickFolder={handlePickBatchFolder}
        onStart={handleStartBatch}
        onCancel={() => {
          batchCancelRef.current = true;
          cancelRenderRef.current = true;
          setBatchStatusMsg('Membatalkan...');
        }}
        onDownloadBatchCsv={handleDownloadBatchCsv}
      />

      <VideoRefModal
        open={openModalName === 'videoref'}
        studio={studio}
        promptBgStyle={promptConfig.bgStyle}
        promptCustomBgText={promptConfig.customBgText}
        onClose={() => setOpenModalName(null)}
        onSyncStudio={(patch) => {
          updateStudioSetting((prev) => {
            const nextRatio = patch.ratio || prev.ratio;
            const [w, h] = RATIOS[nextRatio][prev.res];
            return {
              ...prev,
              ratio: nextRatio,
              width: w,
              height: h,
              duration: patch.duration !== undefined ? Math.max(1, Math.min(120, Math.round(patch.duration))) : prev.duration,
              fps: patch.fps !== undefined ? patch.fps : prev.fps,
            };
          });
        }}
      />

      <PresetModal
        open={openModalName === 'preset'}
        onClose={() => setOpenModalName(null)}
        onSelectPreset={(id) => {
          const p = PRESETS[id];
          setEditorCode(p.code);
          applyCodeToStudio(p.code, false, p.title);
        }}
      />

      <HelpModal open={openModalName === 'help'} onClose={() => setOpenModalName(null)} />
    </div>
  );
}
