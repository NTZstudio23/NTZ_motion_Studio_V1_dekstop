import { ADOBE_CATS } from '../data/promptCatalog';
import { DownloadLogEntry, ExtractedMeta, MetaSnapshot, StudioSettings } from '../types/studio';

export const META_TITLE_MAX = 150;
export const META_DESC_MAX = 200;

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'a', 'of', 'in', 'on']);
const BRAND_RE = /\bntz\b|\bmotion[\s-]*studio\b(?:[\s-]*v\.?\s*\d+(?:[\s-]*pro)?)?/gi;

export function escXml(t: string): string {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export function noBrand(s: string): string {
  return String(s == null ? '' : s)
    .replace(BRAND_RE, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:|\-–—]+|[\s,;:|\-–—]+$/g, '')
    .trim();
}

export function hasBrand(s: string): boolean {
  BRAND_RE.lastIndex = 0;
  const r = BRAND_RE.test(String(s || ''));
  BRAND_RE.lastIndex = 0;
  return r;
}

export function parseKw(s: string | string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const raw = Array.isArray(s) ? s.join(',') : String(s || '');
  raw.split(/[,\n;]+/).forEach((k) => {
    const clean = k.trim().toLowerCase().replace(/\s+/g, ' ');
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  });
  return out;
}

export function cleanTitle(s: string): string {
  return String(s || '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function fitDesc(s: string, max: number): string {
  const str = String(s || '').replace(/\s+/g, ' ').trim();
  if (str.length <= max) return str;
  const c = str.slice(0, max);
  const d = c.lastIndexOf('. ');
  if (d >= max * 0.5) return c.slice(0, d + 1);
  const c2 = str.slice(0, max - 1);
  const sp = c2.lastIndexOf(' ');
  return (sp >= max * 0.6 ? c2.slice(0, sp) : c2).replace(/[\s,;:-]+$/, '') + '.';
}

export function fitTitle(s: string, max: number): string {
  const t = cleanTitle(s);
  if (t.length <= max) return t;
  const c = t.slice(0, max);
  const i = c.lastIndexOf(' ');
  return (i > max * 0.6 ? c.slice(0, i) : c).trim();
}

export function catName(n: number): string {
  const c = ADOBE_CATS.find((x) => x[0] === +n);
  return c ? c[1] : 'Graphic Resources';
}

export function matchCat(v: string): number {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return 0;
  const c =
    ADOBE_CATS.find((x) => String(x[0]) === s || x[1].toLowerCase() === s) ||
    ADOBE_CATS.find((x) => s.includes(x[1].toLowerCase()));
  return c ? c[0] : 0;
}

const MOTION_DICT: Array<[string, string]> = [
  ['bokeh', 'bokeh,defocused lights,glowing orbs'],
  ['particle particles sparkle sparkles dust confetti', 'particles,floating particles,sparkles'],
  ['snow snowflake snowflakes', 'snow,snowflakes,winter'],
  ['rain raindrop raindrops', 'rain,raindrops,rainy'],
  ['star stars starfield galaxy nebula cosmos', 'stars,space,galaxy,night sky'],
  ['aurora', 'aurora,northern lights'],
  ['wave waves waveform ripple ripples', 'waves,ripple effect'],
  ['grid mesh', 'grid,mesh'],
  ['hexagon hexagons honeycomb', 'hexagon,honeycomb pattern'],
  ['matrix', 'matrix code,digital rain'],
  ['radar sonar scanner scan', 'radar,scanning,tracking'],
  ['hologram hud', 'hologram,hud,futuristic interface'],
  ['network nodes node plexus', 'network,connected nodes,connections'],
  ['circuit circuits chip pcb', 'circuit board,electronics'],
  ['dna helix', 'dna,helix,genetics'],
  ['firework fireworks', 'fireworks,celebration'],
  ['fire flame flames ember embers', 'fire,flames,embers'],
  ['smoke fog mist', 'smoke,fog,mist'],
  ['lightning thunder', 'lightning,electric'],
  ['bubble bubbles', 'bubbles,underwater'],
  ['sakura petal petals blossom', 'sakura,petals,cherry blossom'],
  ['leaf leaves', 'leaves,nature'],
  ['heart hearts', 'heart,love'],
  ['lantern lanterns ramadan crescent', 'lantern,ramadan,crescent moon'],
  ['sunburst sunray sunrays godray rays beam beams', 'light rays,sunbeams'],
  ['flare lensflare', 'lens flare'],
  ['ring rings donut', 'rings,circular shapes'],
  ['pie', 'pie chart,infographic'],
  ['sun', 'sun,sunset'],
  ['moon', 'moon,night'],
  ['cloud clouds', 'clouds,sky'],
  ['equalizer spectrum audio', 'audio spectrum,equalizer,sound waves'],
  ['countdown timer', 'countdown,timer'],
  ['gear gears', 'gears,mechanical'],
  ['planet planets orbit orbits', 'planet,orbit,space'],
  ['neon', 'neon,neon lights'],
  ['glitch', 'glitch,distortion'],
  ['confetti', 'confetti,party'],
];

function codeWords(code: string): Set<string> {
  return new Set(
    String(code)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/style\s*=\s*("[^"]*"|'[^']*')/gi, ' ')
      .replace(/(?:request|cancel)AnimationFrame/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .match(/[a-z]+/g) || []
  );
}

function hslName(h: number, s: number, l: number): string {
  if (l < 0.1) return 'black';
  if (l > 0.93) return 'white';
  if (s < 0.14) return l < 0.3 ? 'dark gray' : l > 0.75 ? 'silver' : 'gray';
  const hue = ((h % 360) + 360) % 360;
  if (hue < 14 || hue >= 345) return l < 0.3 ? 'dark red' : 'red';
  if (hue < 38) return 'orange';
  if (hue < 52) return s > 0.55 && l > 0.4 ? 'gold' : 'yellow';
  if (hue < 70) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 185) return 'teal';
  if (hue < 200) return 'cyan';
  if (hue < 250) return l < 0.27 ? 'navy blue' : 'blue';
  if (hue < 290) return 'purple';
  if (hue < 325) return 'magenta';
  return 'pink';
}

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const mx = Math.max(rn, gn, bn);
  const mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : mx === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function detectColors(code: string): { colors: string[]; dark: boolean; light: boolean } {
  const cnt: Record<string, number> = {};
  const add = (n: string) => {
    cnt[n] = (cnt[n] || 0) + 1;
  };
  let m: RegExpExecArray | null;
  const hexRe = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  while ((m = hexRe.exec(code))) {
    let x = m[1];
    if (x.length === 3) x = x.split('').map((c) => c + c).join('');
    const [h, s, l] = rgb2hsl(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
    add(hslName(h, s, l));
  }
  const rgbRe = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  while ((m = rgbRe.exec(code))) {
    const [h, s, l] = rgb2hsl(+m[1], +m[2], +m[3]);
    add(hslName(h, s, l));
  }
  const hslRe = /hsla?\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/g;
  while ((m = hslRe.exec(code))) add(hslName(+m[1], +m[2] / 100, +m[3] / 100));
  const hslT = /hsla?\(\s*\$\{\s*\(?\s*(\d{1,3})/g;
  while ((m = hslT.exec(code))) add(hslName(+m[1], 0.85, 0.6));

  const all = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);
  const chroma = all.filter((n) => !/^(black|white|gray|dark gray|silver)$/.test(n)).slice(0, 3);
  return {
    colors: chroma,
    dark: all.includes('black') || all.includes('navy blue') || all.includes('dark gray'),
    light: all.indexOf('white') >= 0 && all.indexOf('white') < 2 && !chroma.length,
  };
}

export function detectVisuals(code: string): string[] {
  const k: string[] = [];
  const c = String(code);
  const W = codeWords(c);
  const add = (...a: string[]) => a.forEach((x) => k.push(x));
  for (const [toks, kws] of MOTION_DICT) {
    if (toks.split(' ').some((t) => W.has(t))) add(...kws.split(','));
  }
  const arcs = (c.match(/\.arc\(/g) || []).length;
  const lines = (c.match(/\.lineTo\(/g) || []).length;
  const radial = /createRadialGradient/.test(c);
  const linear = /createLinearGradient/.test(c);
  if (arcs && radial) add('glowing circles', 'soft glow');
  else if (arcs) add('circles', 'dots');
  if (lines && /Math\.sin|Math\.cos/.test(c)) add('flowing lines', 'curved lines');
  else if (lines) add('lines');
  if (lines && arcs && /Math\.hypot|Math\.sqrt/.test(c)) add('connected dots', 'plexus network');
  if (radial && !arcs) add('radial glow');
  if (linear) add('gradient');
  if (/strokeRect|roundRect/.test(c) && !/for\s*\(/.test(c)) add('frame', 'border');
  if (/shadowBlur/.test(c)) add('neon glow');
  if (/globalCompositeOperation\s*=\s*['"]lighter/.test(c)) add('additive light', 'luminous');
  if (/\.rotate\(/.test(c)) add('rotating');
  if (/bezierCurveTo|quadraticCurveTo/.test(c)) add('smooth curves');
  if (/\.fillText\(|\.strokeText\(/.test(c)) add('text animation', 'typography');
  if (/\.(?:fillRect|strokeRect)\(/.test(c) && /for\s*\(/.test(c) && !arcs && !lines) add('geometric shapes');
  return k;
}

export function drawnTexts(code: string): string[] {
  const out: string[] = [];
  const re = /(?:fillText|strokeText)\(\s*(['"])([^'"\\$\n]{1,40})\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const t = noBrand(m[2]);
    if (t && /[a-z0-9]/i.test(t) && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 3);
}

function titleCase(s: string): string {
  return String(s || '')
    .split(' ')
    .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function guessCat(t: string): number {
  const x = t.toLowerCase();
  if (/ramadan|eid|lantern|islam|wedding|religio|christmas|crescent/.test(x)) return 15;
  if (/medical|dna|ecg|heart rate|molecul|atom|cell|science|lab|genetic/.test(x)) return 16;
  if (/\bai\b|neural|cyber|network|circuit|matrix|hologram|quantum|data|tech|digital|hud|radar|code|futuristic/.test(x)) return 19;
  if (/stock|market|business|corporate|finance|growth|chart|global|infographic/.test(x)) return 3;
  if (/game|gaming|esport|synthwave|stream|retro/.test(x)) return 9;
  if (/sakura|snow|rain|water|underwater|aurora|star|milky|nature|sky|ocean|sun rays|leaves/.test(x)) return 5;
  return 8;
}

export function buildMeta(
  name: string,
  code: string,
  studio: Pick<StudioSettings, 'width' | 'height' | 'duration' | 'fps' | 'loop' | 'bgMode'>
) {
  const body = String(code || '').replace(/<meta\b[^>]*>/gi, ' ');
  const W = studio.width || 1920;
  const H = studio.height || 1080;
  let base = cleanTitle(noBrand(String(name || '').replace(/_/g, ' '))) || 'Motion Background';
  base = fitTitle(titleCase(base), 110) || 'Motion Background';
  const vis = body ? detectVisuals(body) : [];
  const col = body ? detectColors(body) : { colors: [], dark: false, light: false };
  const texts = body ? drawnTexts(body) : [];
  const looping = (!!body && /loopT|progress|%\s*duration|STUDIO_DURATION/.test(body)) || studio.loop;
  const transparent = studio.bgMode === 'transparent';
  const baseWords = base.split(' ').filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()));
  const colorKw: string[] = [];
  col.colors.forEach((c) => {
    colorKw.push(c);
    colorKw.push(`${c} light`);
  });
  if (transparent) colorKw.push('transparent background', 'alpha channel');
  else if (col.dark) colorKw.push('dark background');
  else if (col.light) colorKw.push('white background');

  const tech: string[] = [];
  if (looping) tech.push('seamless loop', 'looping animation');
  if (W >= 3840) tech.push('4k', 'ultra hd');
  else if (W >= 2560) tech.push('2k');
  else if (W >= 1920) tech.push('full hd', '1080p');
  else if (W >= 1280) tech.push('hd');
  if (H > W) tech.push('vertical video');

  const textKw = texts.map((t) => t.toLowerCase());
  const content = parseKw([base, ...baseWords, ...vis, ...textKw, ...colorKw]);
  const generic = [
    'motion graphics',
    'animated background',
    'video background',
    'abstract background',
    'backdrop',
    'copy space',
    'visual effect',
    'animation',
    'footage',
    'overlay',
  ];
  const keywords = parseKw([...content, ...tech, ...generic].map(noBrand)).slice(0, 50);
  const hasBg = /background|loop|animation|animated/i.test(base);
  const title = fitTitle(base + (hasBg ? '' : ' Animated Background'), META_TITLE_MAX) || 'Motion Background';
  const subj = vis
    .filter((v) => !/^(neon glow|additive light|luminous|gradient|rotating|smooth curves|typography|text animation|dots|lines|circles)$/.test(v))
    .slice(0, 3);
  const parts = [
    `${base} animated motion graphics` +
      (col.colors.length ? ` in ${col.colors.join(' and ')} tones` : '') +
      (subj.length ? ` with ${subj.join(', ')}` : '') +
      '.',
  ];
  if (texts.length) parts.push(`Features the text ${texts.join(', ')}.`);
  parts.push(`${W}x${H}, ${studio.duration}s at ${studio.fps} fps` + (looping ? ', seamless loop.' : '.'));
  parts.push('Ideal for intros, presentations and video backgrounds.');
  let desc = '';
  for (const p of parts) {
    if ((desc + ' ' + p).trim().length <= META_DESC_MAX) desc = (desc + ' ' + p).trim();
  }
  if (!desc) desc = fitDesc(parts[0], META_DESC_MAX);
  const catText = [base, ...vis, ...textKw].join(' ');
  return { title, description: desc, keywords, contentKeywords: content, cat: guessCat(catText), visuals: vis, colors: col.colors, texts };
}

export function detectVideoTitleFromCode(code: string, fallback = 'Custom HTML Motion'): string {
  const tm = code.match(/<title[^>]*>([^<]{2,60})<\/title>/i);
  if (tm && !/^(document|html5|canvas|untitled|index)$/i.test(tm[1].trim())) return noBrand(tm[1].trim()) || fallback;
  const cm = code.match(/^\s*(?:\/\/|\/\*|<!--)\s*([^\n\r*<>]{3,55})/m);
  if (cm) return noBrand(cm[1].replace(/(-->|\*\/)/g, '').trim()) || fallback;
  return noBrand(fallback) || 'Custom HTML Motion';
}

export function extractMetaFromCode(
  code: string,
  studio: Pick<StudioSettings, 'width' | 'height' | 'duration' | 'fps' | 'loop' | 'bgMode'>,
  nameHint?: string
): ExtractedMeta {
  const o: ExtractedMeta = { title: '', description: '', keywords: [], cat: 0, found: false, fields: [], derived: [], brandRemoved: false };
  const dec = (t: string) =>
    String(t)
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  const stockTags: Record<string, string> = {};
  const otherTags: Record<string, string> = {};
  const fallbackTags: Record<string, string> = {};

  for (const t of String(code).match(/<meta\b[^>]*>/gi) || []) {
    const n = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(t);
    const c = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(t);
    if (!n || !c) continue;
    const k = (n[1] !== undefined ? n[1] : n[2]).toLowerCase().trim();
    const v0 = dec(c[1] !== undefined ? c[1] : c[2]).trim();
    if (!v0) continue;
    if (hasBrand(v0)) o.brandRemoved = true;
    const v = noBrand(v0);
    if (!v) continue;
    const mm = /^(?:([a-z0-9]+)-)?(title|description|keywords|category)$/.exec(k);
    if (!mm) continue;
    if (mm[1]) (mm[1] === 'stock' ? stockTags : otherTags)[mm[2]] = v;
    else if (mm[2] === 'description' || mm[2] === 'keywords') fallbackTags[mm[2]] = v;
  }

  const pick = (f: string) => stockTags[f] || otherTags[f] || '';
  const tt = pick('title');
  const td = pick('description') || fallbackTags.description || '';
  const tk = pick('keywords') || fallbackTags.keywords || '';
  const tc = pick('category');

  const name = nameHint || detectVideoTitleFromCode(String(code), 'Motion Background');
  const d = buildMeta(name, code, studio);

  if (tt) {
    o.title = fitTitle(tt, META_TITLE_MAX);
    o.fields.push('judul');
  } else {
    o.title = d.title;
    o.derived.push('judul');
  }

  if (td) {
    o.description = fitDesc(td, META_DESC_MAX);
    o.fields.push('deskripsi');
  } else {
    o.description = d.description;
    o.derived.push('deskripsi');
  }

  const tkw = parseKw(tk).filter((k) => !hasBrand(k));
  if (tkw.length) {
    o.keywords = parseKw([...tkw, ...(tkw.length < 50 ? d.contentKeywords : [])]).slice(0, 50);
    o.fields.push(`${tkw.length} keyword`);
    if (o.keywords.length > tkw.length) o.derived.push(`${o.keywords.length - tkw.length} keyword dari isi animasi`);
  } else {
    o.keywords = d.keywords;
    o.derived.push('keyword');
  }

  const cm = matchCat(tc);
  if (cm) {
    o.cat = cm;
    o.fields.push('kategori');
  } else {
    o.cat = d.cat;
    o.derived.push('kategori');
  }
  o.found = o.fields.length > 0;
  return o;
}

export function buildFilename(
  ext: string,
  metaTitle: string,
  shortName: boolean,
  studio: Pick<StudioSettings, 'videoTitle' | 'width' | 'height' | 'fps' | 'duration'>,
  seq: number
): string {
  const n = new Date();
  const p = (x: number, l = 2) => String(x).padStart(l, '0');
  const tm = `${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
  const rawSlug = cleanTitle(metaTitle || studio.videoTitle)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Motion-Video';

  const clip = (max: number) => {
    if (rawSlug.length <= max) return rawSlug;
    const c = rawSlug.slice(0, max);
    const i = c.lastIndexOf('-');
    return (i >= Math.floor(max * 0.6) ? c.slice(0, i) : c).replace(/-+$/, '');
  };

  if (shortName) {
    const max = Math.max(8, 30 - (ext.length + 1) - 7);
    return `${clip(max)}-${tm}.${ext}`;
  }
  const st = `${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}-${tm}`;
  return `${clip(110)}_${studio.width}x${studio.height}_${studio.fps}fps_${studio.duration}s_${st}-${p(seq, 3)}.${ext}`;
}

export function csvCell(v: unknown): string {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function buildMetaCsv(k: 'adobe' | 'vecteezy', rows: Array<{ f: string; s: MetaSnapshot }>): string {
  return k === 'adobe'
    ? 'Filename,Title,Keywords,Category,Releases\r\n' +
        rows.map((r) => [r.f, r.s.title, r.s.keywords.join(','), r.s.cat, ''].map(csvCell).join(',')).join('\r\n') +
        '\r\n'
    : 'Filename,Title,Description,Keywords\r\n' +
        rows.map((r) => [r.f, r.s.title, r.s.desc, r.s.keywords.join(', ')].map(csvCell).join(',')).join('\r\n') +
        '\r\n';
}

export function exportCsvFiles(kind: 'adobe' | 'vecteezy' | 'both', log: DownloadLogEntry[], liveSnapshot: MetaSnapshot) {
  const rows = log.map((e) => ({ f: e.filename, s: e.live ? liveSnapshot : e.snap }));
  if (!rows.length) return { count: 0, longCount: 0 };
  const targets = kind === 'both' ? (['adobe', 'vecteezy'] as const) : ([kind] as const);
  targets.forEach((k, i) => {
    setTimeout(() => {
      const csv = buildMetaCsv(k, rows);
      const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = u;
      a.download = k === 'adobe' ? 'adobe-stock-metadata.csv' : 'vecteezy-metadata.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 20000);
    }, i * 650);
  });
  return { count: rows.length, longCount: rows.filter((r) => r.f.length > 30).length };
}

export async function exportBatchCsvToDir(
  kind: 'adobe' | 'vecteezy' | 'both' | 'none',
  batchLogs: DownloadLogEntry[],
  dir: FileSystemDirectoryHandle | null
): Promise<number> {
  const rows = batchLogs.map((e) => ({ f: e.filename, s: e.snap }));
  if (!rows.length || kind === 'none') return 0;
  const kinds = kind === 'both' ? (['adobe', 'vecteezy'] as const) : ([kind] as const);
  for (const k of kinds) {
    const name = k === 'adobe' ? 'adobe-stock-metadata.csv' : 'vecteezy-metadata.csv';
    const csv = '\uFEFF' + buildMetaCsv(k, rows);
    let saved = false;
    if (dir) {
      try {
        const fh = await dir.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(new Blob([csv], { type: 'text/csv' }));
        await w.close();
        saved = true;
      } catch {
        // fallback to browser download
      }
    }
    if (!saved) {
      const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = u;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 20000);
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  return rows.length;
}
