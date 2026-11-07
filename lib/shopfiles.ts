import path from 'path';

export const MAX_BYTES = Math.max(1, Number(process.env.MAX_DIGITAL_FILE_MB || 25)) * 1024 * 1024;

export function storageDir() {
  return path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), 'storage', 'digital'));
}

export const KEY_RE = /^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/;

type Rule = { mime: string; check: (b: Buffer) => boolean };
const zip = (b: Buffer) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4;
const ascii = (b: Buffer, off: number, s: string) => b.subarray(off, off + s.length).toString('latin1') === s;

export const RULES: Record<string, Rule> = {
  pdf: { mime: 'application/pdf', check: (b) => ascii(b, 0, '%PDF') },
  png: { mime: 'image/png', check: (b) => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) },
  jpg: { mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { mime: 'image/webp', check: (b) => ascii(b, 0, 'RIFF') && ascii(b, 8, 'WEBP') },
  gif: { mime: 'image/gif', check: (b) => ascii(b, 0, 'GIF87a') || ascii(b, 0, 'GIF89a') },
  mp3: { mime: 'audio/mpeg', check: (b) => ascii(b, 0, 'ID3') || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  mp4: { mime: 'video/mp4', check: (b) => ascii(b, 4, 'ftyp') },
  zip: { mime: 'application/zip', check: zip },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', check: zip },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', check: zip },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', check: zip },
  txt: { mime: 'text/plain; charset=utf-8', check: (b) => !b.subarray(0, 4096).includes(0) },
};

export const ACCEPT = Object.keys(RULES).map((e) => '.' + e).join(',');

export function extOf(name: string) {
  const m = /\.([A-Za-z0-9]{2,5})$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

export function safeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'arquivo';
}
