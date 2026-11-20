/**
 * Bộ lọc đa lớp bảo vệ an toàn Tiêu chuẩn Cộng đồng TikTok LIVE (tục tĩu, khiêu dâm, chất cấm, cờ bạc, bạo lực, lừa đảo).
 * - `containsBanned`: kiểm tra câu có dấu & từ viết tắt phổ biến (không bắt nhầm "lớn", "các", "buổi", "đeo").
 * - `isRudeName`: kiểm tra gắt cho TÊN hiển thị / tên đọc trên sóng (bắt cả l0n, đ.ị.t, djtme, lặp chữ loooon...).
 */

const BANNED_TOKENS = new Set([
  // Tiếng Việt có dấu & teen-code tục
  'lồn', 'lìn', 'cặc', 'buồi', 'đéo', 'địt', 'đụ', 'đĩ', 'cứt', 'đm', 'đmm', 'đcm', 'đkm',
  'dm', 'dmm', 'dcm', 'dkm', 'vcl', 'vkl', 'vcc', 'clgt', 'loz', 'dit', 'ditme', 'dume', 'cmm',
  'vl', 'cl', 'clm', 'ml', 'djt', 'đjt', 'chịch', 'nứng', 'phò', 'lol', 'buoi', 'kặc', 'cak',
  // Tiếng Anh
  'fuck', 'fck', 'fuk', 'shit', 'bitch', 'dick', 'pussy', 'sex', 'sexy', 'porn', 'nude', 'xxx', 'cave',
  // Bạo lực, cờ bạc, lừa đảo
  'giết', 'chém', 'casino', 'scam', 'kubet', 'sunwin', 'go88', 'rikvip', 'bet88',
]);

const BANNED_PHRASES = [
  'địt mẹ', 'đụ má', 'đù má', 'đéo mẹ', 'con đĩ', 'dit me', 'du ma', 'vãi lồn', 'óc chó', 'súc vật', 'mẹ mày', 'bố mày',
  'ma túy', 'ma tuý', 'thuốc lắc', 'cần sa', 'cá độ', 'lô đề', 'cờ bạc', 'chuyển khoản', 'lừa đảo', 'tài xỉu',
];

const normalize = (text: string) => text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
const tokensOf = (text: string) => normalize(text).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);

export function containsBanned(text: string): boolean {
  if (!text) return false;
  const tokens = tokensOf(text);
  if (tokens.some((t) => BANNED_TOKENS.has(t))) return true;
  const joined = ` ${tokens.join(' ')} `;
  return BANNED_PHRASES.some((p) => joined.includes(` ${p} `));
}

/**
 * Kiểm tra gắt cho TÊN người chơi (hiện lên Sắc Phong / Banner hoặc MC đọc tên):
 * bỏ dấu, giải mã leetspeak (l0n, đ!t, @), gộp chữ lặp (loooon -> lon), ghép chữ chấm cách (đ.ị.t -> dit).
 */
const RUDE_PLAIN = new Set([
  'lon', 'loz', 'lol', 'cak', 'kac', 'buoi', 'deo', 'dit', 'djt', 'dm', 'dmm', 'dcm', 'dkm', 'dume', 'duma',
  'ditme', 'vcl', 'vkl', 'vl', 'cl', 'clm', 'ml', 'cmm', 'cc', 'chich', 'nung', 'cave', 'sex', 'sexy', 'fuck', 'fck',
  'shit', 'bitch', 'dick', 'porn', 'xxx', 'nude', 'kubet', 'sunwin', 'go88',
]);

const RUDE_SQUASHED = [
  'concac', 'ditme', 'ditcon', 'dume', 'duma', 'dumay', 'memay', 'bomay',
  'sucvat', 'occho', 'oclon', 'vailon', 'lonme', 'buoime', 'clgt', 'taixiu',
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '$': 's', '5': 's', '7': 't', j: 'i',
};

const plainRude = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[01!|3@$457j]/g, (c) => LEET[c] ?? c)
    .replace(/([a-z])\1+/g, '$1');

export function isRudeName(text: string): boolean {
  if (!text) return false;
  if (containsBanned(text)) return true;
  // Xét cả bản thay leetspeak (l0n -> lon) lẫn bản tách số đuôi (djt123 -> dit)
  const strippedNums = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/j/g, 'i')
    .replace(/([a-z])\1+/g, '$1');
  for (const p of [plainRude(text), strippedNums]) {
    const words = p.split(/[^a-z]+/).filter(Boolean);
    if (words.some((w) => RUDE_PLAIN.has(w))) return true;
    const singles = p.split(/[^a-z]+/).map((w) => (w.length === 1 ? w : ' ')).join('').split(' ');
    if (singles.some((w) => w.length > 1 && RUDE_PLAIN.has(w))) return true;
    const squashed = p.replace(/[^a-z]/g, '');
    if (RUDE_SQUASHED.some((r) => squashed.includes(r))) return true;
  }
  return false;
}

export function maskBanned(text: string): string {
  if (!containsBanned(text)) return text;
  let out = text.replace(/[\p{L}\p{M}\p{N}]+/gu, (w) => (BANNED_TOKENS.has(w.normalize('NFC').toLowerCase()) ? '***' : w));
  for (const p of BANNED_PHRASES) {
    out = out.replace(new RegExp(p.replace(/ /g, '\\s+'), 'giu'), '***');
  }
  return out;
}
