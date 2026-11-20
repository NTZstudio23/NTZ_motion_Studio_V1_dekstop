import { EncoderSupportInfo, MetaSnapshot, StudioSettings } from '../types/studio';
import { escXml } from './metadata';

export interface EncodedSample {
  data: Uint8Array;
  isKey: boolean;
  alpha: Uint8Array | null;
}

export interface WebCodecsSelection {
  container: 'mp4' | 'mov' | 'webm';
  codec: string;
  bps: number;
  cfg: VideoEncoderConfig;
  alpha: boolean;
}

const textEnc = new TextEncoder();
const utf8 = (s: string) => textEnc.encode(String(s == null ? '' : s));
const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const sb = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

const asBlobPart = (u: Uint8Array): BlobPart => u as unknown as BlobPart;

function zeroPad(n: number): BlobPart[] {
  const z = new Uint8Array(Math.min(n, 4194304));
  const o: BlobPart[] = [];
  let rem = n;
  while (rem > 0) {
    const k = Math.min(rem, z.length);
    o.push(asBlobPart(k === z.length ? z : z.subarray(0, k)));
    rem -= k;
  }
  return o;
}

export function padBlob(blob: Blob, ext: string, target: number): Blob {
  const d = target - blob.size;
  if (d < 16) return blob;
  if (ext === 'webm') {
    const vh = new Uint8Array(9);
    vh[0] = 0xec;
    vh[1] = 1;
    let r = BigInt(d - 9);
    for (let k = 8; k >= 2; k--) {
      vh[k] = Number(r & 0xffn);
      r >>= 8n;
    }
    return new Blob([blob, asBlobPart(vh), ...zeroPad(d - 9)], { type: blob.type });
  }
  const q = Math.min(d, 4294967295);
  const fh = new Uint8Array(8);
  new DataView(fh.buffer).setUint32(0, q, false);
  fh.set([102, 114, 101, 101], 4);
  return new Blob([blob, asBlobPart(fh), ...zeroPad(q - 8)], { type: blob.type });
}

// === MP4 / MOV MUXER ===
function mp4Box(t: string, ...parts: Uint8Array[]): Uint8Array {
  let l = 8;
  for (const p of parts) l += p.length;
  const o = new Uint8Array(l);
  new DataView(o.buffer).setUint32(0, l, false);
  o[4] = t.charCodeAt(0);
  o[5] = t.charCodeAt(1);
  o[6] = t.charCodeAt(2);
  o[7] = t.charCodeAt(3);
  let f = 8;
  for (const p of parts) {
    o.set(p, f);
    f += p.length;
  }
  return o;
}

function qtTextBox(t: string, v: string): Uint8Array {
  const b = utf8(v);
  return mp4Box(t, new Uint8Array([(b.length >> 8) & 255, b.length & 255, 0x15, 0xc7]), b);
}

function ilstItem(t: string, v: string): Uint8Array {
  return mp4Box(t, mp4Box('data', new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0]), utf8(v)));
}

function buildMp4Udta(m: MetaSnapshot, isMov: boolean): Uint8Array {
  const kws = m.keywords.join(', ');
  const parts = [qtTextBox('©nam', m.title), qtTextBox('©cmt', m.desc), qtTextBox('©key', kws), qtTextBox('©inf', m.desc)];
  if (!isMov) {
    const hd = mp4Box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, ...sb('mdir'), ...sb('appl'), 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    const il = mp4Box('ilst', ilstItem('©nam', m.title), ilstItem('desc', m.desc), ilstItem('©cmt', m.desc), ilstItem('keyw', kws), ilstItem('©gen', m.catName));
    parts.push(mp4Box('meta', new Uint8Array([0, 0, 0, 0]), hd, il));
  }
  return mp4Box('udta', ...parts);
}

function buildXmpBox(m: MetaSnapshot): Uint8Array {
  const li = (v: string) => `<rdf:li>${escXml(v)}</rdf:li>`;
  const x = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escXml(m.title)}</rdf:li></rdf:Alt></dc:title><dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escXml(m.desc)}</rdf:li></rdf:Alt></dc:description><dc:subject><rdf:Bag>${m.keywords.map(li).join('')}</rdf:Bag></dc:subject></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  return mp4Box('uuid', new Uint8Array([0xbe, 0x7a, 0xcf, 0xcb, 0x97, 0xa9, 0x42, 0xe8, 0x9c, 0x71, 0x99, 0x94, 0x91, 0xe3, 0xaf, 0xac]), utf8(x));
}

export function buildMp4Blob(
  samples: EncodedSample[],
  avcC: Uint8Array,
  w: number,
  h: number,
  fps: number,
  isMov: boolean,
  targetBytes: number,
  meta: MetaSnapshot | null
): Blob {
  const ts = 90000;
  const fd = Math.round(ts / fps);
  const td = samples.length * fd;
  const ftyp = isMov
    ? mp4Box('ftyp', new Uint8Array([...sb('qt  '), ...u32(512), ...sb('qt  '), ...sb('isom'), ...sb('avc1')]))
    : mp4Box('ftyp', new Uint8Array([...sb('isom'), ...u32(512), ...sb('isom'), ...sb('iso2'), ...sb('avc1'), ...sb('mp41')]));
  const mx = new Uint8Array([...u32(0x10000), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(0x10000), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(0x40000000)]);
  const mvhd = mp4Box('mvhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(ts), ...u32(td), ...u32(0x10000), 1, 0, ...new Array(10).fill(0), ...mx, ...new Array(24).fill(0), ...u32(2)]));
  const tkhd = mp4Box('tkhd', new Uint8Array([0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(1), 0, 0, 0, 0, ...u32(td), ...new Array(16).fill(0), ...mx, ...u32((w * 65536) >>> 0), ...u32((h * 65536) >>> 0)]));
  const mdhd = mp4Box('mdhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(ts), ...u32(td), 0x55, 0xc4, 0, 0]));
  const hdlr = mp4Box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, ...sb('vide'), ...new Array(12).fill(0), ...sb('VideoHandler\0')]));
  const vmhd = mp4Box('vmhd', new Uint8Array([0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]));
  const dinf = mp4Box('dinf', mp4Box('dref', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]), mp4Box('url ', new Uint8Array([0, 0, 0, 1]))));
  const a1 = new Uint8Array(78);
  a1[7] = 1;
  a1[24] = (w >>> 8) & 255;
  a1[25] = w & 255;
  a1[26] = (h >>> 8) & 255;
  a1[27] = h & 255;
  a1[29] = 0x48;
  a1[33] = 0x48;
  a1[41] = 1;
  a1[75] = 24;
  a1[76] = 255;
  a1[77] = 255;

  const stsd = mp4Box('stsd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]), mp4Box('avc1', a1, mp4Box('avcC', avcC)));
  const stts = mp4Box('stts', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(samples.length), ...u32(fd)]));
  const keys: number[] = [];
  samples.forEach((s, i) => {
    if (s.isKey) keys.push(i + 1);
  });
  if (!keys.length) keys.push(1);
  const sbB = new Uint8Array(8 + keys.length * 4);
  const sbD = new DataView(sbB.buffer);
  sbD.setUint32(4, keys.length, false);
  keys.forEach((k, i) => sbD.setUint32(8 + i * 4, k, false));
  const stss = mp4Box('stss', sbB);
  const stsc = mp4Box('stsc', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(1), ...u32(1), ...u32(1)]));
  const szB = new Uint8Array(12 + samples.length * 4);
  const szD = new DataView(szB.buffer);
  szD.setUint32(8, samples.length, false);
  let ml = 0;
  samples.forEach((s, i) => {
    szD.setUint32(12 + i * 4, s.data.length, false);
    ml += s.data.length;
  });
  const stsz = mp4Box('stsz', szB);
  const stcoD = new Uint8Array(8 + samples.length * 4);
  new DataView(stcoD.buffer).setUint32(4, samples.length, false);
  const udta = meta ? buildMp4Udta(meta, isMov) : null;
  const asm = (co: Uint8Array) =>
    mp4Box('moov', mvhd, mp4Box('trak', tkhd, mp4Box('mdia', mdhd, hdlr, mp4Box('minf', vmhd, dinf, mp4Box('stbl', stsd, stts, stss, stsc, stsz, co)))), ...(udta ? [udta] : []));
  const m0 = asm(mp4Box('stco', stcoD));
  let off = ftyp.length + m0.length + 8;
  const coDv = new DataView(stcoD.buffer);
  samples.forEach((s, i) => {
    coDv.setUint32(8 + i * 4, off, false);
    off += s.data.length;
  });
  const moov = asm(mp4Box('stco', stcoD));
  const mh = new Uint8Array(8);
  new DataView(mh.buffer).setUint32(0, 8 + ml, false);
  mh[4] = 109;
  mh[5] = 100;
  mh[6] = 97;
  mh[7] = 116;

  const xmp = meta ? buildXmpBox(meta) : null;
  const parts: BlobPart[] = [asBlobPart(ftyp), asBlobPart(moov), asBlobPart(mh), ...samples.map((s) => asBlobPart(s.data))];
  if (xmp) parts.push(asBlobPart(xmp));
  const diff = targetBytes - (ftyp.length + moov.length + 8 + ml + (xmp ? xmp.length : 0));
  if (diff > 16) {
    const p = Math.min(diff, 4294967295);
    const fh = new Uint8Array(8);
    new DataView(fh.buffer).setUint32(0, p, false);
    fh[4] = 102;
    fh[5] = 114;
    fh[6] = 101;
    fh[7] = 101;
    parts.push(asBlobPart(fh), ...zeroPad(p - 8));
  }
  return new Blob(parts, { type: isMov ? 'video/quicktime' : 'video/mp4' });
}

// === WEBM MUXER ===
function eVint(l: number): Uint8Array {
  if (l < 0x7f) return new Uint8Array([0x80 | l]);
  if (l < 0x3fff) return new Uint8Array([0x40 | (l >> 8), l & 255]);
  if (l < 0x1fffff) return new Uint8Array([0x20 | (l >> 16), (l >> 8) & 255, l & 255]);
  if (l < 0x0fffffff) return new Uint8Array([0x10 | (l >>> 24), (l >> 16) & 255, (l >> 8) & 255, l & 255]);
  const b = new Uint8Array(8);
  b[0] = 1;
  let r = BigInt(l);
  for (let i = 7; i >= 1; i--) {
    b[i] = Number(r & 0xffn);
    r >>= 8n;
  }
  return b;
}

function eEl(id: number[], ...parts: Uint8Array[]): Uint8Array {
  let t = 0;
  for (const p of parts) t += p.length;
  const s = eVint(t);
  const o = new Uint8Array(id.length + s.length + t);
  o.set(id, 0);
  o.set(s, id.length);
  let f = id.length + s.length;
  for (const p of parts) {
    o.set(p, f);
    f += p.length;
  }
  return o;
}

function eU(v: number): Uint8Array {
  if (!v) return new Uint8Array([0]);
  const b: number[] = [];
  let x = BigInt(v);
  while (x > 0n) {
    b.unshift(Number(x & 0xffn));
    x >>= 8n;
  }
  return new Uint8Array(b);
}

function eF64(v: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, v, false);
  return b;
}

function buildWebmTags(m: MetaSnapshot): Uint8Array {
  const st = (n: string, v: string) => eEl([0x67, 0xc8], eEl([0x45, 0xa3], utf8(n)), eEl([0x44, 0x87], utf8(v)));
  return eEl(
    [0x12, 0x54, 0xc3, 0x67],
    eEl(
      [0x73, 0x73],
      eEl([0x63, 0xc0], eEl([0x68, 0xca], eU(50))),
      st('TITLE', m.title),
      st('DESCRIPTION', m.desc),
      st('KEYWORDS', m.keywords.join(', ')),
      st('GENRE', m.catName)
    )
  );
}

export function buildWebmBlob(
  samples: EncodedSample[],
  w: number,
  h: number,
  fps: number,
  codec: string,
  targetBytes: number,
  meta: MetaSnapshot | null
): Blob {
  const durMs = (samples.length / fps) * 1000;
  const ddNs = Math.round(1_000_000_000 / fps);
  const hasA = samples.some((s) => s.alpha && s.alpha.length);
  const hdr = eEl(
    [0x1a, 0x45, 0xdf, 0xa3],
    eEl([0x42, 0x86], eU(1)),
    eEl([0x42, 0xf7], eU(1)),
    eEl([0x42, 0xf2], eU(4)),
    eEl([0x42, 0xf3], eU(8)),
    eEl([0x42, 0x82], new Uint8Array(sb('webm'))),
    eEl([0x42, 0x87], eU(4)),
    eEl([0x42, 0x85], eU(2))
  );
  const info = eEl(
    [0x15, 0x49, 0xa9, 0x66],
    eEl([0x2a, 0xd7, 0xb1], eU(1000000)),
    eEl([0x4d, 0x80], new Uint8Array(sb('WebCodecs'))),
    eEl([0x57, 0x41], new Uint8Array(sb('WebCodecs'))),
    eEl([0x44, 0x89], eF64(durMs)),
    ...(meta ? [eEl([0x7b, 0xa9], utf8(meta.title))] : [])
  );
  const trk = eEl(
    [0x16, 0x54, 0xae, 0x6b],
    eEl(
      [0xae],
      eEl([0xd7], eU(1)),
      eEl([0x73, 0xc5], eU(1)),
      eEl([0x83], eU(1)),
      eEl([0x23, 0xe3, 0x83], eU(ddNs)),
      eEl([0x86], new Uint8Array(sb(codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9'))),
      eEl([0xe0], eEl([0xb0], eU(w)), eEl([0xba], eU(h)), ...(hasA ? [eEl([0x53, 0xc0], eU(1))] : []))
    )
  );

  const cls: Uint8Array[] = [];
  const cinfo: Array<{ t: number; key: boolean }> = [];
  let blks: Uint8Array[] = [];
  let ct = 0;
  let ck = false;

  const flush = () => {
    if (blks.length) {
      cls.push(eEl([0x1f, 0x43, 0xb6, 0x75], eEl([0xe7], eU(ct)), ...blks));
      cinfo.push({ t: ct, key: ck });
      blks = [];
    }
  };

  samples.forEach((s, i) => {
    const tm = Math.round((i / fps) * 1000);
    if (!blks.length) ct = tm;
    else if ((s.isKey && tm - ct >= 1000) || tm - ct >= 10000) {
      flush();
      ct = tm;
    }
    if (!blks.length) ck = !!s.isKey;
    const r = tm - ct;
    const bk = new Uint8Array(4 + s.data.length);
    bk[0] = 0x81;
    bk[1] = (r >> 8) & 255;
    bk[2] = r & 255;
    const ga = !!(hasA && s.alpha && s.alpha.length);
    bk[3] = s.isKey && !ga ? 0x80 : 0;
    bk.set(s.data, 4);
    blks.push(
      ga
        ? eEl(
            [0xa0],
            eEl([0xa1], bk),
            ...(s.isKey ? [] : [eEl([0xfb], new Uint8Array([0xff]))]),
            eEl([0x75, 0xa1], eEl([0xa6], eEl([0xee], eU(1)), eEl([0xa5], s.alpha!)))
          )
        : eEl([0xa3], bk)
    );
  });
  flush();

  const tags = meta ? buildWebmTags(meta) : new Uint8Array(0);
  let pos = info.length + trk.length + tags.length;
  const cp: Uint8Array[] = [];
  cls.forEach((c, i) => {
    if (cinfo[i].key) cp.push(eEl([0xbb], eEl([0xb3], eU(cinfo[i].t)), eEl([0xb7], eEl([0xf7], eU(1)), eEl([0xf1], eU(pos)))));
    pos += c.length;
  });
  const cues = cp.length ? eEl([0x1c, 0x53, 0xbb, 0x6b], ...cp) : new Uint8Array(0);
  let sp = info.length + trk.length + cues.length + tags.length;
  for (const c of cls) sp += c.length;

  const diff = targetBytes - (hdr.length + 12 + sp);
  const ev: BlobPart[] = [];
  if (diff >= 12) {
    const p = diff;
    const vp = p - 9;
    const vh = new Uint8Array(9);
    vh[0] = 0xec;
    vh[1] = 1;
    let rem = BigInt(vp);
    for (let k = 8; k >= 2; k--) {
      vh[k] = Number(rem & 0xffn);
      rem >>= 8n;
    }
    ev.push(asBlobPart(vh), ...zeroPad(vp));
    sp += p;
  }

  const sh = new Uint8Array(12);
  sh[0] = 0x18;
  sh[1] = 0x53;
  sh[2] = 0x80;
  sh[3] = 0x67;
  sh[4] = 1;
  let rs = BigInt(sp);
  for (let k = 11; k >= 5; k--) {
    sh[k] = Number(rs & 0xffn);
    rs >>= 8n;
  }
  return new Blob(
    [asBlobPart(hdr), asBlobPart(sh), asBlobPart(info), asBlobPart(trk), asBlobPart(tags), ...cls.map(asBlobPart), asBlobPart(cues), ...ev],
    { type: 'video/webm' }
  );
}

const AVC_LV: Array<[number, number, number, number]> = [
  [0x34, 2073600, 36864, 240],
  [0x33, 983040, 36864, 240],
  [0x3c, 4177920, 139264, 240],
  [0x3d, 8355840, 139264, 480],
  [0x32, 589824, 22080, 135],
  [0x2a, 522240, 8704, 50],
  [0x29, 245760, 8192, 50],
  [0x28, 245760, 8192, 20],
];

export function getTargetBytes(s: StudioSettings): number {
  return s.targetSizeMode === 'custom'
    ? Math.round(s.targetSizeMB * 1048576)
    : Math.round((s.bitrateMbps * 1e6 / 8) * s.duration);
}

export function getEffectiveBitrateMbps(s: StudioSettings): number {
  return s.targetSizeMode === 'custom'
    ? Math.max(0.25, Math.min(100, (getTargetBytes(s) * 8) / (s.duration * 1e6) * 0.97))
    : s.bitrateMbps;
}

function codecCandidates(s: StudioSettings, effMbps: number): Array<{ codec: string; container: 'mp4' | 'mov' | 'webm' }> {
  const out: Array<{ codec: string; container: 'mp4' | 'mov' | 'webm' }> = [];
  const mbs = Math.ceil(s.width / 16) * Math.ceil(s.height / 16);
  const wantAlpha = s.bgMode === 'transparent';
  if (!wantAlpha && (s.format === 'MP4' || s.format === 'MOV')) {
    const cont: 'mp4' | 'mov' = s.format === 'MOV' ? 'mov' : 'mp4';
    for (const l of AVC_LV.slice()
      .sort((a, b) => a[0] - b[0])
      .filter((l) => l[2] >= mbs && l[1] >= mbs * s.fps && l[3] >= effMbps)) {
      for (const p of [0x4d, 0x64, 0x42]) {
        out.push({ codec: 'avc1.' + p.toString(16) + '00' + l[0].toString(16), container: cont });
      }
    }
  }
  for (const v of s.width * s.height > 8912896 ? ['60', '61', '62'] : ['51', '52', '41', '10']) {
    out.push({ codec: 'vp09.00.' + v + '.08', container: 'webm' });
  }
  out.push({ codec: 'vp8', container: 'webm' });
  return out;
}

function buildEncCfg(
  c: { codec: string; container: 'mp4' | 'mov' | 'webm' },
  s: StudioSettings,
  bps: number,
  mode: BitrateMode | null,
  alpha: boolean,
  hw: HardwareAcceleration | null
): VideoEncoderConfig {
  const cfg: VideoEncoderConfig = {
    codec: c.codec,
    width: s.width,
    height: s.height,
    bitrate: bps,
    framerate: s.fps,
  };
  if (mode) cfg.bitrateMode = mode;
  if (hw) cfg.hardwareAcceleration = hw;
  if (c.container !== 'webm') {
    cfg.avc = { format: 'avc' };
    cfg.latencyMode = 'realtime';
  } else if (alpha) {
    cfg.alpha = 'keep';
  }
  return cfg;
}

export async function findBestWebCodecsConfig(s: StudioSettings): Promise<WebCodecsSelection | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
  const eff = getEffectiveBitrateMbps(s);
  const bps = Math.round(eff * 1e6);
  const wantAlpha = s.bgMode === 'transparent';

  const tryFind = async (al: boolean): Promise<WebCodecsSelection | null> => {
    for (const c of codecCandidates(s, eff)) {
      for (const mode of ['constant', 'variable', null] as Array<BitrateMode | null>) {
        for (const hw of ['prefer-hardware', null] as Array<HardwareAcceleration | null>) {
          try {
            const cfg = buildEncCfg(c, s, bps, mode, al, hw);
            const r = await VideoEncoder.isConfigSupported(cfg);
            if (r && r.supported && (!al || (r.config && r.config.alpha === 'keep'))) {
              return { container: c.container, codec: c.codec, bps, cfg, alpha: al };
            }
          } catch {
            // Skip unsupported encoder combo
          }
        }
      }
    }
    return null;
  };

  return (wantAlpha && (await tryFind(true))) || (await tryFind(false));
}

export function pickMRConfig(s: StudioSettings): { mime: string; ext: 'mp4' | 'mov' | 'webm'; ok: boolean } {
  if (typeof MediaRecorder === 'undefined') return { mime: '', ext: 'webm', ok: false };
  const sup = (m: string) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m);
  if (s.bgMode === 'transparent') {
    for (const m of ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm']) {
      if (sup(m)) return { mime: m, ext: 'webm', ok: true };
    }
  }
  if (s.format === 'MP4' || s.format === 'MOV') {
    const ext = s.format === 'MOV' ? 'mov' : 'mp4';
    if (s.format === 'MOV') {
      for (const m of ['video/quicktime;codecs=avc1', 'video/quicktime']) {
        if (sup(m)) return { mime: m, ext: 'mov', ok: true };
      }
    }
    for (const m of ['video/mp4;codecs=avc1.640033', 'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']) {
      if (sup(m)) return { mime: m, ext, ok: true };
    }
  }
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (sup(m)) return { mime: m, ext: 'webm', ok: s.format === 'WebM' };
  }
  return { mime: '', ext: 'webm', ok: s.format === 'WebM' };
}

export async function inspectEncoderSupport(s: StudioSettings): Promise<EncoderSupportInfo> {
  const wc = await findBestWebCodecsConfig(s);
  let ext = 'mp4';
  let engineLabel = 'WebCodecs Frame-Exact';
  let note = '';
  let alphaWarning = '';
  let alphaSupported = false;

  if (wc) {
    ext = wc.container;
    alphaSupported = wc.alpha;
    note =
      wc.container === 'webm' && s.format !== 'WebM'
        ? `Browser tidak mendukung encode H.264 ${s.format} pada ${s.width}×${s.height}; memakai WebCodecs VP9 (.WEBM) presisi durasi & FPS.`
        : `Mode Frame-Exact Aktif (${wc.container.toUpperCase()} · ${wc.codec}): Durasi & FPS 100% akurat anti-patah.`;
  } else {
    const mr = pickMRConfig(s);
    ext = mr.ext;
    engineLabel = 'MediaRecorder';
    note = mr.ok ? `MediaRecorder (${mr.ext.toUpperCase()}).` : 'Browser hanya mendukung WebM MediaRecorder.';
  }

  if (s.bgMode === 'transparent') {
    const mrA = typeof MediaRecorder !== 'undefined' && pickMRConfig(s).ok;
    if (wc && wc.alpha) {
      alphaWarning = `Alpha Transparan aktif: output .WEBM (${wc.codec} + alpha channel). MP4/MOV tidak mendukung alpha.`;
    } else if (mrA) {
      alphaWarning = 'Alpha via MediaRecorder WebM (tergantung browser). MP4/MOV tidak mendukung alpha.';
    } else {
      alphaWarning =
        'Browser ini tidak bisa encode alpha: hasil berlatar hitam. Gunakan Chrome/Edge desktop atau Solid #00FF00 untuk chroma key.';
    }
  }

  return { ext, engineLabel, note, alphaWarning, alphaSupported };
}
