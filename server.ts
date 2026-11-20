/**
 * Server trung tâm của Ghe Ngo 34 Tỉnh (LIVE-DUAGHE — Phiên bản nâng cấp Duong Birken).
 *
 * - Kết nối phòng live TikTok (tiktok-live-connector 2.x, proto v3) + tự kết nối lại cả ngày
 * - Nhúng trực tiếp AI Voice VieNeu-TTS v3 Turbo (ONNX INT8, 25 giọng Việt + "Adam bựa") qua stdio pipe
 * - Dự phòng 3 tầng: VieNeu-TTS -> Microsoft Edge TTS (NamMinh / HoaiMy, chống crash timeout) -> Google TTS
 * - Bảng vàng Tỉnh Hôm Nay + Bảng vàng Tỉnh Tuần (data/bang-vang.json) & Cấp bậc Thủy Thủ Trọn Đời (data/tay-cheo.json)
 * - Tự lùi cổng nếu cổng 3010 đang bận + fallback Vite an toàn trên mọi máy Windows
 */
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn, type ChildProcessByStdio } from 'child_process';
import type { Readable, Writable } from 'stream';
import { fileURLToPath } from 'url';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const BASE_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
let actualPort = BASE_PORT;

const TTS_VOICE_M = process.env.TTS_VOICE || 'vi-VN-NamMinhNeural';
const TTS_VOICE_F = process.env.TTS_VOICE_F || 'vi-VN-HoaiMyNeural';
const TTS_PITCH = process.env.TTS_PITCH || '-4%';

// Chặn DNS rebinding: chỉ nhận truy cập từ máy cục bộ
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'lvh.me']);
const hostOk = (h?: string) => !!h && LOCAL_HOSTS.has(h.replace(/:\d+$/, '').toLowerCase());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!hostOk(req.headers.host) || (origin && !hostOk(origin.replace(/^https?:\/\//, '')))) return res.status(403).end();
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// ---------- Cài đặt bền vững ----------
export interface CaiDatServer {
  tieuDe: string;
  tieuDePhu: string;
  duaSec: number;
  anQua: boolean;
  choDoiGhe: boolean;
  musicVol: number;
  sfxVol: number;
  mcVol: number;
}

interface SettingsFile {
  channelName?: string;
  tiktokUser?: string;
  vieneuVoice?: string;
  tieuDe?: string;
  tieuDePhu?: string;
  duaSec?: number;
  anQua?: boolean;
  choDoiGhe?: boolean;
  musicVol?: number;
  sfxVol?: number;
  mcVol?: number;
}

const SETTINGS_FILE = path.join(__dirname, 'settings.json');
let wantUser = '';
let lastRateControl: { action: string; text: string } | null = null;
let lastNameControl: { action: string; text: string } | null = null;
let settings: SettingsFile = {};

try {
  settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  if (typeof settings.channelName === 'string' && settings.channelName.trim()) {
    lastNameControl = { action: 'setName', text: settings.channelName.trim() };
  }
  if (typeof settings.tiktokUser === 'string') wantUser = settings.tiktokUser;
} catch {
  // chưa có settings.json
}

const saveSettings = (patch: Partial<SettingsFile>) => {
  settings = { ...settings, ...patch };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Không lưu được settings.json:', err);
  }
};

const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

const caiDat = (): CaiDatServer => ({
  tieuDe: settings.tieuDe ?? '',
  tieuDePhu: settings.tieuDePhu ?? '',
  duaSec: clampNum(settings.duaSec, 60, 360, 150),
  anQua: Boolean(settings.anQua ?? false),
  choDoiGhe: settings.choDoiGhe !== undefined ? Boolean(settings.choDoiGhe) : true,
  musicVol: clampNum(settings.musicVol, 0, 100, 22),
  sfxVol: clampNum(settings.sfxVol, 0, 100, 35),
  mcVol: clampNum(settings.mcVol, 0, 100, 100),
});

// ---------- SSE ----------
interface LiveStats {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  port: number;
  error?: string;
}

const emptyStats = (): LiveStats => ({
  isConnected: false,
  isConnecting: false,
  username: '',
  roomId: '',
  viewerCount: 0,
  totalLikes: 0,
  port: actualPort,
  error: '',
});

let liveStats = emptyStats();
let sseClients: express.Response[] = [];
let stageIds: string[] = [];
const announceSpeaker = () => broadcast('speaker', { id: stageIds[stageIds.length - 1] ?? null, count: stageIds.length });
let activeConn: InstanceType<typeof TikTokLiveConnection> | null = null;

function broadcast(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      // trình duyệt đã đóng
    }
  }
}

app.get('/api/tiktok/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  liveStats.port = actualPort;
  res.write(`event: status\ndata: ${JSON.stringify(liveStats)}\n\n`);
  res.write(`event: caiDat\ndata: ${JSON.stringify(caiDat())}\n\n`);
  res.write(`event: vieneu\ndata: ${JSON.stringify(getVieneuStatus())}\n\n`);
  if (lastRateControl) res.write(`event: control\ndata: ${JSON.stringify(lastRateControl)}\n\n`);
  if (lastNameControl) res.write(`event: control\ndata: ${JSON.stringify(lastNameControl)}\n\n`);
  sseClients.push(res);

  const stageId = typeof req.query.stage === 'string' ? req.query.stage.slice(0, 40) : '';
  if (stageId) {
    stageIds = [...stageIds.filter((x) => x !== stageId), stageId];
    announceSpeaker();
  } else {
    res.write(`event: speaker\ndata: ${JSON.stringify({ id: stageIds[stageIds.length - 1] ?? null, count: stageIds.length })}\n\n`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== res);
    if (stageId) {
      stageIds = stageIds.filter((x) => x !== stageId);
      announceSpeaker();
    }
  });
});

app.get('/api/tiktok/status', (_req, res) => {
  liveStats.port = actualPort;
  res.json({ success: true, data: liveStats });
});

// ---------- Đọc dữ liệu TikTok (proto v3) ----------
const userOf = (data: any) => data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'nguoi-xem';
const nickOf = (data: any) => data?.user?.nickname || data?.nickname || data?.uniqueId || 'Bạn';
const avatarOf = (data: any) => data?.user?.avatarThumb?.urlList?.[0] || '';

// ---------- Tự kết nối lại ----------
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTries = 0;
function scheduleReconnect(why: string) {
  if (!wantUser || reconnectTimer) return;
  const delay = Math.min(120_000, 15_000 * 2 ** reconnectTries);
  reconnectTries++;
  console.log(`[TikTok] ${why}. Tự kết nối lại @${wantUser} sau ${delay / 1000} giây`);
  liveStats = { ...liveStats, isConnected: false, isConnecting: false, port: actualPort, error: `${why}. Tự kết nối lại sau ${delay / 1000} giây` };
  broadcast('status', liveStats);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectTikTok(wantUser).catch((err) => scheduleReconnect(`Chưa kết nối lại được (${err instanceof Error ? err.message : err})`));
  }, delay);
}
const stopReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  reconnectTries = 0;
};

app.post('/api/tiktok/connect', async (req, res) => {
  const cleanUser = String(req.body?.username || '').replace(/^@/, '').trim();
  if (!cleanUser) return res.status(400).json({ success: false, error: 'Chưa nhập username TikTok' });
  stopReconnect();
  wantUser = cleanUser;
  saveSettings({ tiktokUser: cleanUser });
  try {
    const state = await connectTikTok(cleanUser);
    return res.json({ success: true, roomId: state?.roomId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    scheduleReconnect(`Không kết nối được: ${msg}`);
    return res.status(400).json({
      success: false,
      error: `Không kết nối được @${cleanUser}: ${msg}. Tài khoản phải đang LIVE trên TikTok. Server sẽ tự thử lại.`,
    });
  }
});

async function connectTikTok(cleanUser: string) {
  if (activeConn) {
    try {
      activeConn.disconnect();
    } catch {
      // bỏ qua
    }
    activeConn = null;
  }

  liveStats = { ...emptyStats(), isConnecting: true, username: cleanUser };
  broadcast('status', liveStats);

  const conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    enableExtendedGiftInfo: false,
  });

  conn.on(ControlEvent.CONNECTED, (state: { roomId?: string }) => {
    console.log(`[TikTok] Đã kết nối @${cleanUser}, room ${state?.roomId}`);
    liveStats = { ...liveStats, isConnected: true, isConnecting: false, roomId: state?.roomId || '', port: actualPort, error: '' };
    broadcast('status', liveStats);
    reconnectTries = 0;
  });

  conn.on(ControlEvent.DISCONNECTED, () => {
    console.log(`[TikTok] Mất kết nối @${cleanUser}`);
    if (activeConn !== conn) return;
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, port: actualPort };
    broadcast('status', liveStats);
    scheduleReconnect('Mất kết nối TikTok');
  });

  conn.on(WebcastEvent.STREAM_END, () => {
    if (activeConn !== conn) return;
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, port: actualPort, error: 'Phiên live đã kết thúc' };
    broadcast('status', liveStats);
    scheduleReconnect('Phiên live đã kết thúc');
  });

  conn.on(WebcastEvent.CHAT, (data: any) => {
    const rawCreate = Number(data?.common?.createTime) || 0;
    const createTime = rawCreate > 0 && rawCreate < 1e11 ? rawCreate * 1000 : (rawCreate || Date.now());
    broadcast('chat', {
      username: userOf(data),
      nickname: nickOf(data),
      comment: data?.content || data?.comment || '',
      avatar: avatarOf(data),
      timestamp: Date.now(),
      createTime,
    });
  });

  const streakCounts = new Map<string, number>();
  conn.on(WebcastEvent.GIFT, (data: any) => {
    const username = userOf(data);
    const giftId = data?.giftId || 0;
    const key = `${username}_${giftId}`;
    const total = data?.repeatCount || 1;
    const delta = total - (streakCounts.get(key) || 0);
    const isStreakable = (data?.gift?.type ?? data?.giftDetails?.giftType ?? data?.giftType) === 1;
    if (isStreakable && !data?.repeatEnd) streakCounts.set(key, total);
    else streakCounts.delete(key);
    if (delta <= 0) return;

    broadcast('gift', {
      username,
      nickname: nickOf(data),
      giftName: data?.gift?.name || data?.giftDetails?.giftName || data?.giftName || 'Quà',
      giftId,
      diamondCount: data?.gift?.diamondCount || data?.diamondCount || data?.giftDetails?.diamondCount || 1,
      repeatCount: delta,
      avatar: avatarOf(data),
      timestamp: Date.now(),
    });
  });

  conn.on(WebcastEvent.MEMBER, (data: any) => {
    broadcast('member', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.FOLLOW, (data: any) => {
    broadcast('follow', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.SHARE, (data: any) => {
    broadcast('share', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.ROOM_USER, (data: any) => {
    if (typeof data?.viewerCount === 'number') {
      liveStats.viewerCount = data.viewerCount;
      broadcast('roomUser', { viewerCount: data.viewerCount });
    }
  });

  conn.on(WebcastEvent.LIKE, (data: any) => {
    if (typeof data?.totalLikeCount === 'number') liveStats.totalLikes = data.totalLikeCount;
    broadcast('like', {
      username: userOf(data),
      nickname: nickOf(data),
      likeCount: data?.likeCount || 1,
      totalLikes: liveStats.totalLikes,
    });
  });

  conn.on(ControlEvent.ERROR, (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[TikTok] Lỗi @${cleanUser}:`, msg);
    liveStats.error = msg;
    broadcast('status', liveStats);
  });

  activeConn = conn;

  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const live = await conn.fetchIsLive().catch(() => true);
    if (!live) throw new Error('TikTok báo tài khoản này CHƯA LIVE. Bấm Phát trực tiếp trong LIVE Studio trước rồi mới kết nối');
    return await Promise.race([
      conn.connect(),
      new Promise<never>((_, reject) => {
        connectTimer = setTimeout(() => reject(new Error('quá 30 giây không vào được phòng live')), 30_000);
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, port: actualPort, error: msg };
    broadcast('status', liveStats);
    if (activeConn === conn) {
      try {
        conn.disconnect();
      } catch {
        // bỏ qua
      }
      activeConn = null;
    }
    throw err;
  } finally {
    clearTimeout(connectTimer);
  }
}

app.post('/api/tiktok/disconnect', (_req, res) => {
  stopReconnect();
  wantUser = '';
  saveSettings({ tiktokUser: '' });
  try {
    activeConn?.disconnect();
  } catch {
    // bỏ qua
  }
  activeConn = null;
  liveStats = emptyStats();
  broadcast('status', liveStats);
  res.json({ success: true });
});

app.post('/api/shutdown', (_req, res) => {
  stopReconnect();
  wantUser = '';
  try {
    activeConn?.disconnect();
  } catch {
    // bỏ qua
  }
  res.json({ success: true });
  setTimeout(() => {
    cleanupWorker();
    process.exit(0);
  }, 400);
});

// ---------- Lệnh điều khiển ----------
const CONTROL_ACTIONS = ['speak', 'setRate', 'reset', 'setName', 'setVoice', 'custom'];
app.post('/api/control', (req, res) => {
  const { action, text } = req.body || {};
  if (!CONTROL_ACTIONS.includes(action)) return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
  if (action === 'speak' && (typeof text !== 'string' || !text.trim())) {
    return res.status(400).json({ success: false, error: 'Chưa nhập nội dung cần đọc' });
  }
  const payload = { action, text: typeof text === 'string' ? text.trim().slice(0, 1000) : undefined };
  if (action === 'setRate' && payload.text) lastRateControl = { action, text: payload.text };
  if (action === 'setName') {
    const name = (payload.text || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ success: false, error: 'Chưa nhập tên kênh' });
    payload.text = name;
    lastNameControl = { action, text: name };
    saveSettings({ channelName: name });
  }
  broadcast('control', payload);
  res.json({ success: true, pages: sseClients.length });
});

// ---------- Giả lập sự kiện ----------
const TEST_EVENTS = ['chat', 'gift', 'member', 'follow', 'share', 'like'];
app.post('/api/test/emit', (req, res) => {
  const { type, data } = req.body || {};
  if (!TEST_EVENTS.includes(type)) return res.status(400).json({ success: false, error: 'Loại sự kiện không hợp lệ' });
  const event = { timestamp: Date.now(), avatar: '', ...(data || {}) };
  if (type === 'like') {
    liveStats.totalLikes += Number(event.likeCount) || 1;
    event.totalLikes = liveStats.totalLikes;
  }
  broadcast(type, event);
  res.json({ success: true });
});

// ---------- Cài đặt Game & Âm thanh ----------
app.get('/api/cai-dat', (_req, res) => res.json(caiDat()));
app.post('/api/cai-dat', (req, res) => {
  const b = req.body || {};
  const sach = (x: unknown, max = 24) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);
  const patch: Partial<SettingsFile> = {};
  const tieuDe = sach(b.tieuDe, 24);
  const tieuDePhu = sach(b.tieuDePhu, 18);
  if (tieuDe !== undefined) patch.tieuDe = tieuDe;
  if (tieuDePhu !== undefined) patch.tieuDePhu = tieuDePhu;
  if (b.duaSec !== undefined) patch.duaSec = clampNum(b.duaSec, 60, 360, 150);
  if (b.anQua !== undefined) patch.anQua = Boolean(b.anQua);
  if (b.choDoiGhe !== undefined) patch.choDoiGhe = Boolean(b.choDoiGhe);
  if (b.musicVol !== undefined) patch.musicVol = clampNum(b.musicVol, 0, 100, 22);
  if (b.sfxVol !== undefined) patch.sfxVol = clampNum(b.sfxVol, 0, 100, 35);
  if (b.mcVol !== undefined) patch.mcVol = clampNum(b.mcVol, 0, 100, 100);
  saveSettings(patch);
  const next = caiDat();
  broadcast('caiDat', next);
  res.json({ success: true, ...next });
});

app.post('/api/game/state', (req, res) => {
  broadcast('gamestate', req.body || {});
  res.json({ success: true });
});

// ---------- Bảng Vàng Tỉnh Hôm Nay + Tuần Này ----------
const BANG_FILE = path.join(__dirname, 'data', 'bang-vang.json');
type BangVang = {
  ngay: string;
  thang: Record<string, number>;
  tuan: string;
  thangTuan: Record<string, number>;
};

const fmtYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const homNay = (d = new Date()) => fmtYmd(d);
const dauTuan = (d = new Date()) => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay() || 7; // Thứ Hai = 1 ... Chủ Nhật = 7
  c.setDate(c.getDate() - (day - 1));
  return fmtYmd(c);
};

function docBang(): BangVang {
  const nay = homNay();
  const tn = dauTuan();
  try {
    const raw = JSON.parse(fs.readFileSync(BANG_FILE, 'utf8')) as Partial<BangVang>;
    return {
      ngay: nay,
      thang: raw.ngay === nay && raw.thang ? raw.thang : {},
      tuan: tn,
      thangTuan: raw.tuan === tn && raw.thangTuan ? raw.thangTuan : {},
    };
  } catch {
    return { ngay: nay, thang: {}, tuan: tn, thangTuan: {} };
  }
}

app.get('/api/bang-vang', (_req, res) => res.json(docBang()));
app.post('/api/bang-vang', (req, res) => {
  const tinh = typeof req.body?.tinh === 'string' ? req.body.tinh.slice(0, 40) : '';
  if (!tinh) return res.status(400).json({ success: false });
  const b = docBang();
  b.thang[tinh] = (b.thang[tinh] ?? 0) + 1;
  b.thangTuan[tinh] = (b.thangTuan[tinh] ?? 0) + 1;
  try {
    fs.mkdirSync(path.dirname(BANG_FILE), { recursive: true });
    fs.writeFileSync(BANG_FILE, JSON.stringify(b, null, 2));
  } catch (err) {
    console.error('Không lưu được data/bang-vang.json:', err);
  }
  res.json(b);
});

// ---------- Hồ sơ Cấp bậc Tay Chèo Trọn Đời (data/tay-cheo.json) ----------
const TAY_CHEO_FILE = path.join(__dirname, 'data', 'tay-cheo.json');
export interface HoSoTayCheo {
  name: string;
  tinh: string;
  tongNhip: number;
  sacPhong: number;
  updatedAt: number;
}
let tayCheoMap: Record<string, HoSoTayCheo> = {};
try {
  tayCheoMap = JSON.parse(fs.readFileSync(TAY_CHEO_FILE, 'utf8')) || {};
} catch {
  tayCheoMap = {};
}

function luuTayCheo() {
  try {
    const entries = Object.entries(tayCheoMap);
    if (entries.length > 2500) {
      entries.sort((a, b) => b[1].tongNhip - a[1].tongNhip || b[1].updatedAt - a[1].updatedAt);
      tayCheoMap = Object.fromEntries(entries.slice(0, 2000));
    }
    fs.mkdirSync(path.dirname(TAY_CHEO_FILE), { recursive: true });
    fs.writeFileSync(TAY_CHEO_FILE, JSON.stringify(tayCheoMap));
  } catch (err) {
    console.error('Không lưu được data/tay-cheo.json:', err);
  }
}

app.get('/api/tay-cheo', (_req, res) => res.json(tayCheoMap));
app.post('/api/tay-cheo', (req, res) => {
  const list = Array.isArray(req.body?.list) ? req.body.list : [];
  const mvpId = typeof req.body?.mvpId === 'string' ? req.body.mvpId : '';
  const now = Date.now();
  for (const item of list) {
    const id = typeof item?.id === 'string' ? item.id.slice(0, 60) : '';
    const nhip = Math.max(0, Math.round(Number(item?.nhip) || 0));
    if (!id || nhip <= 0) continue;
    const prev = tayCheoMap[id] ?? { name: '', tinh: '', tongNhip: 0, sacPhong: 0, updatedAt: now };
    tayCheoMap[id] = {
      name: typeof item.name === 'string' && item.name ? item.name.slice(0, 40) : prev.name,
      tinh: typeof item.tinh === 'string' && item.tinh ? item.tinh.slice(0, 40) : prev.tinh,
      tongNhip: prev.tongNhip + nhip,
      sacPhong: prev.sacPhong + (id === mvpId ? 1 : 0),
      updatedAt: now,
    };
  }
  luuTayCheo();
  res.json({ success: true });
});

// ---------- Giọng đọc: VieNeu-TTS (stdio worker) + Edge TTS + Google TTS ----------
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function splitText(text: string, max = 190): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '));
    if (cut < max / 2) cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '));
    if (cut < max / 2) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Xếp hàng gọi Edge tuần tự cách nhau >= 350ms + chống UnhandledPromiseRejection khi timeout
let edgeHang: Promise<unknown> = Promise.resolve();
let edgeLanCuoi = 0;
function edgeTts(text: string, rate: number, voiceName: string): Promise<Buffer> {
  const viec = edgeHang.then(async () => {
    const cho = edgeLanCuoi + 350 - Date.now();
    if (cho > 0) await new Promise((r) => setTimeout(r, cho));
    try {
      return await edgeTtsMot(text, rate, voiceName);
    } finally {
      edgeLanCuoi = Date.now();
    }
  });
  edgeHang = viec.catch(() => {});
  return viec;
}

async function edgeTtsMot(text: string, rate: number, voiceName: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const pct = Math.round((rate - 1) * 100);
    const { audioStream } = tts.toStream(escapeXml(text), {
      rate: `${pct >= 0 ? '+' : ''}${pct}%`,
      pitch: TTS_PITCH,
    });
    const chunks: Buffer[] = [];
    const read = (async () => {
      for await (const c of audioStream) chunks.push(c as Buffer);
    })();
    read.catch(() => {}); // Chống crash UnhandledPromiseRejection khi timeout đóng stream ở finally
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Edge TTS timeout')), 20_000);
    });
    await Promise.race([read, timeout]);
    if (chunks.length === 0) throw new Error('Edge TTS không trả âm thanh');
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    tts.close();
  }
}

async function googleTts(text: string): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const chunk of splitText(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });
    if (!r.ok) throw new Error(`Google TTS lỗi ${r.status}`);
    parts.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

// ---------- VieNeu-TTS v3 Turbo Embedded Worker ----------
interface VieneuVoiceInfo {
  id: string;
  name: string;
  description: string;
  gender: string;
}
interface VieneuJob {
  id: number;
  text: string;
  voice: string;
  res: express.Response;
  parts: Buffer[];
  timer: ReturnType<typeof setTimeout>;
  resolve: (ok: boolean) => void;
}

let activeVieneuVoice =
  settings.vieneuVoice !== undefined ? settings.vieneuVoice : (process.env.VIENEU_VOICE ?? 'Adam bựa');
let vieneuState: 'loading' | 'ready' | 'unavailable' = 'loading';
let vieneuVoices: VieneuVoiceInfo[] = [];
const vieneuCache = new Map<string, Buffer>();
let vieneuProc: ChildProcessByStdio<Writable, Readable, null> | null = null;
let nextJobId = 1;
let currentJob: VieneuJob | null = null;
const priorityJobs: VieneuJob[] = [];
const prefetchJobs: VieneuJob[] = [];

const getVieneuStatus = () => ({
  state: vieneuState,
  voice: activeVieneuVoice,
  voices: vieneuVoices,
});

function resolveVieneuDir(): string {
  const candidates = [
    process.env.VIENEU_DIR,
    path.join(__dirname, 'VieNeu-TTS'),
    path.join(__dirname, '..', 'LIVE-TRANGNGUYEN', 'VieNeu-TTS'),
    path.join(__dirname, '..', 'LIVE-CLASS', 'VieNeu-TTS'),
    'E:\\02_AI\\VieNeu-TTS',
  ].filter((x): x is string => !!x);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, '.venv', 'Scripts', 'python.exe'))) return dir;
  }
  return path.join(__dirname, 'VieNeu-TTS');
}

function pumpVieneuQueue() {
  if (currentJob || vieneuState !== 'ready' || !vieneuProc?.stdin.writable) return;
  while (priorityJobs.length > 0 || prefetchJobs.length > 0) {
    const job = priorityJobs.shift() ?? prefetchJobs.shift()!;
    if (job.res.writableEnded || job.res.destroyed) {
      clearTimeout(job.timer);
      job.resolve(true);
      continue;
    }
    const cacheKey = `${job.voice}|${job.text}`;
    const cached = vieneuCache.get(cacheKey);
    if (cached) {
      clearTimeout(job.timer);
      job.res.setHeader('Content-Type', 'audio/wav');
      job.res.send(cached);
      job.resolve(true);
      continue;
    }
    currentJob = job;
    try {
      vieneuProc.stdin.write(JSON.stringify({ id: job.id, text: job.text, voice: job.voice }) + '\n');
      return;
    } catch {
      clearTimeout(job.timer);
      currentJob = null;
      job.resolve(false);
    }
  }
}

function startVieneuWorker() {
  const vieneuDir = resolveVieneuDir();
  const pyExe = path.join(vieneuDir, '.venv', 'Scripts', 'python.exe');
  const workerScript = path.join(__dirname, 'tools', 'vieneu-worker.py');
  if (!fs.existsSync(pyExe) || !fs.existsSync(workerScript)) {
    console.log('[VieNeu] Chưa cài môi trường Python VieNeu-TTS, tự động dùng giọng Microsoft Edge.');
    vieneuState = 'unavailable';
    broadcast('vieneu', getVieneuStatus());
    return;
  }

  console.log(`[VieNeu] Đang khởi động AI Voice tại: ${vieneuDir}`);
  vieneuState = 'loading';
  broadcast('vieneu', getVieneuStatus());

  const proc = spawn(pyExe, ['-u', workerScript], {
    cwd: vieneuDir,
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
      HF_HUB_OFFLINE: '1',
      VIENEU_PRECISION: process.env.VIENEU_PRECISION || 'int8',
      VIENEU_WATERMARK: '0',
    },
  });
  vieneuProc = proc;

  let rxBuf: Buffer = Buffer.alloc(0);
  proc.stdout.on('data', (chunk: Buffer) => {
    rxBuf = rxBuf.length === 0 ? chunk : Buffer.concat([rxBuf, chunk]);
    while (rxBuf.length >= 9) {
      const frameType = rxBuf.readUInt8(0);
      const reqId = rxBuf.readUInt32BE(1);
      const payloadLen = rxBuf.readUInt32BE(5);
      if (rxBuf.length < 9 + payloadLen) break;
      const payload = rxBuf.subarray(9, 9 + payloadLen);
      rxBuf = rxBuf.subarray(9 + payloadLen);

      if (frameType === 1) {
        try {
          const info = JSON.parse(payload.toString('utf8'));
          vieneuVoices = Array.isArray(info.voices) ? info.voices : [];
        } catch {
          vieneuVoices = [];
        }
        vieneuState = 'ready';
        broadcast('vieneu', getVieneuStatus());
        pumpVieneuQueue();
      } else if (frameType === 2) {
        if (currentJob && currentJob.id === reqId) {
          if (!currentJob.res.headersSent) {
            currentJob.res.setHeader('Content-Type', 'audio/wav');
            currentJob.res.setHeader('Cache-Control', 'no-store');
          }
          currentJob.parts.push(Buffer.from(payload));
          if (!currentJob.res.writableEnded) currentJob.res.write(payload);
        }
      } else if (frameType === 3) {
        if (currentJob && currentJob.id === reqId) {
          const job = currentJob;
          currentJob = null;
          clearTimeout(job.timer);
          if (!job.res.writableEnded) job.res.end();
          if (job.parts.length > 0) {
            const cacheKey = `${job.voice}|${job.text}`;
            vieneuCache.set(cacheKey, Buffer.concat(job.parts));
            if (vieneuCache.size > 150) vieneuCache.delete(vieneuCache.keys().next().value!);
          }
          job.resolve(true);
          pumpVieneuQueue();
        }
      } else if (frameType === 4) {
        const errMsg = payload.toString('utf8');
        console.warn('[VieNeu Worker lỗi]', errMsg);
        if (currentJob && currentJob.id === reqId) {
          const job = currentJob;
          currentJob = null;
          clearTimeout(job.timer);
          if (job.res.headersSent) {
            if (!job.res.writableEnded) job.res.end();
            job.resolve(true);
          } else {
            job.resolve(false);
          }
          pumpVieneuQueue();
        }
      }
    }
  });

  proc.on('exit', (code) => {
    if (vieneuProc !== proc) return;
    vieneuProc = null;
    console.warn(`[VieNeu] Worker đã thoát (code=${code})`);
    if (currentJob) {
      const job = currentJob;
      currentJob = null;
      clearTimeout(job.timer);
      if (job.res.headersSent) {
        if (!job.res.writableEnded) job.res.end();
        job.resolve(true);
      } else {
        job.resolve(false);
      }
    }
    while (priorityJobs.length > 0) {
      const j = priorityJobs.shift()!;
      clearTimeout(j.timer);
      j.resolve(false);
    }
    while (prefetchJobs.length > 0) {
      const j = prefetchJobs.shift()!;
      clearTimeout(j.timer);
      j.resolve(false);
    }
    vieneuState = 'unavailable';
    broadcast('vieneu', getVieneuStatus());
  });
}

const cleanupWorker = () => {
  if (vieneuProc) {
    try {
      vieneuProc.kill();
    } catch {
      // bỏ qua
    }
    vieneuProc = null;
  }
};
process.on('exit', cleanupWorker);
process.on('SIGINT', () => {
  cleanupWorker();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanupWorker();
  process.exit(0);
});

const isEdgeSelection = (v: string) => !v || v === 'edge:M' || v === 'edge:F';

async function vieneuTts(text: string, res: express.Response, isPrefetch: boolean): Promise<boolean> {
  const voice = activeVieneuVoice;
  if (isEdgeSelection(voice)) return false;
  const cacheKey = `${voice}|${text}`;
  const cached = vieneuCache.get(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'audio/wav');
    res.send(cached);
    return true;
  }
  if (vieneuState === 'unavailable') return false;
  if (vieneuState === 'loading' && !isPrefetch) return false;

  return new Promise<boolean>((resolve) => {
    const id = nextJobId++;
    const timeoutMs = isPrefetch ? 45_000 : 12_000;
    const job: VieneuJob = {
      id,
      text,
      voice,
      res,
      parts: [],
      resolve,
      timer: setTimeout(() => {
        const idx1 = priorityJobs.indexOf(job);
        if (idx1 !== -1) priorityJobs.splice(idx1, 1);
        const idx2 = prefetchJobs.indexOf(job);
        if (idx2 !== -1) prefetchJobs.splice(idx2, 1);
        if (currentJob !== job) resolve(false);
      }, timeoutMs),
    };
    if (isPrefetch) prefetchJobs.push(job);
    else priorityJobs.push(job);
    pumpVieneuQueue();
  });
}

app.get('/api/tts/status', (_req, res) => res.json(getVieneuStatus()));
app.post('/api/tts/voice', (req, res) => {
  const v = typeof req.body?.voice === 'string' ? req.body.voice.trim().slice(0, 60) : '';
  activeVieneuVoice = v;
  saveSettings({ vieneuVoice: v });
  broadcast('vieneu', getVieneuStatus());
  broadcast('control', { action: 'setVoice', text: v || 'edge:M' });
  res.json({ success: true, ...getVieneuStatus() });
});

const ttsCache = new Map<string, Buffer>();
let edgeNghiDen = 0;
let edgeDaBao = false;

app.get('/api/tts', async (req, res) => {
  try {
    const raw = String(req.query.text || '').trim().slice(0, 1500);
    if (!raw) return res.status(400).send('Thiếu text');
    const rate = Math.min(1.5, Math.max(0.5, Number(req.query.rate) || 1));
    const isPrefetch = req.query.prefetch === '1';

    if (!isEdgeSelection(activeVieneuVoice) && (await vieneuTts(raw, res, isPrefetch))) return;

    const text = raw.replace(/\[[^\]]*\]\s*/g, '').trim();
    if (!text) return res.status(204).end();

    const edgeVoiceName = activeVieneuVoice === 'edge:F' ? TTS_VOICE_F : TTS_VOICE_M;
    const key = `${edgeVoiceName}|${rate}|${text}`;
    let audio = ttsCache.get(key);
    if (!audio) {
      if (Date.now() < edgeNghiDen) {
        audio = await googleTts(text);
      } else {
        try {
          audio = await edgeTts(text, rate, edgeVoiceName);
          if (edgeDaBao) {
            edgeDaBao = false;
            console.log('[Giọng] Edge TTS đã chạy lại bình thường');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          edgeNghiDen = Date.now() + (msg.includes('429') ? 60_000 : 15_000);
          if (!edgeDaBao) {
            edgeDaBao = true;
            console.warn(`[Giọng] Edge lỗi (${msg}). Tạm dùng giọng Google ${msg.includes('429') ? 60 : 15} giây.`);
          }
          audio = await googleTts(text);
        }
      }
      ttsCache.set(key, audio);
      if (ttsCache.size > 200) ttsCache.delete(ttsCache.keys().next().value!);
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(audio);
  } catch (err) {
    console.error('TTS lỗi:', err);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ---------- Khởi động & Tự lùi cổng nếu bận ----------
function listenOnAvailablePort(startPort: number, maxTries = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const tryListen = () => {
      const srv = http.createServer(app);
      srv.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && port < startPort + maxTries) {
          console.warn(`[Server] Cổng ${port} đang bận, tự động chuyển sang cổng ${port + 1}...`);
          port++;
          tryListen();
        } else {
          reject(err);
        }
      });
      srv.listen(port, '127.0.0.1', () => resolve(port));
    };
    tryListen();
  });
}

async function start() {
  const distDir = path.join(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distIndex)) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server:
        process.env.LIVE_MODE === '1'
          ? { middlewareMode: true, hmr: false, ws: false }
          : { middlewareMode: true, hmr: { port: 24681 } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(distIndex));
  }

  startVieneuWorker();

  actualPort = await listenOnAvailablePort(BASE_PORT);
  liveStats.port = actualPort;
  console.log(`Server chạy ở http://localhost:${actualPort}  |  Link LIVE Studio: http://lvh.me:${actualPort}/?view=stage`);
  if (wantUser) {
    console.log(`[TikTok] Tự kết nối lại @${wantUser} (lần trước đang kết nối)`);
    connectTikTok(wantUser).catch((err) => scheduleReconnect(`Chưa kết nối được (${err instanceof Error ? err.message : err})`));
  }
}

start();
