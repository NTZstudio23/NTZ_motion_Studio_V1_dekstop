import { MetaSnapshot, StudioSettings } from '../types/studio';
import {
  buildMp4Blob,
  buildWebmBlob,
  EncodedSample,
  findBestWebCodecsConfig,
  getEffectiveBitrateMbps,
  getTargetBytes,
  padBlob,
  pickMRConfig,
  WebCodecsSelection,
} from './muxers';

export type UserDrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  progress: number,
  duration: number,
  bgMode: string
) => void;

export function stripMarkdownCodeFences(t: string): string {
  if (/^\s*(?:<!doctype|<html[\s>]|<head[\s>]|<body[\s>]|<canvas[\s>]|<!--)/i.test(t)) return t.trim();
  const blocks = [...t.matchAll(/```[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```/g)].map((m) => m[1]);
  if (blocks.length) {
    blocks.sort((a, b) => b.length - a.length);
    return blocks[0].trim();
  }
  let c = t.trim();
  const s = /^`{3}[a-zA-Z0-9_-]*\s*\n/;
  const e = /\n`{3}\s*$/;
  if (s.test(c)) c = c.replace(s, '').replace(e, '');
  return c.trim();
}

export function compileJsCanvasFn(code: string): UserDrawFn {
  const isDraw = /\bfunction\s+draw\s*\(|\b(?:const|let|var)\s+draw\s*=/.test(code);
  const fn = new Function(
    'ctx',
    'w',
    'h',
    't',
    'progress',
    'duration',
    'bgMode',
    isDraw ? `${code}\n;window.STUDIO_BG_MODE=bgMode;return draw(ctx,t,w,h);` : code
  );
  return fn as UserDrawFn;
}

export function isHtmlDocumentCode(code: string): boolean {
  return /<!doctype|<html[\s>]|<body[\s>]/i.test(code) || /^\s*<(?:!--|canvas|script|style|div|head|meta|title)/i.test(code);
}

// Fast micro-yield using MessageChannel to avoid Chrome's 4ms nested setTimeout throttling
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof MessageChannel !== 'undefined') {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(null);
    } else {
      setTimeout(resolve, 0);
    }
  });

export function loadHtmlIntoSandbox(
  sandbox: HTMLIFrameElement,
  html: string,
  tw: number,
  th: number,
  studio: Pick<StudioSettings, 'duration' | 'fps' | 'bgMode'>,
  currentTime: number
): Promise<void> {
  return new Promise((res) => {
    sandbox.style.width = `${tw}px`;
    sandbox.style.height = `${th}px`;
    const tc = studio.bgMode === 'transparent' ? '<style>html,body{background:transparent!important;}</style>' : '';
    const bridge = `<script>
window.addEventListener('error',function(e){try{window.parent.__studioErr&&window.parent.__studioErr(e.message)}catch(_){}});
window.addEventListener('unhandledrejection',function(e){try{window.parent.__studioErr&&window.parent.__studioErr(String(e.reason&&e.reason.message||e.reason))}catch(_){}});
window.STUDIO_WIDTH=${tw};
window.STUDIO_HEIGHT=${th};
window.STUDIO_DURATION=${studio.duration};
window.STUDIO_FPS=${studio.fps};
window.STUDIO_BG_MODE="${studio.bgMode}";
window.STUDIO_TIME=${currentTime};
(function(){
  var raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window),map={},nid=1,curTs=-1,allow=true,lastRun=-1e9;
  window.requestAnimationFrame=function(cb){
    var id=nid++;
    function run(ts){
      if(ts!==curTs){
        curTs=ts;
        var P=null;try{P=window.parent;}catch(e){}
        var rn=false,idle=false;
        try{rn=!!(P&&P.__studioRendering&&P.__studioRendering());idle=!!(P&&P.__studioIdle&&P.__studioIdle());}catch(e){}
        allow=rn||ts-lastRun>=(idle?250:28);
        if(allow)lastRun=ts;
      }
      if(allow){delete map[id];cb(ts);}else map[id]=raf(run);
    }
    map[id]=raf(run);
    return id;
  };
  window.cancelAnimationFrame=function(id){if(map[id]!=null){caf(map[id]);delete map[id];}else caf(id);};
  var pn=performance.now.bind(performance),dn=Date.now;
  function T(){return typeof window.STUDIO_TIME==='number'?window.STUDIO_TIME:null;}
  try{
    performance.now=function(){var v=T();return v===null?pn():v*1000;};
    Date.now=function(){var v=T();return v===null?dn():1700000000000+v*1000;};
  }catch(e){}
})();
<\/script>${tc}`;

    let f = html;
    if (/<head[^>]*>/i.test(f)) f = f.replace(/<head[^>]*>/i, (m) => m + bridge);
    else if (/<html[^>]*>/i.test(f)) f = f.replace(/<html[^>]*>/i, (m) => m + '<head>' + bridge + '</head>');
    else f = bridge + f;

    let done = false;
    const ok = () => {
      if (!done) {
        done = true;
        res();
      }
    };
    sandbox.onload = () => setTimeout(ok, 100);
    setTimeout(ok, 650);
    sandbox.srcdoc = f;
  });
}

export async function waitForSandboxCanvas(sandbox: HTMLIFrameElement, ms: number): Promise<HTMLCanvasElement | null> {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    try {
      const d = sandbox.contentDocument;
      const cs = d ? [...d.querySelectorAll('canvas')].filter((c) => c.width > 0 && c.height > 0) : [];
      if (cs.length) return cs.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    } catch {
      // Wait for doc readiness
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

export function drawFrameToTarget(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tSec: number,
  studio: StudioSettings,
  userFn: UserDrawFn,
  sandbox: HTMLIFrameElement | null,
  isVideoTarget: boolean,
  alphaOut: boolean,
  strict = false
) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = isVideoTarget ? 'high' : 'medium';
  ctx.clearRect(0, 0, w, h);

  if (studio.bgMode === 'solid') {
    ctx.fillStyle = studio.solidColor;
    ctx.fillRect(0, 0, w, h);
  } else if (isVideoTarget && !(studio.bgMode === 'transparent' && alphaOut)) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
  }

  try {
    if (studio.codeMode === 'html' && sandbox) {
      try {
        const win = sandbox.contentWindow as (Window & { STUDIO_TIME?: number; STUDIO_DURATION?: number; STUDIO_BG_MODE?: string }) | null;
        const doc = sandbox.contentDocument;
        if (win) {
          win.STUDIO_TIME = tSec;
          win.STUDIO_DURATION = studio.duration;
          win.STUDIO_BG_MODE = studio.bgMode;
        }
        const sc = doc ? [...doc.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0] : null;
        if (sc && sc.width > 0 && sc.height > 0) ctx.drawImage(sc, 0, 0, w, h);
      } catch {
        // Ignore transient sandbox access errors during frame draw
      }
    } else {
      userFn(ctx, w, h, tSec, (tSec % studio.duration) / studio.duration, studio.duration, studio.bgMode);
    }
  } catch (err) {
    if (strict) {
      const e2 = err instanceof Error ? err : new Error(String(err));
      (e2 as Error & { userCode?: boolean }).userCode = true;
      e2.message = 'Error kode animasi: ' + e2.message;
      throw e2;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Error: ' + (err instanceof Error ? err.message : String(err)), 24, 48);
  } finally {
    ctx.restore();
  }
}

export interface RenderCallbacks {
  isCancelled: () => boolean;
  onProgress: (pct: number, frameIdx: number, totalFrames: number, message: string) => void;
  onPreviewUpdate: (tSec: number, renderCanvas: HTMLCanvasElement) => void;
  onEncoderRef: (enc: VideoEncoder | null) => void;
}

async function renderWithWebCodecs(
  wc: WebCodecsSelection,
  studio: StudioSettings,
  userFn: UserDrawFn,
  sandbox: HTMLIFrameElement | null,
  renderCanvas: HTMLCanvasElement,
  renderCtx: CanvasRenderingContext2D,
  alphaOut: boolean,
  embedMeta: MetaSnapshot | null,
  callbacks: RenderCallbacks
): Promise<Blob> {
  const totalFrames = Math.max(1, Math.round(studio.duration * studio.fps));
  const targetBytes = getTargetBytes(studio);
  const samples: EncodedSample[] = [];
  let avcC: Uint8Array | null = null;
  let encErr: unknown = null;

  const enc = new VideoEncoder({
    output: (ch, meta) => {
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) {
        const desc = meta.decoderConfig.description;
        avcC = desc instanceof ArrayBuffer ? new Uint8Array(desc) : new Uint8Array((desc as ArrayBufferView).buffer);
      }
      const d = new Uint8Array(ch.byteLength);
      ch.copyTo(d);
      const al = (meta as EncodedVideoChunkMetadata & { alphaSideData?: BufferSource })?.alphaSideData;
      let a: Uint8Array | null = null;
      if (al) {
        a = al instanceof ArrayBuffer ? new Uint8Array(al.slice(0)) : new Uint8Array(al.buffer.slice(al.byteOffset, al.byteOffset + al.byteLength));
      }
      samples.push({ data: d, isKey: ch.type === 'key', alpha: a });
    },
    error: (e) => {
      encErr = e;
    },
  });

  callbacks.onEncoderRef(enc);
  enc.configure(wc.cfg);

  const fDurUs = Math.round(1_000_000 / studio.fps);
  const keyInt = Math.max(1, Math.round(studio.fps * 2));
  const px = studio.width * studio.height;
  const qMax = px > 6e6 ? 4 : px > 3e6 ? 8 : px > 1.5e6 ? 16 : 24;

  let lastUi = 0;
  let lastPreview = 0;
  let lastYield = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    if (encErr) throw encErr;
    if (callbacks.isCancelled()) {
      try {
        enc.close();
      } catch {
        // ignore
      }
      throw new Error('Render dibatalkan');
    }

    while (enc.encodeQueueSize > qMax) {
      await new Promise<void>((r) => {
        const done = () => r();
        enc.addEventListener('dequeue', done, { once: true });
        setTimeout(done, 25);
      });
    }

    const t = i / studio.fps;
    if (studio.codeMode === 'html' && sandbox) {
      try {
        const w = sandbox.contentWindow as (Window & {
          STUDIO_TIME?: number;
          STUDIO_DURATION?: number;
          STUDIO_PREPARE?: (t: number) => unknown;
        }) | null;
        if (w) {
          w.STUDIO_TIME = t;
          w.STUDIO_DURATION = studio.duration;
          if (typeof w.STUDIO_PREPARE === 'function') {
            try {
              await w.STUDIO_PREPARE(t);
            } catch {
              // ignore prepare hook errors
            }
          }
          await new Promise<void>((r) => {
            let done = false;
            const fin = () => {
              if (!done) {
                done = true;
                r();
              }
            };
            w.requestAnimationFrame(fin);
            setTimeout(fin, 40);
          });
        }
      } catch {
        // ignore
      }
    }

    drawFrameToTarget(renderCtx, studio.width, studio.height, t, studio, userFn, sandbox, true, alphaOut, true);
    const vf = new VideoFrame(renderCanvas, {
      timestamp: Math.round(i * (1_000_000 / studio.fps)),
      duration: fDurUs,
    });
    try {
      enc.encode(vf, { keyFrame: i % keyInt === 0 });
    } finally {
      vf.close();
    }

    const now = performance.now();
    if (now - lastPreview >= (px > 6e6 ? 500 : px > 3e6 ? 350 : 220)) {
      lastPreview = now;
      callbacks.onPreviewUpdate(t, renderCanvas);
    }
    if (now - lastUi >= 200 || i === totalFrames - 1) {
      lastUi = now;
      const pc = Math.min(100, Math.round(((i + 1) / totalFrames) * 100));
      callbacks.onProgress(
        pc,
        i + 1,
        totalFrames,
        `Frame-Exact (${pc}%): Frame ${i + 1}/${totalFrames} · ${studio.duration}s @ ${studio.fps}fps`
      );
    }
    if (now - lastYield >= 16) {
      lastYield = now;
      await yieldToMain();
    }
  }

  await enc.flush();
  enc.close();
  callbacks.onEncoderRef(null);
  if (encErr) throw encErr;
  if (!samples.length) throw new Error('Encoder tidak menghasilkan frame');
  if (wc.alpha && !samples.some((s) => s.alpha && s.alpha.length)) {
    throw new Error('Encoder tidak menghasilkan data alpha');
  }
  if (wc.container !== 'webm' && !avcC) {
    throw new Error('Encoder tidak memberi konfigurasi AVC');
  }

  return wc.container === 'webm'
    ? buildWebmBlob(samples, studio.width, studio.height, studio.fps, wc.codec, targetBytes, embedMeta)
    : buildMp4Blob(samples, avcC || new Uint8Array(0), studio.width, studio.height, studio.fps, wc.container === 'mov', targetBytes, embedMeta);
}

function renderWithMRFallback(
  mr: { mime: string; ext: 'mp4' | 'mov' | 'webm'; ok: boolean },
  studio: StudioSettings,
  userFn: UserDrawFn,
  sandbox: HTMLIFrameElement | null,
  renderCanvas: HTMLCanvasElement,
  renderCtx: CanvasRenderingContext2D,
  alphaOut: boolean,
  callbacks: RenderCallbacks
): Promise<{ blob: Blob; ext: 'mp4' | 'mov' | 'webm' }> {
  return new Promise((resolve, reject) => {
    const bps = Math.round(getEffectiveBitrateMbps(studio) * 1_000_000);
    const stream = renderCanvas.captureStream(studio.fps);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mr.mime ? { mimeType: mr.mime, videoBitsPerSecond: bps } : { videoBitsPerSecond: bps });
    } catch {
      try {
        rec = new MediaRecorder(stream);
      } catch (e2) {
        reject(e2);
        return;
      }
    }

    const ch: Blob[] = [];
    let failed: unknown = null;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) ch.push(e.data);
    };
    rec.onerror = (ev) => reject((ev as Event & { error?: unknown })?.error || new Error('MediaRecorder error'));
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (failed) {
        reject(failed);
        return;
      }
      if (callbacks.isCancelled()) {
        reject(new Error('Render dibatalkan'));
        return;
      }
      const mt = (rec.mimeType || mr.mime || 'video/webm').toLowerCase();
      const ext: 'mp4' | 'mov' | 'webm' = mt.includes('quicktime') ? 'mov' : mt.includes('mp4') ? (studio.format === 'MOV' ? 'mov' : 'mp4') : 'webm';
      resolve({ blob: new Blob(ch, { type: mt.split(';')[0] }), ext });
    };

    let st = 0;
    let lPr = 0;
    let lUi = 0;
    let raf = 0;
    let tm = 0;
    const dMs = studio.duration * 1000;
    const tf = Math.max(1, Math.round(studio.duration * studio.fps));

    const step = () => {
      if (rec.state === 'inactive') return;
      if (callbacks.isCancelled()) {
        rec.stop();
        return;
      }
      const now = performance.now();
      const el = now - st;
      const t = Math.min(studio.duration, el / 1000);
      try {
        drawFrameToTarget(renderCtx, studio.width, studio.height, t, studio, userFn, sandbox, true, alphaOut, true);
      } catch (e) {
        failed = e;
        rec.stop();
        return;
      }
      if (now - lPr >= 66) {
        lPr = now;
        callbacks.onPreviewUpdate(t, renderCanvas);
      }
      if (now - lUi >= 180 || el >= dMs) {
        lUi = now;
        const pc = Math.min(100, Math.round((el / dMs) * 100));
        callbacks.onProgress(pc, Math.round((el / dMs) * tf), tf, `MediaRecorder (${pc}%): ${studio.duration}s @ ${studio.fps}fps`);
      }
      if (el >= dMs) {
        rec.stop();
        return;
      }
      schedule();
    };

    const schedule = () => {
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        clearTimeout(tm);
        step();
      };
      raf = requestAnimationFrame(go);
      tm = window.setTimeout(go, 1000 / studio.fps + 40);
    };

    rec.onstart = () => {
      st = performance.now();
      schedule();
    };
    drawFrameToTarget(renderCtx, studio.width, studio.height, 0, studio, userFn, sandbox, true, alphaOut);
    rec.start(500);
  });
}

export async function executeVideoRender(
  studio: StudioSettings,
  userFn: UserDrawFn,
  sandbox: HTMLIFrameElement | null,
  renderCanvas: HTMLCanvasElement,
  renderCtx: CanvasRenderingContext2D,
  embedMeta: MetaSnapshot | null,
  callbacks: RenderCallbacks
): Promise<{ blob: Blob; ext: 'mp4' | 'mov' | 'webm'; viaMR: boolean; alphaOut: boolean }> {
  renderCanvas.width = studio.width;
  renderCanvas.height = studio.height;

  if (studio.codeMode === 'html' && studio.rawHtmlCode && sandbox) {
    await loadHtmlIntoSandbox(sandbox, studio.rawHtmlCode, studio.width, studio.height, studio, 0);
    const hasCanvas = await waitForSandboxCanvas(sandbox, 4000);
    if (!hasCanvas) {
      throw new Error('Tidak ada elemen <canvas> di file HTML (hanya HTML5 Canvas yang didukung).');
    }
  }

  let alphaOut = studio.bgMode === 'transparent';
  let wc = await findBestWebCodecsConfig(studio);
  if (wc && alphaOut && !wc.alpha && typeof MediaRecorder !== 'undefined') wc = null;
  if (wc && alphaOut && !wc.alpha) alphaOut = false;

  const targetBytes = getTargetBytes(studio);
  let blob: Blob;
  let ext: 'mp4' | 'mov' | 'webm';
  let viaMR = false;

  if (wc) {
    try {
      ext = wc.container;
      blob = await renderWithWebCodecs(wc, studio, userFn, sandbox, renderCanvas, renderCtx, alphaOut, embedMeta, callbacks);
    } catch (err) {
      const e = err as Error & { userCode?: boolean };
      if (!callbacks.isCancelled() && !e?.userCode && wc.cfg.hardwareAcceleration) {
        const swCfg: WebCodecsSelection = { ...wc, cfg: { ...wc.cfg } };
        delete swCfg.cfg.hardwareAcceleration;
        try {
          ext = swCfg.container;
          blob = await renderWithWebCodecs(swCfg, studio, userFn, sandbox, renderCanvas, renderCtx, alphaOut, embedMeta, callbacks);
          return { blob, ext, viaMR: false, alphaOut };
        } catch (err2) {
          const e2 = err2 as Error & { userCode?: boolean };
          if (callbacks.isCancelled() || e2?.userCode || typeof MediaRecorder === 'undefined') throw err2;
          const r = await renderWithMRFallback(pickMRConfig(studio), studio, userFn, sandbox, renderCanvas, renderCtx, alphaOut, callbacks);
          blob = padBlob(r.blob, r.ext, targetBytes);
          ext = r.ext;
          viaMR = true;
        }
      } else if (callbacks.isCancelled() || e?.userCode || typeof MediaRecorder === 'undefined') {
        throw err;
      } else {
        const r = await renderWithMRFallback(pickMRConfig(studio), studio, userFn, sandbox, renderCanvas, renderCtx, alphaOut, callbacks);
        blob = padBlob(r.blob, r.ext, targetBytes);
        ext = r.ext;
        viaMR = true;
      }
    }
  } else {
    const r = await renderWithMRFallback(pickMRConfig(studio), studio, userFn, sandbox, renderCanvas, renderCtx, alphaOut, callbacks);
    blob = padBlob(r.blob, r.ext, targetBytes);
    ext = r.ext;
    viaMR = true;
  }

  return { blob, ext, viaMR, alphaOut };
}
