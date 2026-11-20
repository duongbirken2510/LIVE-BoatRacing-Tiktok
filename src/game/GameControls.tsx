import { useEffect, useRef, useState } from 'react';
import { emitTest, sendControl } from '../live/page';
import type { CaiDat } from '../live/types';
import { GAME } from './config';
import { CHANG } from './chang';
import { TINH } from './tinh';

const HO = ['Minh', 'Lan', 'Tuấn', 'Hoa', 'Long', 'Thảo', 'Nam', 'Vy', 'Khánh', 'An', 'Bình', 'Trang', 'Hùng', 'My', 'Phúc', 'Ngân', 'Duy'];
const HAY = [
  'can-tho', 'an-giang', 'vinh-long', 'ca-mau', 'dong-thap', 'hcm', 'ha-noi',
  'nghe-an', 'thanh-hoa', 'da-nang', 'hai-phong', 'khanh-hoa', 'lam-dong', 'dak-lak', 'hue', 'quang-ninh',
];
const nguoiGia: { username: string; nickname: string }[] = [];

function giaLapLen(n: number) {
  for (let i = 0; i < n; i++) {
    const id = Math.floor(Math.random() * 1_000_000);
    const tinh = Math.random() < 0.78 ? HAY[Math.floor(Math.random() ** 1.4 * HAY.length)] : TINH[Math.floor(Math.random() * TINH.length)].id;
    const t = TINH.find((x) => x.id === tinh)!;
    const cach = [t.ten, t.ten.toLowerCase(), ...(t.cu ?? []), ...(t.dao ?? []), ...(t.ten2 ?? [])];
    const p = { username: `khach${id}`, nickname: `${HO[id % HO.length]}_${id % 1000}` };
    nguoiGia.push(p);
    if (nguoiGia.length > 400) nguoiGia.shift();
    setTimeout(() => emitTest('chat', { ...p, comment: cach[Math.floor(Math.random() * cach.length)] }), Math.random() * 4000);
  }
}

function giaLapTim(giay: number) {
  if (!nguoiGia.length) giaLapLen(16);
  const lan = giay * 4;
  for (let k = 0; k < lan; k++) {
    setTimeout(() => {
      for (let j = 0; j < 3; j++) {
        const p = nguoiGia[Math.floor(Math.random() * nguoiGia.length)];
        if (p) emitTest('like', { ...p, likeCount: 1 + Math.floor(Math.random() * 14) });
      }
    }, k * 250);
  }
}

function giaLapQua(giftName: string, diamondCount: number, repeatCount = 1) {
  if (!nguoiGia.length) giaLapLen(12);
  const p = nguoiGia[Math.floor(Math.random() * nguoiGia.length)];
  setTimeout(() => emitTest('gift', { ...p, giftName, giftId: 1, diamondCount, repeatCount }), 400);
}

export function GameControls({ caiDat }: { caiDat: CaiDat }) {
  const btn = 'rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors';
  const [tieuDe, setTieuDe] = useState('');
  const [tieuDePhu, setTieuDePhu] = useState('');
  const [duaSec, setDuaSec] = useState(150);
  const [anQua, setAnQua] = useState(false);
  const [choDoiGhe, setChoDoiGhe] = useState(true);
  const [musicVol, setMusicVol] = useState(22);
  const [sfxVol, setSfxVol] = useState(35);
  const [mcVol, setMcVol] = useState(100);
  const [daLuu, setDaLuu] = useState('');

  const [stopAt, setStopAt] = useState<number | null>(null);
  const [remainSec, setRemainSec] = useState(0);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/cai-dat')
      .then((r) => r.json())
      .then((c: CaiDat) => {
        setTieuDe(c.tieuDe ?? '');
        setTieuDePhu(c.tieuDePhu ?? '');
        setDuaSec(c.duaSec ?? 150);
        setAnQua(Boolean(c.anQua));
        setChoDoiGhe(c.choDoiGhe ?? true);
        setMusicVol(c.musicVol ?? 22);
        setSfxVol(c.sfxVol ?? 35);
        setMcVol(c.mcVol ?? 100);
      })
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
        void sendControl('custom', 'tatlive');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stopAt]);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  const capNhat = async (patch: Partial<CaiDat>, thongBao?: string) => {
    const r = await fetch('/api/cai-dat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (thongBao) setDaLuu(r.ok ? thongBao : 'Lưu thất bại');
  };

  const toggleAutoLive = () => {
    if (autoRunning) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      setAutoRunning(false);
      return;
    }
    setAutoRunning(true);
    giaLapLen(28);
    autoTimerRef.current = setInterval(() => {
      if (Math.random() < 0.35) giaLapLen(2);
      for (let i = 0; i < 4; i++) {
        const p = nguoiGia[Math.floor(Math.random() * nguoiGia.length)];
        if (p) emitTest('like', { ...p, likeCount: 2 + Math.floor(Math.random() * 12) });
      }
      if (Math.random() < 0.14) {
        const p = nguoiGia[Math.floor(Math.random() * nguoiGia.length)];
        if (p) emitTest('chat', { ...p, comment: 'Cố lên quê mình ơi!!' });
      }
      if (Math.random() < 0.08) {
        giaLapQua('Hoa hồng', 5, 1);
      }
    }, 800);
  };

  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const inp = 'mt-1 w-full rounded-lg bg-black/40 px-3 py-2 text-white outline-none ring-1 ring-white/15 focus:ring-amber-400';

  return (
    <div className="space-y-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-300">3. Điều khiển LIVE-BOAT RACING TIKTOK</h2>
        <span className="text-xs text-emerald-400">{daLuu || `Thời lượng vòng: ${caiDat.duaSec}s`}</span>
      </div>

      {/* Tên thương hiệu & Thời lượng vòng */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-300">
          Tiêu đề lớn (tối đa 24 ký tự)
          <input className={inp} value={tieuDe} maxLength={24} placeholder={GAME.tieuDeMacDinh} onChange={(e) => setTieuDe(e.target.value)} />
        </label>
        <label className="text-xs text-slate-300">
          Tiêu đề phụ (tối đa 18 ký tự)
          <input className={inp} value={tieuDePhu} maxLength={18} placeholder={GAME.tieuDePhu} onChange={(e) => setTieuDePhu(e.target.value)} />
        </label>
        <label className="text-xs text-slate-300">
          Thời lượng 1 vòng đua
          <select
            className={inp}
            value={duaSec}
            onChange={(e) => {
              const s = Number(e.target.value);
              setDuaSec(s);
              void capNhat({ duaSec: s }, `Đã đặt 1 vòng = ${s} giây`);
            }}
          >
            <option value={90}>⚡ 1 phút 30 giây (Siêu tốc)</option>
            <option value={120}>🔥 2 phút 00 giây (Nhanh)</option>
            <option value={150}>🏆 2 phút 30 giây (Chuẩn vàng)</option>
            <option value={180}>🌊 3 phút 00 giây (Vừa)</option>
            <option value={240}>🐉 4 phút 00 giây (Đường trường)</option>
            <option value={300}>👑 5 phút 00 giây (Đại chiến)</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`${btn} bg-emerald-700 text-white hover:bg-emerald-600`}
          onClick={() => capNhat({ tieuDe, tieuDePhu }, '✓ Đã lưu tiêu đề trên màn hình Stage')}
        >
          💾 Lưu tiêu đề
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 text-xs text-slate-200 ring-1 ring-slate-700">
          <input
            type="checkbox"
            checked={anQua}
            onChange={(e) => {
              setAnQua(e.target.checked);
              void capNhat({ anQua: e.target.checked }, e.target.checked ? '🛡️ Đã bật ẩn chữ "Tặng quà" (Hiện "Tiếp sức")' : 'Đã hiện chữ "Tặng quà"');
            }}
          />
          🛡️ Ẩn chữ &ldquo;Tặng quà&rdquo; (An toàn TikTok)
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 text-xs text-slate-200 ring-1 ring-slate-700">
          <input
            type="checkbox"
            checked={choDoiGhe}
            onChange={(e) => {
              setChoDoiGhe(e.target.checked);
              void capNhat({ choDoiGhe: e.target.checked }, e.target.checked ? 'Đã cho phép đổi ghe sau 45s' : 'Đã khóa cố định 1 ghe cả buổi');
            }}
          />
          🔄 Cho đổi quê sau 45s
        </label>
      </div>

      {/* 3 Thanh trượt âm lượng riêng biệt */}
      <div className="grid gap-3 rounded-xl bg-black/30 p-3 ring-1 ring-white/10 sm:grid-cols-3">
        <label className="text-xs text-slate-300">
          <div className="flex justify-between">
            <span>🥁 Nhạc trống nền</span>
            <b className="text-amber-300">{musicVol}%</b>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={musicVol}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMusicVol(v);
              void capNhat({ musicVol: v });
            }}
            className="mt-1 w-full accent-amber-400"
          />
        </label>
        <label className="text-xs text-slate-300">
          <div className="flex justify-between">
            <span>🔔 Hiệu ứng chiêng/pháo</span>
            <b className="text-amber-300">{sfxVol}%</b>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sfxVol}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSfxVol(v);
              void capNhat({ sfxVol: v });
            }}
            className="mt-1 w-full accent-amber-400"
          />
        </label>
        <label className="text-xs text-slate-300">
          <div className="flex justify-between">
            <span>🎙️ Âm lượng MC</span>
            <b className="text-amber-300">{mcVol}%</b>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={mcVol}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMcVol(v);
              void capNhat({ mcVol: v });
            }}
            className="mt-1 w-full accent-amber-400"
          />
        </label>
      </div>

      {/* Điều khiển trực tiếp vòng đua & Tắt Live chào tạm biệt */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`${btn} bg-amber-500 text-slate-950 hover:bg-amber-400`}
          onClick={() => {
            setStopAt(null);
            void sendControl('custom', 'vongmoi');
          }}
        >
          ▶ Bắt đầu vòng mới ngay
        </button>
        <button className={`${btn} bg-pink-700 text-white hover:bg-pink-600`} onClick={() => sendControl('custom', 'nuocrut')}>
          ⏩ Nhảy tới Nước rút (30s cuối)
        </button>
        <button
          className={`${btn} bg-rose-600 text-white ring-1 ring-rose-400/50 hover:bg-rose-500`}
          onClick={() => {
            setStopAt(null);
            if (autoRunning) toggleAutoLive();
            void sendControl('custom', 'tatlive');
          }}
        >
          🛑 Kết thúc ca Live (Thu quân chào tạm biệt)
        </button>
      </div>

      {/* Hẹn giờ tự động tắt Live */}
      <div className="rounded-xl bg-black/30 p-3 ring-1 ring-white/10">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span>⏰ Hẹn giờ tự động Thu Quân &amp; MC đọc lời chào nhắc Follow kênh:</span>
          {stopAt ? (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 font-bold text-rose-300">
              ⏳ Tự thu quân sau {fmtTime(remainSec)}
            </span>
          ) : (
            <span className="text-slate-500">Chưa hẹn giờ</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[15, 30, 60, 90, 120].map((phut) => (
            <button
              key={phut}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              onClick={() => setStopAt(Date.now() + phut * 60_000)}
            >
              +{phut} phút
            </button>
          ))}
          {stopAt && (
            <button
              className="rounded-lg bg-rose-900/60 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-800"
              onClick={() => setStopAt(null)}
            >
              ✖ Hủy hẹn giờ
            </button>
          )}
        </div>
      </div>

      {/* Bật sự kiện cao trào & Đổi nhanh 22 khúc sông */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs text-slate-400">Kích hoạt ngay sự kiện giữa sông (khi đang đua):</div>
          <div className="flex flex-wrap gap-1.5">
            <button className="rounded-lg bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30" onClick={() => sendControl('custom', 'sukien:caChep')}>
              🐟 Cá Chép Vàng
            </button>
            <button className="rounded-lg bg-orange-500/20 px-2.5 py-1.5 text-xs font-semibold text-orange-200 hover:bg-orange-500/30" onClick={() => sendControl('custom', 'sukien:sucRong')}>
              🐉 Sức Rồng +20%
            </button>
            <button className="rounded-lg bg-teal-500/20 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-500/30" onClick={() => sendControl('custom', 'sukien:songHep')}>
              🪨 Khúc Sông Hẹp
            </button>
            <button className="rounded-lg bg-pink-500/20 px-2.5 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-500/30" onClick={() => sendControl('custom', 'sukien:senNo')}>
              🪷 Mùa Sen Nở ×2
            </button>
          </div>
        </div>
        <label className="text-xs text-slate-400">
          Chuyển ngay sang 1 trong 22 khúc sông 3 miền:
          <select
            className={inp}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                void sendControl('custom', `chang:${e.target.value}`);
                e.target.value = '';
              }
            }}
          >
            <option value="" disabled>
              — Chọn khúc sông để hạ thủy ngay —
            </option>
            {CHANG.map((c) => (
              <option key={c.id} value={c.id}>
                🌊 {c.ten} (Sân nhà {TINH.find((t) => t.id === c.nha)?.ten})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Giả lập đoàn đua đông người & Auto-Live */}
      <div>
        <div className="mb-2 text-xs text-slate-400">Giả lập phòng LIVE đông khách (test không cần bật TikTok):</div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`${btn} ${autoRunning ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
            onClick={toggleAutoLive}
          >
            {autoRunning ? '⏹ Dừng Auto-Live tự động' : '🤖 Bật Auto-Live (Tự động đua liên tục)'}
          </button>
          <button className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => giaLapLen(12)}>
            +12 người gõ tỉnh
          </button>
          <button className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => giaLapLen(60)}>
            +60 đồng hương
          </button>
          <button className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => giaLapTim(20)}>
            ❤️ Thả tim 20 giây
          </button>
          <button className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => giaLapQua('Bó hoa', 30)}>
            💐 Bó hoa (30 xu)
          </button>
          <button className={`${btn} bg-white/10 text-white hover:bg-white/20`} onClick={() => giaLapQua('Sư tử', 29999)}>
            🦁 Sư tử (Quà lớn)
          </button>
        </div>
      </div>
    </div>
  );
}
