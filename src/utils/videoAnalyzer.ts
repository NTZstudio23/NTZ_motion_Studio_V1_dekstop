import { ADOBE_CATS, getPromptBgInstruction } from '../data/promptCatalog';
import { AspectRatioKey, StudioSettings } from '../types/studio';
import { META_DESC_MAX, META_TITLE_MAX } from './metadata';

export type VideoDetailLevel = 'ringkas' | 'standar' | 'maks';

const AR_LIST: Array<[AspectRatioKey, number]> = [
  ['16:9', 16 / 9],
  ['9:16', 9 / 16],
  ['1:1', 1],
  ['4:5', 4 / 5],
  ['21:9', 21 / 9],
  ['4:3', 4 / 3],
  ['3:4', 3 / 4],
  ['3:2', 3 / 2],
  ['2:3', 2 / 3],
];

export function nearestAR(a: number): AspectRatioKey {
  return AR_LIST.reduce((b, r) => (Math.abs(Math.log(a / r[1])) < Math.abs(Math.log(a / b[1])) ? r : b), AR_LIST[0])[0];
}

export function snapFps(f: number): number {
  if (!f) return 0;
  return [24, 30, 60].reduce((b, s) => (Math.abs(Math.log(f / s)) < Math.abs(Math.log(f / b)) ? s : b), 30);
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const hex = (c: number[]) =>
  '#' + c.map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const P = (x: number) => Math.round(x * 100);
const lerp = (a: number[], b: number[], u: number) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const dFmt = (t: number) => `${t.toFixed(2)}s`;

function cname(c: number[]): string {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1) + 1e-9);
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (l < 0.08) return 'hitam';
  if (l > 0.93 && s < 0.5) return 'putih';
  if (s < 0.14) return l < 0.3 ? 'abu gelap' : l > 0.7 ? 'abu terang' : 'abu';
  const n =
    h < 15 || h >= 345
      ? 'merah'
      : h < 40
        ? 'oranye'
        : h < 65
          ? 'kuning/emas'
          : h < 90
            ? 'kuning-hijau'
            : h < 150
              ? 'hijau'
              : h < 185
                ? 'tosca'
                : h < 205
                  ? 'cyan'
                  : h < 250
                    ? 'biru'
                    : h < 275
                      ? 'indigo'
                      : h < 295
                        ? 'ungu'
                        : 'magenta/pink';
  return n + (l < 0.28 ? ' tua' : l > 0.72 ? ' muda' : '');
}

function avgRect(d: Uint8ClampedArray, W: number, H: number, x0: number, y0: number, x1: number, y1: number): number[] {
  const xa = clamp(Math.floor(x0 * W), 0, W - 1);
  const xb = clamp(Math.max(xa + 1, Math.ceil(x1 * W)), 1, W);
  const ya = clamp(Math.floor(y0 * H), 0, H - 1);
  const yb = clamp(Math.max(ya + 1, Math.ceil(y1 * H)), 1, H);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const p = (y * W + x) * 4;
      r += d[p];
      g += d[p + 1];
      b += d[p + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

function palette(d: Uint8ClampedArray, n: number): Array<{ c: number[]; p: number }> {
  const bins = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < d.length; i += 4) {
    const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    let b = bins.get(k);
    if (!b) {
      b = [0, 0, 0, 0];
      bins.set(k, b);
    }
    b[0]++;
    b[1] += d[i];
    b[2] += d[i + 1];
    b[3] += d[i + 2];
  }
  const arr = [...bins.values()].sort((a, b) => b[0] - a[0]);
  const tot = d.length / 4;
  const o: Array<{ c: number[]; n: number }> = [];
  for (const b of arr) {
    const c = [b[1] / b[0], b[2] / b[0], b[3] / b[0]];
    let m: { c: number[]; n: number } | null = null;
    let md = 1e9;
    for (const q of o) {
      const dd = dist(q.c, c);
      if (dd < md) {
        md = dd;
        m = q;
      }
    }
    if (m && md <= 46) m.n += b[0];
    else if (o.length < n) o.push({ c, n: b[0] });
    else if (m) m.n += b[0];
  }
  return o.sort((a, b) => b.n - a.n).map((q) => ({ c: q.c, p: q.n / tot }));
}

interface BgSummary {
  tl: number[];
  tr: number[];
  bl: number[];
  br: number[];
  c: number[];
  kind: string;
}

function bgInfo(d: Uint8ClampedArray, W: number, H: number): BgSummary {
  const tl = avgRect(d, W, H, 0, 0, 0.12, 0.12);
  const tr = avgRect(d, W, H, 0.88, 0, 1, 0.12);
  const bl = avgRect(d, W, H, 0, 0.88, 0.12, 1);
  const br = avgRect(d, W, H, 0.88, 0.88, 1, 1);
  const c = avgRect(d, W, H, 0.4, 0.4, 0.6, 0.6);
  const hz = (dist(tl, tr) + dist(bl, br)) / 2;
  const vt = (dist(tl, bl) + dist(tr, br)) / 2;
  const dg = (dist(tl, br) + dist(tr, bl)) / 2;
  const avgC = [0, 1, 2].map((i) => (tl[i] + tr[i] + bl[i] + br[i]) / 4);
  const cd = dist(c, avgC);
  const mx = Math.max(hz, vt, dg);
  let kind: string;
  if (mx < 22 && cd < 28) kind = 'solid / hampir rata';
  else if (mx < 30 && cd >= 28) kind = `radial / vignette (tengah ${lum(c) > lum(avgC) ? 'lebih terang' : 'lebih gelap'} dari tepi)`;
  else if (vt >= hz * 1.5 && vt >= dg * 0.9) kind = `gradasi vertikal (atas ${lum(tl) > lum(bl) ? 'lebih terang' : 'lebih gelap'})`;
  else if (hz >= vt * 1.5 && hz >= dg * 0.9) kind = `gradasi horizontal (kiri ${lum(tl) > lum(tr) ? 'lebih terang' : 'lebih gelap'})`;
  else kind = 'gradasi diagonal';
  return { tl, tr, bl, br, c, kind };
}

interface DetectedObject {
  a: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  c: number[];
  core: number[];
  shape: string;
}

function detectObjects(d: Uint8ClampedArray, W: number, H: number, bg: BgSummary, maxN: number, minA: number): DetectedObject[] {
  const GW = 32;
  const GH = Math.max(8, Math.round((32 * H) / W));
  const cells: number[][] = [];
  const dev: number[] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const c = avgRect(d, W, H, x / GW, y / GH, (x + 1) / GW, (y + 1) / GH);
      const u = (x + 0.5) / GW;
      const v = (y + 0.5) / GH;
      const b = lerp(lerp(bg.tl, bg.tr, u), lerp(bg.bl, bg.br, u), v);
      cells.push(c);
      dev.push(dist(c, b));
    }
  }
  const seen = new Uint8Array(GW * GH);
  const comps: number[][] = [];
  for (let i = 0; i < GW * GH; i++) {
    if (seen[i] || dev[i] < 42) continue;
    const st = [i];
    const cs: number[] = [];
    seen[i] = 1;
    while (st.length) {
      const k = st.pop()!;
      cs.push(k);
      const x = k % GW;
      const y = (k / GW) | 0;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const j = ny * GW + nx;
        if (!seen[j] && dev[j] >= 42) {
          seen[j] = 1;
          st.push(j);
        }
      }
    }
    comps.push(cs);
  }

  const res: DetectedObject[] = [];
  comps.forEach((cs) => {
    if (cs.length < minA || cs.length > GW * GH * 0.6) return;
    let x0 = 99;
    let y0 = 99;
    let x1 = -1;
    let y1 = -1;
    let r = 0;
    let g = 0;
    let b = 0;
    let pk = cs[0];
    cs.forEach((k) => {
      const x = k % GW;
      const y = (k / GW) | 0;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      r += cells[k][0];
      g += cells[k][1];
      b += cells[k][2];
      if (dev[k] > dev[pk]) pk = k;
    });
    const c = [r / cs.length, g / cs.length, b / cs.length];
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const fill = cs.length / (bw * bh);
    const mn = Math.min(bw, bh);
    const mx = Math.max(bw, bh);
    let shape: string;
    if (mn <= 1 && mx >= 4) shape = `garis/bar tipis ${bw > bh ? 'horizontal' : 'vertikal'}`;
    else if (cs.length <= 3) shape = 'titik/partikel kecil';
    else if (fill > 0.88) shape = 'persegi/persegi panjang solid';
    else if (fill > 0.62 && mx / mn < 1.7) shape = 'lingkaran/oval';
    else shape = 'bentuk tak beraturan / kumpulan partikel';

    res.push({ a: cs.length, cx: (x0 + x1 + 1) / 2 / GW, cy: (y0 + y1 + 1) / 2 / GH, w: bw / GW, h: bh / GH, c, core: cells[pk], shape });
  });

  return res.sort((a, b) => b.a - a.a).slice(0, maxN);
}

function asciiMap(d: Uint8ClampedArray, W: number, H: number): string[] {
  const AW = 24;
  const AH = Math.max(4, Math.round((AW * H) / W / 2));
  const ch = ' .:-=+*#%@';
  const rows: string[] = [];
  for (let y = 0; y < AH; y++) {
    let s = '';
    for (let x = 0; x < AW; x++) {
      const l = lum(avgRect(d, W, H, x / AW, y / AH, (x + 1) / AW, (y + 1) / AH));
      s += ch[clamp(Math.floor((l / 256) * 10), 0, 9)];
    }
    rows.push(s);
  }
  return rows;
}

function colorGrid(d: Uint8ClampedArray, W: number, H: number): string[] {
  const C = 10;
  const R = Math.max(4, Math.round((C * H) / W));
  const rows: string[] = [];
  for (let y = 0; y < R; y++) {
    const r: string[] = [];
    for (let x = 0; x < C; x++) r.push(hex(avgRect(d, W, H, x / C, y / R, (x + 1) / C, (y + 1) / R)));
    rows.push(r.join(' '));
  }
  return rows;
}

interface MotionSample {
  e: number;
  dl: number;
  frac: number;
  cx: number;
  cy: number;
  sh: [number, number] | null;
  dt: number;
}

interface AnalyzedFrame {
  t: number;
  pal: Array<{ c: number[]; p: number }>;
  bg: BgSummary;
  luma: number;
  contrast: number;
  sat: number;
  obj: DetectedObject[];
  map: string[] | null;
  cg: string[] | null;
  mot?: MotionSample;
  small?: Uint8ClampedArray;
}

function analyzeFrame(d: Uint8ClampedArray, W: number, H: number, detail: VideoDetailLevel): Omit<AnalyzedFrame, 't'> {
  const pal = palette(d, detail === 'ringkas' ? 3 : detail === 'maks' ? 6 : 4);
  const bg = bgInfo(d, W, H);
  let sl = 0;
  let sl2 = 0;
  let ss = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = lum([d[i], d[i + 1], d[i + 2]]);
    sl += l;
    sl2 += l * l;
    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    ss += mx ? (mx - mn) / mx : 0;
    n++;
  }
  const lm = sl / n;
  const sd = Math.sqrt(Math.max(0, sl2 / n - lm * lm));
  return {
    pal,
    bg,
    luma: lm / 255,
    contrast: sd / 255,
    sat: ss / n,
    obj: detectObjects(d, W, H, bg, detail === 'ringkas' ? 3 : detail === 'maks' ? 8 : 5, detail === 'maks' ? 1 : 2),
    map: detail !== 'ringkas' ? asciiMap(d, W, H) : null,
    cg: detail === 'maks' ? colorGrid(d, W, H) : null,
  };
}

function toGray(d: Uint8ClampedArray, n: number): Float32Array {
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = lum([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  return g;
}

function computeMotion(g1: Float32Array, g2: Float32Array, W: number, H: number, dt: number): MotionSample {
  let e = 0;
  let m1 = 0;
  let m2 = 0;
  const N = W * H;
  for (let i = 0; i < N; i++) {
    e += Math.abs(g2[i] - g1[i]);
    m1 += g1[i];
    m2 += g2[i];
  }
  e /= N * 255;
  const dl = (m2 - m1) / N / 255;
  const bs = 4;
  let cn = 0;
  let cx = 0;
  let cy = 0;
  let tot = 0;
  for (let by = 0; by + bs <= H; by += bs) {
    for (let bx = 0; bx + bs <= W; bx += bs) {
      let s = 0;
      for (let y = 0; y < bs; y++) {
        for (let x = 0; x < bs; x++) {
          const p = (by + y) * W + bx + x;
          s += Math.abs(g2[p] - g1[p]);
        }
      }
      s /= bs * bs;
      tot++;
      if (s > 14) {
        cn++;
        cx += bx + bs / 2;
        cy += by + bs / 2;
      }
    }
  }
  const R = 4;
  let best = 1e18;
  let bdx = 0;
  let bdy = 0;
  let s0 = 0;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      let s = 0;
      let k = 0;
      for (let y = R; y < H - R; y++) {
        const o2 = y * W;
        const o1 = (y - dy) * W;
        for (let x = R; x < W - R; x++) {
          s += Math.abs(g2[o2 + x] - g1[o1 + x - dx]);
          k++;
        }
      }
      s /= k;
      if (!dx && !dy) s0 = s;
      if (s < best) {
        best = s;
        bdx = dx;
        bdy = dy;
      }
    }
  }
  const gain = s0 > 0 ? (s0 - best) / s0 : 0;
  const sh: [number, number] | null = gain > 0.15 && (bdx || bdy) && e > 0.004 ? [bdx / W / dt, bdy / H / dt] : null;
  return { e, dl, frac: tot ? cn / tot : 0, cx: cn ? cx / cn / W : 0.5, cy: cn ? cy / cn / H : 0.5, sh, dt };
}

function motionTxt(m: MotionSample, detail: VideoDetailLevel): string {
  const lv = m.e < 0.006 ? 'hampir statis' : m.e < 0.02 ? 'gerakan halus/lambat' : m.e < 0.06 ? 'gerakan sedang' : 'gerakan cepat/dinamis';
  let s = `${lv} (perubahan ${(m.e * 100).toFixed(1)}% per ${m.dt.toFixed(2)}dtk)`;
  if (detail === 'ringkas') return s;
  if (m.sh) {
    const hx = Math.abs(m.sh[0]) >= 0.03;
    const hy = Math.abs(m.sh[1]) >= 0.03;
    const parts: string[] = [];
    if (hx) parts.push((m.sh[0] > 0 ? 'ke kanan ' : 'ke kiri ') + P(Math.abs(m.sh[0])) + '% lebar/dtk');
    if (hy) parts.push((m.sh[1] > 0 ? 'ke bawah ' : 'ke atas ') + P(Math.abs(m.sh[1])) + '% tinggi/dtk');
    if (parts.length) s += '; isi bergeser ' + parts.join(' & ');
  }
  if (m.e >= 0.006) s += `; area bergerak di sekitar x${P(m.cx)}% y${P(m.cy)}% (±${P(m.frac)}% layar)`;
  if (Math.abs(m.dl) > 0.004) s += `; kecerahan ${m.dl > 0 ? 'naik' : 'turun'}`;
  return s;
}

type TrackPoint = DetectedObject & { t: number };
interface ObjectTrack {
  pts: TrackPoint[];
  last: number;
  sc?: number;
}

function trackObjects(frames: AnalyzedFrame[]) {
  const tracks: ObjectTrack[] = [];
  frames.forEach((f, i) => {
    const used = new Set<number>();
    f.obj.forEach((q) => {
      let best = -1;
      let bd = 1e9;
      tracks.forEach((tk, j) => {
        if (tk.last !== i - 1 || used.has(j)) return;
        const p = tk.pts[tk.pts.length - 1];
        const pd = Math.hypot(p.cx - q.cx, p.cy - q.cy);
        const cd = dist(p.c, q.c);
        if (pd < 0.3 && cd < 110) {
          const s = pd + cd / 600 + Math.abs(Math.log((p.a + 0.5) / (q.a + 0.5))) * 0.05;
          if (s < bd) {
            bd = s;
            best = j;
          }
        }
      });
      const pt: TrackPoint = { ...q, t: f.t };
      if (best >= 0) {
        used.add(best);
        tracks[best].pts.push(pt);
        tracks[best].last = i;
      } else {
        tracks.push({ pts: [pt], last: i });
        used.add(tracks.length - 1);
      }
    });
  });
  return tracks
    .map((tk) => ({
      pts: tk.pts,
      sc: tk.pts.length * 10 + tk.pts.reduce((a, p) => a + p.a, 0) / tk.pts.length,
    }))
    .sort((a, b) => b.sc - a.sc);
}

function trackTxt(tk: { pts: TrackPoint[] }, k: number, span: number): string {
  const p = tk.pts;
  const f = p[0];
  const l = p[p.length - 1];
  const nm = String.fromCharCode(65 + k);
  let s = `Objek ${nm} — ${f.shape}, warna ${hex(f.c)} (${cname(f.c)}), inti ${hex(f.core)}; ukuran awal ${P(f.w)}%×${P(f.h)}% layar; tampil t=${f.t.toFixed(2)}s${p.length > 1 ? ` s/d t=${l.t.toFixed(2)}s` : ''}.`;
  if (p.length > 1) {
    const dt = l.t - f.t || 0.01;
    const vx = (l.cx - f.cx) / dt;
    const vy = (l.cy - f.cy) / dt;
    const back = Math.hypot(l.cx - f.cx, l.cy - f.cy) < 0.04;
    s += `\n    lintasan (t:x%,y%): ${p.map((q) => `${q.t.toFixed(2)}:${P(q.cx)},${P(q.cy)}`).join(' → ')}`;
    const parts: string[] = [];
    if (Math.abs(vx) >= 0.02) parts.push(`${vx > 0 ? 'ke kanan ' : 'ke kiri '}${P(Math.abs(vx))}% lebar/dtk`);
    if (Math.abs(vy) >= 0.02) parts.push(`${vy > 0 ? 'ke bawah ' : 'ke atas '}${P(Math.abs(vy))}% tinggi/dtk`);
    s += `\n    gerak rata-rata: ${parts.length ? parts.join(' & ') : 'nyaris diam di tempat'}${back ? ' (kembali ke posisi awal → gerak berulang/osilasi)' : ''}`;
    if (p.length >= 4) {
      const ar = (q: TrackPoint[]) => q.reduce((a, x) => a + x.w * x.h, 0) / q.length;
      const sz = ar(p.slice(-2)) / (ar(p.slice(0, 2)) + 1e-9);
      if (sz > 1.6) s += `; ukuran membesar ±${P(sz - 1)}%`;
      else if (sz < 0.6) s += `; ukuran mengecil ±${P(1 - sz)}%`;
    }
    if (l.t < span - 0.6) s += `; lalu hilang/berubah setelah t=${l.t.toFixed(2)}s`;
  }
  return s;
}

const once = (el: HTMLElement, ev: string, ms: number) =>
  new Promise<void>((r) => {
    let d = false;
    let tm = 0;
    const f = () => {
      if (d) return;
      d = true;
      clearTimeout(tm);
      el.removeEventListener(ev, f);
      r();
    };
    tm = window.setTimeout(f, ms);
    el.addEventListener(ev, f);
  });

const tick2 = () =>
  new Promise<void>((r) => {
    let d = false;
    const f = () => {
      if (!d) {
        d = true;
        r();
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(f));
    setTimeout(f, 90);
  });

async function seekTo(v: HTMLVideoElement, t: number) {
  if (Math.abs(v.currentTime - t) > 0.0005) {
    const p = once(v, 'seeked', 6000);
    v.currentTime = t;
    await p;
  }
  if (v.readyState < 2) await once(v, 'loadeddata', 4000);
  await tick2();
}

async function detectFps(v: HTMLVideoElement): Promise<number> {
  const rvfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, md: { mediaTime: number }) => void) => void }).requestVideoFrameCallback;
  if (!rvfc) return 0;
  try {
    await seekTo(v, Math.min(0.05, (v.duration || 1) / 4));
    const ts: number[] = [];
    let go = true;
    const cb = (_n: number, md: { mediaTime: number }) => {
      ts.push(md.mediaTime);
      if (go && ts.length < 48) rvfc.call(v, cb);
    };
    rvfc.call(v, cb);
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
    await new Promise((r) => setTimeout(r, 1300));
    go = false;
    v.pause();
    const dl: number[] = [];
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i] - ts[i - 1];
      if (d > 0.002) dl.push(d);
    }
    if (dl.length < 4) return 0;
    dl.sort((a, b) => a - b);
    const f = 1 / dl[Math.floor(dl.length / 2)];
    const std = [24, 25, 30, 50, 60];
    let b = std[0];
    std.forEach((s) => {
      if (Math.abs(s - f) < Math.abs(b - f)) b = s;
    });
    return Math.abs(b - f) / b < 0.06 ? b : Math.round(f);
  } catch {
    try {
      v.pause();
    } catch {
      // ignore
    }
    return 0;
  }
}

export interface VideoAnalysisParams {
  video: HTMLVideoElement;
  rawDuration: number;
  sampleCount: 'auto' | number;
  detail: VideoDetailLevel;
  arSelection: 'orig' | 'studio' | AspectRatioKey;
  bgModeChoice: 'ref' | 'studio';
  promptBgStyle: string;
  promptCustomBgText: string;
  note: string;
  syncStudio: boolean;
  matchDuration: boolean;
  loop: boolean;
  studio: StudioSettings;
  isCancelled: () => boolean;
  onProgress: (pct: number, message: string) => void;
  onThumbnail: (dataUrl: string, title: string) => void;
}

export interface VideoAnalysisResult {
  prompt: string;
  thumbsCount: number;
  tracksCount: number;
  fpsDetected: number;
  targetRatio: AspectRatioKey;
  targetDuration: number;
  targetFps: number;
}

export async function analyzeVideoToPrompt(params: VideoAnalysisParams): Promise<VideoAnalysisResult> {
  const { video, rawDuration, sampleCount, detail, arSelection, bgModeChoice, promptBgStyle, promptCustomBgText, note, matchDuration, loop, studio, isCancelled, onProgress, onThumbnail } = params;
  const span = Math.min(rawDuration, 120);
  const ar = video.videoWidth / video.videoHeight;
  let N = sampleCount === 'auto' ? clamp(Math.round(span * 2), 10, 30) : sampleCount;
  N = Math.max(4, N);

  onProgress(2, 'Mendeteksi FPS...');
  video.pause();
  const vfps = await detectFps(video);
  if (isCancelled()) throw new Error('Dibatalkan');

  const times: number[] = [];
  for (let i = 0; i < N; i++) times.push((i * span) / N);
  times.push(Math.max(0, span - 0.04));
  const T = times.length;

  const AW = 128;
  const AH = Math.max(8, Math.round(AW / ar));
  const GW = 128;
  const GH = Math.max(8, Math.round(GW / ar));
  const sm = document.createElement('canvas');
  sm.width = AW;
  sm.height = AH;
  const sx = sm.getContext('2d', { willReadFrequently: true })!;
  sx.imageSmoothingQuality = 'high';

  const gm = document.createElement('canvas');
  gm.width = GW;
  gm.height = GH;
  const gx = gm.getContext('2d', { willReadFrequently: true })!;
  gx.imageSmoothingQuality = 'high';

  const frames: AnalyzedFrame[] = [];
  const dtm = 0.1;

  for (let i = 0; i < T; i++) {
    if (isCancelled()) throw new Error('Dibatalkan');
    const t = times[i];
    await seekTo(video, t);
    sx.drawImage(video, 0, 0, AW, AH);
    const sd = sx.getImageData(0, 0, AW, AH).data;
    const fr: AnalyzedFrame = { ...analyzeFrame(sd, AW, AH, detail), t, small: sd };

    gx.drawImage(video, 0, 0, GW, GH);
    const gA = toGray(gx.getImageData(0, 0, GW, GH).data, GW * GH);
    const t2 = t + dtm <= rawDuration - 0.03 ? t + dtm : Math.max(0, t - dtm);
    if (Math.abs(t2 - t) > 0.01) {
      await seekTo(video, t2);
      gx.drawImage(video, 0, 0, GW, GH);
      const gB = toGray(gx.getImageData(0, 0, GW, GH).data, GW * GH);
      fr.mot = t2 > t ? computeMotion(gA, gB, GW, GH, t2 - t) : computeMotion(gB, gA, GW, GH, t - t2);
    }

    frames.push(fr);
    onThumbnail(sm.toDataURL('image/jpeg', 0.6), `F${i + 1} · ${t.toFixed(2)}s`);
    onProgress(Math.round(5 + ((i + 1) / T) * 90), `Mengamati frame ${i + 1}/${T}...`);
  }

  onProgress(97, 'Menyusun prompt...');
  const cuts: number[] = [];
  const diffs: Array<{ i: number; d: number }> = [];
  for (let i = 1; i < frames.length - 1; i++) {
    const a = frames[i - 1].small!;
    const b = frames[i].small!;
    let s = 0;
    for (let k = 0; k < a.length; k += 4) {
      s += (Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])) / 3;
    }
    diffs.push({ i, d: s / (a.length / 4) });
  }
  const sorted = diffs.map((x) => x.d).sort((a, b) => a - b);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  diffs.forEach((x) => {
    if (x.d > 38 || (x.d > 22 && x.d > med * 3.2)) cuts.push(frames[x.i].t);
  });

  const fa = frames[0].small!;
  const fb = frames[frames.length - 1].small!;
  let ld = 0;
  for (let k = 0; k < fa.length; k += 4) {
    ld += (Math.abs(fa[k] - fb[k]) + Math.abs(fa[k + 1] - fb[k + 1]) + Math.abs(fa[k + 2] - fb[k + 2])) / 3;
  }
  ld /= fa.length / 4;
  const loopTxt =
    ld < 6
      ? 'frame awal & akhir hampir identik (video sudah loop mulus)'
      : ld < 18
        ? `frame akhir agak berbeda dari awal (selisih ${ld.toFixed(0)}/255) — perlu penyambungan halus agar loop`
        : `frame akhir BERBEDA jauh dari awal (selisih ${ld.toFixed(0)}/255) — bukan loop alami`;

  const gp: Array<{ c: number[]; p: number }> = [];
  frames.forEach((f) =>
    f.pal.forEach((p) => {
      const w = p.p / frames.length;
      let m: { c: number[]; p: number } | null = null;
      let md = 1e9;
      gp.forEach((q) => {
        const dd = dist(q.c, p.c);
        if (dd < md) {
          md = dd;
          m = q;
        }
      });
      if (m && md <= 46) (m as { c: number[]; p: number }).p += w;
      else gp.push({ c: p.c, p: w });
    })
  );
  gp.sort((a, b) => b.p - a.p);

  const motFr = frames.filter((f) => f.mot);
  let me = 0;
  let pk = 0;
  let pt = 0;
  motFr.forEach((f) => {
    me += f.mot!.e;
    if (f.mot!.e > pk) {
      pk = f.mot!.e;
      pt = f.t;
    }
  });
  me = motFr.length ? me / motFr.length : 0;
  const motionAvg = me < 0.006 ? 'hampir statis' : me < 0.02 ? 'halus/lambat' : me < 0.06 ? 'sedang' : 'cepat/dinamis';

  const lumas = frames.map((f) => f.luma);
  const sats = frames.map((f) => f.sat);
  const kinds: Record<string, number> = {};
  frames.forEach((f) => {
    kinds[f.bg.kind] = (kinds[f.bg.kind] || 0) + 1;
  });
  const bgKind = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a])[0];

  const S = {
    cuts,
    loopTxt,
    gpal: gp.slice(0, 6),
    lumaAvg: lumas.reduce((a, b) => a + b, 0) / lumas.length,
    lumaMin: Math.min(...lumas),
    lumaMax: Math.max(...lumas),
    satAvg: sats.reduce((a, b) => a + b, 0) / sats.length,
    motionAvg,
    peakT: pt,
    bgKind,
  };

  const tracks = trackObjects(frames);
  const ratio: AspectRatioKey = arSelection === 'orig' ? nearestAR(ar) : arSelection === 'studio' ? studio.ratio : arSelection;
  const dur = matchDuration ? clamp(Math.round(span), 1, 120) : studio.duration;
  const fpsS = snapFps(vfps) || studio.fps;

  const RL = ({ '720p': 'HD (1280×720)', '1080p': 'FHD (Full HD)', '2K': '2K (QHD)', '4K': '4K (Ultra HD)' } as Record<string, string>)[studio.res] || studio.res;

  const L: string[] = [];
  L.push('Kamu adalah Motion Graphics Designer profesional dan JavaScript Canvas API Developer.');
  L.push('');
  L.push('TUGAS: TIRU sebuah video referensi menjadi 1 file HTML5 Canvas 2D. Saat file itu dirender oleh studio, video yang dihasilkan harus SAMA dengan referensi: komposisi, warna, objek, tata letak, gerakan, kecepatan, ritme, dan urutan adegan. Ini meniru, bukan membuat konsep baru atau karya terinspirasi.');
  L.push('');
  L.push('PENTING: kamu tidak bisa melihat videonya. Video sudah saya amati frame demi frame dan seluruh hasil pengamatannya ada di data di bawah (warna hex, posisi dalam persen layar, ukuran, bentuk, lintasan, kecepatan, waktu). Anggap data ini kebenaran mutlak dan wujudkan secara harfiah ke dalam kode. Jangan mengarang elemen, warna, atau gerakan di luar data; bila ada bagian yang tidak tercakup data, pilih yang paling sederhana dan konsisten dengan palet dan gerak yang ada. Jangan bertanya balik.');
  L.push('');
  L.push('SPESIFIKASI REFERENSI:');
  L.push(`- Durasi video referensi: ${span.toFixed(2)} detik → durasi HTML: ${dur} detik`);
  L.push(`- Resolusi sumber: ${video.videoWidth}×${video.videoHeight} (rasio ${nearestAR(ar)})`);
  if (vfps) L.push(`- FPS video referensi: ±${vfps} fps`);
  L.push(`- Output studio: rasio ${ratio}${ratio === studio.ratio ? `, ${studio.width}×${studio.height} (${RL})` : ''}, ${fpsS} fps`);
  L.push(`- Pengamatan dilakukan pada ${T - 1} titik waktu berjarak ±${(span / (T - 1)).toFixed(2)} dtk (F1…F${T - 1}) + 1 frame penutup (F${T}). Frame Fk berada pada waktu referensi t=(k−1)/${T - 1}×${span.toFixed(2)} dtk. Di antara titik-titik itu, interpolasi gerak dan warna secara halus.`);
  L.push(`- Scene/adegan: ${S.cuts.length ? `terdeteksi ${S.cuts.length + 1} adegan; kemungkinan pergantian di ${S.cuts.map((c) => dFmt(c)).join(', ')}` : 'tidak ada pergantian scene tegas — satu adegan berkelanjutan'}`);
  L.push(`- Loop: ${S.loopTxt}`);
  L.push(`- Gerak rata-rata: ${S.motionAvg}; gerak paling kuat sekitar t=${dFmt(S.peakT)}`);
  L.push('');
  L.push('WARNA & BACKGROUND GLOBAL:');
  L.push(`- Palet utama: ${S.gpal.map((p) => `${hex(p.c)} (${cname(p.c)} ${P(p.p)}%)`).join(', ')}`);
  L.push(`- Kecerahan rata-rata ${P(S.lumaAvg)}% (rentang ${P(S.lumaMin)}–${P(S.lumaMax)}%); saturasi ${S.satAvg < 0.2 ? 'rendah/pucat' : S.satAvg < 0.5 ? 'sedang' : 'tinggi/vivid'}`);
  const b0 = frames[0].bg;
  L.push(`- Background: ${S.bgKind}. Warna di frame F1: kiri-atas ${hex(b0.tl)}, kanan-atas ${hex(b0.tr)}, kiri-bawah ${hex(b0.bl)}, kanan-bawah ${hex(b0.br)}, tengah ${hex(b0.c)}. Buat gradasi (createLinear/RadialGradient) dari warna-warna itu.`);
  L.push('');

  if (tracks.length) {
    L.push('OBJEK & LINTASAN GERAK (hasil pelacakan antar frame; posisi = pusat objek dalam % lebar/tinggi layar, 0,0 = kiri-atas):');
    tracks.slice(0, detail === 'ringkas' ? 4 : 8).forEach((tk, k) => L.push('- ' + trackTxt(tk, k, span)));
    L.push('');
  }

  L.push('DATA PER FRAME (kondisi lengkap pada tiap titik waktu):');
  frames.forEach((f, i) => {
    const k = i + 1;
    L.push(`[F${k}] t=${dFmt(f.t)} · progres ${(f.t / span).toFixed(3)}${k === T ? ' · frame penutup' : ''}`);
    L.push(`  warna: ${f.pal.map((p) => `${hex(p.c)} ${cname(p.c)} ${P(p.p)}%`).join(' | ')} | kecerahan ${P(f.luma)}%${detail === 'ringkas' ? '' : ` | kontras ${f.contrast < 0.12 ? 'rendah' : f.contrast < 0.25 ? 'sedang' : 'tinggi'}`}`);
    if (detail !== 'ringkas') {
      L.push(`  background: sudut KiA ${hex(f.bg.tl)}, KaA ${hex(f.bg.tr)}, KiB ${hex(f.bg.bl)}, KaB ${hex(f.bg.br)}, tengah ${hex(f.bg.c)} → ${f.bg.kind}`);
    }
    L.push(
      `  objek: ${
        f.obj.length
          ? f.obj
              .map(
                (q, j) =>
                  `(${j + 1}) ${q.shape} di x${P(q.cx)}% y${P(q.cy)}%, ukuran ${P(q.w)}%×${P(q.h)}%, ${hex(q.c)} ${cname(q.c)}${detail === 'ringkas' ? '' : `, inti ${hex(q.core)}`}`
              )
              .join('; ')
          : 'tidak ada objek menonjol (hanya background/tekstur halus)'
      }`
    );
    if (f.mot) L.push(`  gerakan: ${motionTxt(f.mot, detail)}`);
    if (f.map) {
      L.push('  peta kecerahan 24 kolom (spasi=gelap … @=terang; kiri-atas→kanan-bawah):');
      f.map.forEach((r) => L.push(`    |${r}|`));
    }
    if (f.cg) {
      L.push('  peta warna 10 kolom (baris atas→bawah, tiap sel = warna rata-rata area itu):');
      f.cg.forEach((r, j) => L.push(`    b${j + 1}: ${r}`));
    }
  });
  L.push('');

  if (note.trim()) {
    L.push(`CATATAN DARI SAYA (prioritas tertinggi, wajib dipatuhi, termasuk teks yang tampil di video): ${note.trim()}`);
    L.push('');
  }

  L.push('CARA MENIRU (WAJIB):');
  const M = [
    'Baca seluruh data di atas dulu. Susun daftar elemen (background, tiap objek A, B, C…, partikel, garis, cahaya/glow, bayangan, teks) beserta keyframe-nya, tapi jangan tuliskan daftar itu di jawaban.',
    'Tiru PERSIS: jumlah objek, bentuk, ukuran relatif, posisi (tulis sebagai fraksi w dan h dari persen di data), warna (hex di data), gradasi, glow, ketebalan garis. Peta kecerahan/warna dipakai untuk menempatkan area terang, gelap, dan gradasi dengan benar.',
    'Rekonstruksi gerakan dari lintasan dan kecepatan di data: tulis sebagai fungsi kontinu dari waktu (interpolasi keyframe dengan smoothstep/easeInOut antar titik waktu, atau gerak periodik sin/cos bila lintasannya berulang/kembali ke awal). Tidak boleh ada lompatan posisi antar frame.',
    `Sinkron waktu: kondisi pada tiap Fk harus tampil tepat pada waktu referensinya. Gunakan refT = progress × ${span.toFixed(2)} (detik waktu referensi) sebagai sumbu waktu semua keyframe.`,
    'Elemen fotorealistik (orang, pemandangan, footage nyata) tidak bisa digambar persis: tiru dengan gradasi, siluet, bentuk, tekstur noise deterministik, dan partikel Canvas yang paling mirip dalam warna, komposisi, dan gerak. DILARANG memakai gambar, base64, video, atau asset eksternal.',
    'Jangan menambah elemen yang tidak ada di data, jangan menyederhanakan yang ada, jangan mengganti palet warna, dan jangan mengubah tata letak.',
    `Sebelum menjawab, cek sendiri (tanpa menuliskannya) bahwa kode menghasilkan kondisi F1–F${T} pada waktunya masing-masing.`,
  ];
  M.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('KETENTUAN WAJIB KODE HTML (agar bisa dirender studio):');

  const bgRef = `Gambar background persis seperti data (jenis: ${S.bgKind}, warna sesuai data) di dalam kode. Jika window.STUDIO_BG_MODE === 'transparent' atau 'solid', JANGAN menggambar background: bersihkan dengan ctx.clearRect(0,0,w,h) dan gambar objek saja.`;
  const bgTxt = bgModeChoice === 'studio' ? getPromptBgInstruction(promptBgStyle, promptCustomBgText, studio.bgMode) : bgRef;
  const cats = ADOBE_CATS.map((c) => c[1]).join(' | ');

  const R = [
    'Pure HTML5 + CSS + Vanilla JS Canvas 2D dalam 1 file utuh tanpa CDN, library luar, atau asset eksternal. Satu elemen <canvas id="canvas"></canvas> penuh layar (margin:0;overflow:hidden;width:100vw;height:100vh;display:block;).',
    'Isi <title> dengan judul bahasa Inggris yang mendeskripsikan visual (maks 60 karakter). DILARANG memuat nama studio, website, aplikasi, tools, atau brand apa pun di <title>, komentar, teks canvas, nama variabel, maupun meta.',
    "const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'); const w=canvas.width=window.STUDIO_WIDTH||window.innerWidth; const h=canvas.height=window.STUDIO_HEIGHT||window.innerHeight; const minSide=Math.min(w,h); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';",
    'Semua ukuran elemen harus proporsional memakai w, h, dan minSide agar identik di FHD, 2K, dan 4K (posisi = fraksi dari w/h, tebal garis & radius = fraksi dari minSide).',
    `Sinkron waktu (WAJIB dihitung ULANG di dalam fungsi draw() yang dipanggil tiap requestAnimationFrame, bukan sekali di luar loop):\nconst duration = window.STUDIO_DURATION || ${dur};\nconst t = (typeof window.STUDIO_TIME === 'number') ? window.STUDIO_TIME : (performance.now() / 1000);\nconst loopT = ${loop ? 't % duration' : 'Math.min(t, duration)'};\nconst progress = loopT / duration;\nconst refT = progress * ${span.toFixed(2)}; // detik waktu video referensi`,
    'Parameter t sudah dalam satuan DETIK. Dilarang: t = time * 0.001, t / 1000, Date.now(). performance.now() hanya boleh sebagai fallback seperti di atas.',
    'Semua animasi harus berbasis t / loopT / progress / refT (bukan hitungan frame atau state yang bertambah tiap panggilan), sehingga hasil render frame-by-frame identik dengan preview.',
    loop
      ? 'Loop harus 100% seamless: kondisi di akhir durasi menyatu mulus dengan kondisi di awal. Bila frame penutup berbeda dari F1, buat transisi halus kembali ke kondisi awal di ±8% durasi terakhir, tanpa lompatan.'
      : 'Video tidak perlu loop: setelah durasi habis tahan kondisi akhir, tanpa lompatan.',
    'ANTI-NOISE: dilarang memakai Math.random() di dalam loop render (pakai seed deterministik, mis. fungsi hash dari indeks). Hindari flicker, objek terpotong, teks bertumpuk, dan gerakan patah. Tanpa watermark/FPS counter.',
    'Loop animasi wajib memakai requestAnimationFrame(draw) (bukan setInterval/setTimeout) dan hanya satu <canvas>.',
    `BACKGROUND: ${bgTxt}`,
    `METADATA STOCK (WAJIB): di dalam <head> sertakan TEPAT 4 tag meta berikut, ORIGINAL dan dibuat dari apa yang benar-benar tampil di animasi (bentuk, objek, warna, efek, gerakan). Bahasa Inggris, tanpa tanda kutip ganda di dalam isinya, tanpa nama studio/website/aplikasi/brand. <meta name="stock-title" content="maks ${META_TITLE_MAX} karakter, deskriptif, tanpa koma atau simbol"> <meta name="stock-description" content="1-2 kalimat, maks ${META_DESC_MAX} karakter"> <meta name="stock-keywords" content="tepat 50 keyword dipisah koma, urut dari terpenting, relevan, tanpa duplikat dan tanpa brand"> <meta name="stock-category" content="pilih salah satu: ${cats}">`,
  ];
  R.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('Saat membuat kode, jangan beri penjelasan. Berikan HANYA kode HTML lengkap (<!DOCTYPE html> ... </html>) dalam 1 blok kode siap copy.');

  frames.forEach((f) => {
    delete f.small;
  });

  onProgress(100, `Siap · ${T} frame diamati · ${tracks.length} objek terlacak`);
  return {
    prompt: L.join('\n'),
    thumbsCount: T,
    tracksCount: tracks.length,
    fpsDetected: vfps,
    targetRatio: ratio,
    targetDuration: dur,
    targetFps: fpsS,
  };
}
