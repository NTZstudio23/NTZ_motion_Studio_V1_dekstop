export interface ZipHtmlEntry {
  name: string;
  text: string;
}

export async function readZipHtml(file: File): Promise<{ items: ZipHtmlEntry[]; skipped: number }> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser belum mendukung ekstrak ZIP, gunakan Chrome/Edge terbaru');
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('bukan file ZIP yang valid');

  const total = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (total === 0xffff || p === 0xffffffff) {
    throw new Error('ZIP64 (ukuran sangat besar) tidak didukung');
  }

  const out: ZipHtmlEntry[] = [];
  const td = new TextDecoder('utf-8');
  let skipped = 0;

  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const flag = dv.getUint16(p + 8, true);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true);
    const el = dv.getUint16(p + 30, true);
    const cl = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = td.decode(buf.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;

    const base = name.split('/').pop() || '';
    if (!base || /^__MACOSX\//.test(name) || base.startsWith('.') || !/\.html?$/i.test(base)) continue;
    if (flag & 1) {
      skipped++;
      continue;
    }

    try {
      const ln = dv.getUint16(lho + 26, true);
      const le = dv.getUint16(lho + 28, true);
      const ds = lho + 30 + ln + le;
      let data = buf.subarray(ds, ds + csize);
      if (method === 8) {
        const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        data = new Uint8Array(await new Response(stream).arrayBuffer());
      } else if (method !== 0) {
        skipped++;
        continue;
      }
      out.push({ name: base.replace(/\.[^.]+$/, ''), text: td.decode(data) });
    } catch {
      skipped++;
    }
  }

  out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { items: out, skipped };
}
