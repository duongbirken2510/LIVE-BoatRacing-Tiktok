import { useEffect, useState, type ReactNode } from 'react';
import type { LiveStatus, VieneuStatus } from './types';
import { emitTest, sendControl } from './page';

const FAKE_NAMES = ['Lan Anh', 'Minh Tuấn', 'Bé Na 🌸', 'Hoàng Long', 'Thu Trang', 'Quốc Bảo', 'duyanh99', '𝑵𝒈𝒐̣𝒄 𝑨𝒏𝒉'];
const pick = () => {
  const nickname = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  return { nickname, username: nickname.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'khach' };
};

export function Dashboard({
  status,
  vieneu: vieneuProp,
  stageCount = 0,
  phase,
  channelName,
  preview,
  extra,
}: {
  status: LiveStatus | null;
  vieneu: VieneuStatus | null;
  stageCount?: number;
  phase?: string;
  channelName: string;
  preview: ReactNode;
  extra?: ReactNode;
}) {
  const [user, setUser] = useState(() => localStorageGet('tiktokUser'));
  const [nameText, setNameText] = useState('');
  const [msg, setMsg] = useState('');
  const [speakText, setSpeakText] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stopAt, setStopAt] = useState<number | null>(null);
  const [remainSec, setRemainSec] = useState(0);
  const [shuttingDown, setShuttingDown] = useState(false);
  const [vieneuLocal, setVieneuLocal] = useState<VieneuStatus>({ state: 'loading', voice: 'Adam bựa', voices: [] });

  const vieneu = vieneuProp ?? vieneuLocal;
  const stagePort = status?.port || Number(window.location.port) || 3010;
  const stageUrl = `http://lvh.me:${stagePort}/?view=stage`;
  const dangNghiLive = phase === 'nghiLive';

  useEffect(() => {
    fetch('/api/tts/status')
      .then((r) => r.json())
      .then((d: VieneuStatus) => setVieneuLocal(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!stopAt) {
      setRemainSec(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((stopAt - Date.now()) / 1000));
      setRemainSec(left);
      if (left <= 0) {
        setStopAt(null);
        void tatLiveNgay();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stopAt]);

  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  const changeVoice = async (newVoice: string) => {
    setVieneuLocal((prev) => ({ ...prev, voice: newVoice }));
    try {
      const r = await fetch('/api/tts/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: newVoice }),
      }).then((x) => x.json());
      if (r.state) setVieneuLocal(r);
      const label =
        newVoice === 'edge:F'
          ? 'Microsoft Edge Nữ (Hoài My)'
          : !newVoice || newVoice === 'edge:M'
            ? 'Microsoft Edge Nam (Nam Minh)'
            : `VieNeu AI (${newVoice})`;
      setMsg(`Đã đổi sang giọng đọc: ${label}`);
    } catch (e) {
      setMsg(String(e));
    }
  };

  const connect = async () => {
    setBusy(true);
    setMsg('');
    localStorageSet('tiktokUser', user);
    try {
      const r = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      }).then((x) => x.json());
      setMsg(r.success ? 'Đã kết nối phòng LIVE!' : r.error);
    } catch (e) {
      setMsg(String(e));
    }
    setBusy(false);
  };

  const disconnect = () => fetch('/api/tiktok/disconnect', { method: 'POST' });

  const tatLiveNgay = async () => {
    setStopAt(null);
    await sendControl('custom', 'tatlive');
    void fetch('/api/tiktok/disconnect', { method: 'POST' }).catch(() => {});
    setMsg('🛑 Đã bật màn hình Tắt Live — MC đang đọc lời chào tạm biệt & nhắc Follow kênh!');
  };

  const moLaiLive = async () => {
    setStopAt(null);
    await sendControl('custom', 'vongmoi');
    setMsg('▶ Đã mở lại vòng đua mới trên Stage!');
  };

  const tatHanServer = async () => {
    setShuttingDown(true);
    setMsg('⏻ Đang đóng máy chủ LIVE-BOAT RACING TIKTOK...');
    try {
      await fetch('/api/shutdown', { method: 'POST' });
    } catch {
      // nếu server đang chạy bản trước khi restart thì vẫn tắt live trên stage
      await tatLiveNgay();
      setShuttingDown(false);
    }
  };

  const speak = async () => {
    const r = await sendControl('speak', speakText);
    setMsg(r.pages > 1 ? `Đã gửi câu đọc (${r.pages} trang đang mở)` : 'Đã gửi câu đọc lên Stage');
    setSpeakText('');
  };

  const testVoice = async () => {
    await sendControl(
      'speak',
      `Chào mừng bà con đồng hương ba mươi bốn tỉnh đến với ${channelName}! Thả tim mạnh tay đẩy ghe quê mình lên ngôi đầu nào!`,
    );
    setMsg('Đã phát câu chào thử giọng trên trang Stage!');
  };

  const saveName = async () => {
    const r = await sendControl('setName', nameText);
    setMsg(r.success ? `Đã lưu tên chào kênh: ${nameText.trim()}` : r.error);
    if (r.success) setNameText('');
  };

  const copyStageUrl = () => {
    navigator.clipboard?.writeText(stageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isEdge = !vieneu.voice || vieneu.voice === 'edge:M' || vieneu.voice === 'edge:F';

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      {/* Thanh tiêu đề trên cùng kèm cụm nút Tắt Live nhanh */}
      <div className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/95 px-5 py-3.5 ring-1 ring-amber-400/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐉</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-wide text-amber-300">LIVE-BOAT RACING TIKTOK</h1>
            <p className="text-xs text-slate-400">
              Giọng chào kênh: <b className="text-emerald-300">{channelName}</b> · 34 Tỉnh Thành &amp; 23 Chặng Sông
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dangNghiLive ? (
            <button
              onClick={moLaiLive}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow hover:bg-emerald-400"
            >
              ▶ Mở lại Live (Đua tiếp)
            </button>
          ) : (
            <button
              onClick={tatLiveNgay}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white shadow ring-1 ring-rose-400/60 hover:bg-rose-500"
            >
              🛑 Tắt Live (MC chào tạm biệt)
            </button>
          )}
          <button
            onClick={tatHanServer}
            disabled={shuttingDown}
            className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-950 disabled:opacity-50"
            title="Đóng hoàn toàn máy chủ Node.js & cửa sổ chạy ngầm"
          >
            {shuttingDown ? 'Đang tắt...' : '⏻ Tắt hẳn Server'}
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Card title="1. Kết nối & Quản lý Phiên LIVE">
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-amber-400"
                placeholder="Nhập username TikTok đang LIVE (không cần @)"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && user.trim() && connect()}
              />
              <Btn onClick={connect} disabled={busy || !user.trim()}>
                {busy ? 'Đang nối...' : 'Kết nối'}
              </Btn>
              <Btn onClick={disconnect} tone="ghost">
                Ngắt kết nối
              </Btn>
              {dangNghiLive ? (
                <Btn onClick={moLaiLive}>▶ Đua lại ngay</Btn>
              ) : (
                <Btn tone="danger" onClick={tatLiveNgay}>
                  🛑 Tắt Live
                </Btn>
              )}
            </div>

            <div className="mt-3 text-sm">
              Trạng thái:{' '}
              {dangNghiLive ? (
                <span className="font-semibold text-rose-400">
                  🛑 Đã Tắt Live (Màn hình đang hiện bảng Chào tạm biệt &amp; kêu gọi Follow)
                </span>
              ) : status?.isConnected ? (
                <span className="font-semibold text-emerald-400">
                  🟢 Đang live @{status.username} · {status.viewerCount} mắt xem · {status.totalLikes} tim
                </span>
              ) : status?.isConnecting ? (
                <span className="text-amber-400">⏳ Đang kết nối phòng LIVE...</span>
              ) : (
                <span className="text-slate-400">⚪ Chưa kết nối (dùng bộ Giả lập bên dưới để test trước khi live)</span>
              )}
            </div>

            {(msg || status?.error) && <div className="mt-1.5 text-sm font-medium text-amber-300">{msg || status?.error}</div>}

            {/* Bộ hẹn giờ Tắt Live tự động ngay trên đầu trang */}
            <div className="mt-3 rounded-xl bg-slate-800/70 p-3 ring-1 ring-slate-700/60">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                <span>⏰ Hẹn giờ tự động <b>Tắt Live</b> (tổng kết Bảng Vàng + MC chào tạm biệt):</span>
                {stopAt ? (
                  <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 font-bold text-rose-300">
                    ⏳ Tự tắt Live sau {fmtTime(remainSec)}
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa hẹn giờ</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[15, 30, 60, 90, 120].map((phut) => (
                  <button
                    key={phut}
                    onClick={() => setStopAt(Date.now() + phut * 60_000)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700"
                  >
                    +{phut} phút
                  </button>
                ))}
                {stopAt && (
                  <button
                    onClick={() => setStopAt(null)}
                    className="rounded-lg bg-rose-900/70 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-800"
                  >
                    ✖ Hủy hẹn giờ
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-800/50 p-3 text-xs text-slate-300 ring-1 ring-slate-700/50">
              <div>
                Link gắn vào <b>OBS / TikTok LIVE Studio</b> (khổ dọc <code className="text-amber-300">1080 × 1920</code>):{' '}
                <b className="select-all text-white">{stageUrl}</b>
              </div>
              <button
                onClick={copyStageUrl}
                className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-slate-600"
              >
                {copied ? '✓ Đã chép link' : '📋 Copy Link Stage'}
              </button>
            </div>
          </Card>

          <Card title="2. Giọng đọc AI Bình luận viên trên Stage">
            <div className="mb-3 rounded-xl bg-slate-800/70 p-3 text-sm ring-1 ring-slate-700/60">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-200">Bộ giọng Bình luận viên Đua Ghe:</span>
                {vieneu.state === 'loading' ? (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                    ⏳ Đang nạp model AI VieNeu (~5-10s)...
                  </span>
                ) : vieneu.state === 'ready' && !isEdge ? (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    🟢 VieNeu AI sẵn sàng ({vieneu.voice})
                  </span>
                ) : (
                  <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                    🔵 Microsoft Edge ({vieneu.voice === 'edge:F' ? 'Hoài My - Nữ' : 'Nam Minh - Nam'})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:ring-amber-400"
                  value={vieneu.voice || 'edge:M'}
                  onChange={(e) => changeVoice(e.target.value)}
                >
                  {(vieneu.voices.length > 0
                    ? vieneu.voices
                    : [{ id: 'Adam bựa', name: 'Adam bựa', description: 'Nam · Hài hước, máu lửa', gender: 'male' }]
                  ).map((v) => (
                    <option key={v.id} value={v.id}>
                      🎙️ VieNeu AI: {v.name} {v.description ? `— ${v.description}` : ''}
                    </option>
                  ))}
                  <option value="edge:M">🌐 Microsoft Edge — Nam Minh (Nam, nhẹ máy)</option>
                  <option value="edge:F">🌐 Microsoft Edge — Hoài My (Nữ, truyền cảm)</option>
                </select>
                <Btn tone="ghost" onClick={testVoice}>
                  🔊 Nghe thử lời chào
                </Btn>
              </div>
              {vieneu.state === 'unavailable' && (
                <div className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
                  💡 <b>Máy chưa có 25 giọng AI VieNeu ("Adam bựa")?</b> Hiện đang tự động dùng giọng Microsoft Edge mượt mà. Muốn cài thêm VieNeu Offline, hãy cài Python 3.11/3.12 rồi bấm đúp{' '}
                  <code className="rounded bg-slate-900 px-1.5 py-0.5 text-amber-300">CAI-GIONG-ADAM.bat</code>.
                </div>
              )}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span>
                Tên giọng chào kênh: <b className="text-amber-300">{channelName}</b>
              </span>
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="VD: Đua Ghe Việt Nam (tên MC đọc khi chào khách, follow & tắt live)"
                maxLength={40}
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && nameText.trim() && saveName()}
              />
              <Btn onClick={saveName} disabled={!nameText.trim()}>
                Lưu tên chào
              </Btn>
            </div>

            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="Gõ câu muốn Bình luận viên đọc ngay trên sóng..."
                value={speakText}
                onChange={(e) => setSpeakText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && speakText.trim() && speak()}
              />
              <Btn onClick={speak} disabled={!speakText.trim()}>
                Đọc ngay
              </Btn>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              Tốc độ đọc:
              {['0.9', '1', '1.1', '1.25'].map((r) => (
                <Btn key={r} tone="ghost" onClick={() => sendControl('setRate', r)}>
                  {r}×
                </Btn>
              ))}
              <Btn tone="danger" onClick={() => void sendControl('reset')}>
                🧹 Xóa hết ghe &amp; Reset buổi mới
              </Btn>
            </div>
          </Card>

          {extra}

          <Card title="4. Tác vụ Giả lập lẻ (Test nhanh sự kiện)">
            <div className="flex flex-wrap gap-2">
              <Btn tone="ghost" onClick={() => emitTest('member', pick())}>
                👋 Người vào phòng
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'Cần Thơ ơi' })}>
                🚣 Gõ "Cần Thơ"
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'Hoàng Sa thân yêu' })}>
                🇻🇳 Gõ "Hoàng Sa"
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'Trường Sa cố lên' })}>
                🇻🇳 Gõ "Trường Sa"
              </Btn>
              <Btn
                tone="ghost"
                onClick={() => emitTest('gift', { ...pick(), giftName: 'Hoa hồng', giftId: 5655, diamondCount: 1, repeatCount: 5 })}
              >
                🌹 5 Hoa hồng
              </Btn>
              <Btn
                tone="ghost"
                onClick={() => emitTest('gift', { ...pick(), giftName: 'Sư tử', giftId: 6369, diamondCount: 29999, repeatCount: 1 })}
              >
                🦁 Quà Sư Tử
              </Btn>
              <Btn tone="ghost" onClick={() => testPendingGift()}>
                🎁 Test Quà chưa lên ghe → Gõ quê nhận bù
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('follow', pick())}>
                ➕ Follow
              </Btn>
            </div>
          </Card>

          <Card title="Thông tin dự án & Tác giả (Info)">
            <div className="space-y-2.5 text-sm text-slate-300">
              <p>
                <b className="text-amber-300">LIVE-BOAT RACING TIKTOK (v2.0)</b> — Game đua thuyền rồng 34 tỉnh tương tác thời gian thực chuẩn Safe-Zone cho TikTok LIVE, tích hợp sẵn 25 giọng AI VieNeu-TTS, phát triển và nâng cấp bởi{' '}
                <a
                  href="https://duongbirken.deta.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-amber-400 underline decoration-amber-400/50 hover:text-amber-300"
                >
                  Duong Birken
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://duongbirken.deta.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                >
                  🌐 Website: duongbirken.deta.vn
                </a>
              </div>
            </div>
          </Card>
        </div>

        <div className="justify-self-center">
          <div className="mb-2 text-center text-xs font-medium">
            {stageCount > 0 ? (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">
                🟢 Đã nối {stageCount} màn hình Stage (OBS / LIVE Studio)
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-300">
                ⚠️ Chưa mở link Stage trong OBS (đang chạy xem thử tại chỗ)
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-700">{preview}</div>
        </div>
      </div>
    </div>
  );
}

function testPendingGift() {
  const who = { username: 'khach_vip_99', nickname: 'Đại Gia Miền Tây' };
  emitTest('gift', { ...who, giftName: 'Bó hoa', giftId: 5658, diamondCount: 99, repeatCount: 1 });
  setTimeout(() => {
    emitTest('chat', { ...who, comment: 'Vĩnh Long quê tôi' });
  }, 2500);
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <h2 className="mb-3 font-semibold text-amber-300">{title}</h2>
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
}) {
  const cls = {
    primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    ghost: 'bg-slate-800 hover:bg-slate-700 text-slate-100',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // bỏ qua
  }
}
