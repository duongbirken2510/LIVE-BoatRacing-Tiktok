/**
 * Màn hình sân khấu dọc 1080x1920 — LIVE-BOAT RACING TIKTOK.
 * - Ghe đua thon gọn (~205-260px), làn rộng thoáng kèm vệt rẽ sóng chữ V dài phía sau.
 * - Phân tầng cao - thấp rõ rệt theo Thứ hạng (Top 1 cao nhất -> Top 6 thấp dần) + Khoảng cách mét thực tế,
 *   lướt vượt mượt mà khi đổi thứ hạng kèm huy hiệu Vàng / Bạc / Đồng & bảng "DẪN ĐẦU" trực tiếp.
 */
import { useEffect, useState } from 'react';
import type { GameState } from './useGame';
import type { GheView, View } from './dua';
import { GAME } from './config';
import { mauTinh } from './tinh';
import { saoText } from './chang';
import { GheAnh, VetNuoc } from './ve/Ghe';
import { NenSong } from './ve/Song';

// 6 làn cách đều 136px trong lòng sông, ghe gọn (64-81px) nên không bao giờ đụng mái chèo
const LAN_X = [196, 332, 468, 604, 740, 876];
const Y_DAU = 472; // Mũi ghe Top 1 vươn cao dẫn đầu
const STEP_HANG = 96; // Độ chênh bậc thang tối thiểu giữa mỗi hạng (1 -> 2 -> 3 -> 4 -> 5 -> 6)
const LUI_TOI_DA = 185; // Cộng thêm độ lùi theo số mét bị bỏ xa
const CAO_GHE = [205, 222, 240, 260];
const TI_LE_GHE = 0.31;

const vien = (mau: string, d = 4) =>
  ({
    textShadow: `0 ${d}px 0 #2a0d18, ${d}px 0 0 #2a0d18, -${d}px 0 0 #2a0d18, 0 -${d}px 0 #2a0d18, ${d}px ${d}px 0 #2a0d18, -${d}px ${d}px 0 #2a0d18, ${d}px -${d}px 0 #2a0d18, -${d}px -${d}px 0 #2a0d18, 0 ${d * 2}px 0 #0006`,
    color: mau,
  }) as const;

export function GameStage({ game, lite }: { game: GameState; lite?: boolean }) {
  const v = game.view;
  const [nhay, setNhay] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNhay((x) => x + 1), 1500);
    return () => clearInterval(id);
  }, []);

  if (!v) return <div className="flex h-full items-center justify-center text-4xl text-white/60">Đang mở trường đua…</div>;
  const dau = v.ghe[0];
  const kh = GAME.khauHieu[Math.floor(nhay / 4) % GAME.khauHieu.length](dau?.ten ?? '', v.soDangDua);
  const chinh = v.ghe.filter((g) => g.lan >= 0);
  const duoi = v.ghe.filter((g) => g.lan < 0).slice(0, GAME.soDuoi);
  const top3 = v.ghe.slice(0, 3);
  const nghi = v.phase !== 'dua' && v.phase !== 'chuyen';

  return (
    <div className="relative h-full w-full overflow-hidden font-sans text-white">
      <NenSong changId={v.chang.id} nhanh={v.nuocRut} songHep={v.songHep} lite={lite} />
      {v.senNo && !lite && <SenNo />}
      <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-[#071a1f] via-[#071a1fcc] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[350px] bg-gradient-to-t from-[#071a1fe6] via-[#071a1f80] to-transparent" />

      {/* ---------- Đường đua 6 làn phân tầng Cao -> Thấp rõ rệt ---------- */}
      {v.phase !== 'nghiLive' &&
        chinh.map((g) => <GheChinh key={g.tinh} g={g} dauM={dau?.m ?? 0} nuocRut={v.nuocRut} lite={lite} />)}

      {v.phase !== 'nghiLive' &&
        v.hoChe.map((h) => {
          const g = chinh.find((x) => x.tinh === h.tinh);
          if (!g) return null;
          return (
            <div
              key={h.id}
              className="ho-che absolute z-20 whitespace-nowrap rounded-2xl bg-white px-3.5 py-0.5 text-[22px] font-extrabold text-[#2a0d18] shadow-lg"
              style={{ left: g.lan >= 3 ? LAN_X[g.lan] - 165 : LAN_X[g.lan] + 28, top: yMui(g, dau?.m ?? 0) + 55 }}
            >
              {h.text}
            </div>
          );
        })}

      {v.phase !== 'nghiLive' &&
        v.timNguoi.map((h) => {
          const g = chinh.find((x) => x.tinh === h.tinh);
          if (!g) return null;
          return (
            <div
              key={h.id}
              className="tim-bay absolute z-20 whitespace-nowrap text-[21px] font-bold text-pink-200"
              style={{ left: LAN_X[g.lan] - 48, top: yMui(g, dau?.m ?? 0) + 110, ...vien('#ffd1e8', 2) }}
            >
              ♥ {h.name}
            </div>
          );
        })}

      {v.soDangDua === 0 && v.phase === 'dua' && (
        <div className="absolute inset-x-0 top-[700px] text-center">
          <div className="text-[108px] font-extrabold leading-none" style={vien('#5eead4', 6)}>
            GÕ TÊN TỈNH
          </div>
          <div className="mt-4 text-[36px] font-bold" style={vien('#fff', 3)}>
            để hạ thủy ghe quê bạn · rồi thả tim ♥ để chèo
          </div>
        </div>
      )}

      {/* ---------- Bảng DẪN ĐẦU Top 1 - 2 - 3 trực quan góc trên phải mặt sông ---------- */}
      {v.phase === 'dua' && top3.length > 0 && (
        <div className="pointer-events-none absolute right-7 top-[406px] z-20 w-[335px] rounded-2xl border border-amber-300/35 bg-[#061821d9] px-4 py-2.5 shadow-xl">
          <div className="mb-1 flex items-center justify-between text-[17px] font-extrabold tracking-wider text-amber-300">
            <span>🏆 DẪN ĐẦU ĐƯỜNG ĐUA</span>
            <span className="text-[15px] text-teal-200/80">{v.soDangDua} ghe</span>
          </div>
          <div className="space-y-1">
            {top3.map((t, i) => {
              const gap = Math.round((dau?.m ?? 0) - t.m);
              const badgeCls =
                i === 0
                  ? 'bg-amber-400 text-[#1a0b10]'
                  : i === 1
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-amber-700 text-amber-100';
              return (
                <div key={t.tinh} className="flex items-center justify-between text-[20px] font-bold">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${badgeCls}`}>
                      {i + 1}
                    </span>
                    <span className={`truncate ${i === 0 ? 'text-amber-300' : 'text-white'}`}>{t.ten}</span>
                    {t.tangToc && <span className="rounded bg-amber-400 px-1.5 text-[13px] font-extrabold text-[#1a0b10]">⚡</span>}
                  </div>
                  <span className={`ml-2 shrink-0 font-mono text-[19px] ${i === 0 ? 'text-emerald-300' : 'text-amber-200/90'}`}>
                    {i === 0 ? `${Math.round(t.m)} m` : `-${gap} m`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- Đoàn ghe đang đuổi (Safe-Zone: né khung chat góc dưới trái & nút TikTok mép phải) ---------- */}
      {v.phase === 'dua' && duoi.length > 0 && (
        <div className="absolute left-[508px] top-[1430px] w-[444px] rounded-3xl border-2 border-teal-300/40 bg-[#071d26e8] p-3.5 shadow-2xl">
          <div className="flex items-center justify-between px-1 text-[20px] font-extrabold">
            <span className="text-pink-300">🚣 ĐOÀN ĐANG ĐUỔI</span>
            <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[18px] text-amber-200">
              còn {v.conLenSong}m vào Top 6
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {duoi.map((g) => {
              const mau = mauTinh(g.tinh);
              return (
                <div
                  key={g.tinh}
                  className={`flex items-center justify-between rounded-xl border-2 bg-[#0b2a36f0] px-2.5 py-1.5 ${g.tangToc ? 'ring-2 ring-amber-300' : ''}`}
                  style={{ borderColor: mau.vien }}
                >
                  <div className="min-w-0 truncate text-[20px] font-extrabold">
                    <span className="text-amber-300">{g.hang}.</span> {g.ten}
                  </div>
                  <span className="ml-1 shrink-0 rounded bg-white/10 px-1.5 text-[16px] font-bold text-teal-200">
                    {g.so}👤
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- Đầu màn hình ---------- */}
      <div className="absolute left-10 top-[54px]">
        <div className="flex items-baseline gap-4">
          <span className="text-[82px] font-extrabold leading-none tracking-tight" style={vien('#ffc93c', 5)}>
            {game.caiDat.tieuDe}
          </span>
          <span className="text-[38px] font-extrabold" style={vien('#fff', 3)}>
            {game.caiDat.tieuDePhu}
          </span>
        </div>
        <div className="mt-2.5 max-w-[565px] truncate text-[26px] font-semibold text-pink-300">{kh}</div>
      </div>

      <div
        className={`absolute left-[618px] top-[48px] w-[210px] rounded-2xl border-[3px] bg-[#0b2530e6] py-2 text-center ${
          v.nuocRut ? 'border-pink-400' : nghi ? 'border-slate-400' : 'border-teal-300'
        }`}
      >
        <div className={`text-[19px] font-bold ${v.nuocRut ? 'text-pink-300' : 'text-teal-200'}`}>
          {v.phase === 'nghiLive'
            ? 'TẠM NGHỈ'
            : v.phase === 'chuyen'
              ? 'XUẤT PHÁT'
              : nghi
                ? 'NGHỈ'
                : v.nuocRut
                  ? 'NƯỚC RÚT · CÒN'
                  : `VÒNG ${v.vong} · CÒN`}
        </div>
        <div className={`font-mono text-[64px] font-extrabold leading-none ${v.nuocRut && v.con <= 10 ? 'nhap-nhay-chu text-pink-300' : ''}`}>
          {v.phase === 'nghiLive' ? '--:--' : mmss(v.con)}
        </div>
      </div>

      <div className="absolute left-[844px] top-[48px] w-[212px] rounded-2xl border-[3px] border-amber-400 bg-[#2a1a08e6] py-2 text-center">
        <div className="truncate px-2 text-[17px] font-bold text-amber-300">
          {v.chang.ten.toUpperCase()} {saoText(v.chang.sao)}
        </div>
        <div className="text-[48px] font-extrabold leading-tight">{v.phase === 'dua' && dau ? `+${v.dauCach} M` : '—'}</div>
        <div className="text-[16px] text-amber-100/80">{v.phase === 'dua' ? 'ghe đầu đang dẫn' : 'nghỉ giữa vòng'}</div>
      </div>

      {/* ---------- 3 Bước chơi ---------- */}
      <div className="absolute left-8 right-8 top-[220px] flex gap-3">
        {[
          ['1', 'GÕ TÊN TỈNH', 'lên ghe quê', '#2dd4bf'],
          ['2', 'THẢ TIM', 'chèo · +1m', '#fbbf24'],
          game.caiDat.anQua ? ['3', 'TIẾP SỨC', 'ghe bứt tốc', '#f472b6'] : ['3', 'TẶNG QUÀ', 'ghe tăng tốc', '#f472b6'],
        ].map(([so, ten, phu, mau], i) => {
          const sang = nhay % 3 === i;
          return (
            <div
              key={so}
              className="flex flex-1 items-center gap-2 rounded-full border-[3px] px-3 py-1.5 transition-colors duration-500"
              style={{ borderColor: mau, background: sang ? mau : '#0b2530e6', color: sang ? '#1a0b10' : '#fff' }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[22px] font-extrabold"
                style={{ background: sang ? '#1a0b10' : mau, color: sang ? mau : '#1a0b10' }}
              >
                {so}
              </span>
              <span className="whitespace-nowrap text-[23px] font-extrabold">{ten}</span>
              <span className="truncate text-[17px] opacity-85">{phu}</span>
            </div>
          );
        })}
      </div>

      {/* ---------- Dòng hiệu ứng + Đại chiến + Ticker ---------- */}
      <div className="absolute inset-x-0 top-[290px] flex flex-col items-center gap-1.5">
        {v.pills.map((p) => (
          <div key={p} className="rounded-full border-2 border-amber-400 bg-[#3a2508ee] px-6 py-1 text-[23px] font-bold text-amber-200">
            {p}
          </div>
        ))}
        {v.daiChien && (
          <div className="w-[720px] rounded-full border-2 border-pink-400 bg-[#2a0d18ee] px-6 py-1 text-center text-[21px] font-extrabold text-pink-200">
            ⚔️ ĐẠI CHIẾN {v.daiChien.a.toUpperCase()} – {v.daiChien.b.toUpperCase()}
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-pink-400" style={{ width: `${(v.daiChien.ma / (v.daiChien.ma + v.daiChien.mb)) * 100}%` }} />
            </div>
          </div>
        )}
        {v.ticker && !v.dauBox && (
          <div key={v.ticker.id} className="tha-xuong max-w-[1000px] truncate rounded-full border-2 border-white/30 bg-[#0b2530ee] px-6 py-1 text-[22px] font-semibold">
            {v.ticker.text}
          </div>
        )}
      </div>

      {/* ---------- Bến chờ (thu gọn bên trái để nhường góc phải cho bảng DẪN ĐẦU) ---------- */}
      {v.benCho.length > 0 && !v.dauBox && v.phase !== 'nghiLive' && (
        <div className="absolute left-8 top-[408px] flex max-w-[665px] items-center gap-2 overflow-hidden">
          <span className="shrink-0 rounded-full bg-amber-300 px-3.5 py-1 text-[20px] font-extrabold text-[#2a0d18]">BẾN CHỜ</span>
          {v.benCho.slice(0, 4).map((n) => (
            <span key={n} className="shrink-0 rounded-full border-2 border-teal-300/60 bg-[#0b2530e6] px-3.5 py-1 text-[20px] font-semibold">
              <img src="/assets/icon/ghe.png" alt="" className="mr-1 inline-block h-[13px] w-[42px] align-middle" />
              {n}
            </span>
          ))}
        </div>
      )}

      {v.dauBox && (
        <div className="absolute left-8 top-[398px] rounded-2xl border-[3px] border-pink-400 bg-[#0b2530ee] px-6 py-2 text-center">
          <div className="text-[36px] font-extrabold leading-tight text-pink-200">
            🔥 {v.dauBox.tinh.toUpperCase()} DẪN {v.dauBox.cach} M
          </div>
          <div className="text-[20px] text-amber-200">{v.dauBox.duoi} đang đuổi sát</div>
        </div>
      )}

      {/* ---------- Thông báo lên ghe gọn gàng phía dưới sông (KHÔNG đè lên mũi ghe Top 1-2-3!) ---------- */}
      {v.toast && (
        <div
          key={v.toast.id}
          className="toast-vao pointer-events-none absolute left-1/2 top-[1325px] z-30 max-w-[820px] -translate-x-1/2 rounded-full border-[3px] bg-[#091e28f5] px-7 py-2.5 text-center shadow-2xl"
          style={{ borderColor: mauTinh(v.toast.tinh).vien }}
        >
          <div className="truncate text-[29px] font-extrabold text-amber-200">{v.toast.text} ✓</div>
          <div className="text-[19px] text-white/85">{v.toast.phu || 'THẢ TIM ♥ liên tục để đẩy ghe vượt hạng!'}</div>
        </div>
      )}

      {/* ---------- Banner sự kiện lớn ---------- */}
      {v.banner && (
        <div key={v.banner.id} className="banner-vao pointer-events-none absolute inset-x-0 top-[700px] z-30 text-center">
          {/(CÁ CHÉP|VŨ MÔN)/.test(v.banner.tieuDe) && (
            <div className="relative mx-auto mb-2 h-[240px] w-[240px]">
              {/VŨ MÔN/.test(v.banner.tieuDe) && <img src="/assets/hieu-ung/tia-nuoc.webp" alt="" className="tia-nuoc-no absolute inset-0 m-auto w-[280px]" />}
              <img
                src="/assets/hieu-ung/ca-chep.webp"
                alt=""
                className={`absolute inset-x-0 top-0 mx-auto h-[240px] ${/VŨ MÔN/.test(v.banner.tieuDe) ? 'ca-chep-nhay' : 'ca-chep-lac'}`}
              />
            </div>
          )}
          <div className="px-6 text-[104px] font-extrabold leading-none" style={vien(MAU_BANNER[v.banner.mau], 7)}>
            {v.banner.tieuDe}
          </div>
          <div className="mx-auto mt-4 max-w-[980px] text-[34px] font-bold" style={vien('#fff', 3)}>
            {v.banner.phu}
          </div>
        </div>
      )}

      {v.quaLon && <QuaLon q={v.quaLon} />}
      {v.phase === 'chuyen' && <ManChuyen v={v} />}
      {v.ketQua && <KetQua v={v} />}
      {v.sacPhong && <SacPhong v={v} />}
      {v.chonSong && <ChonSong v={v} />}
      {v.nghiLive && <ManNghiLive v={v} channelName={game.channelName} />}

      {/* ---------- Chân trang ---------- */}
      <div className="absolute inset-x-8 bottom-5 flex justify-between text-[20px] font-semibold">
        <span className="rounded-full bg-black/55 px-4 py-1">
          <span className="text-red-500">●</span> TRỰC TIẾP · {gioNay()}
        </span>
        <span className="rounded-full bg-black/55 px-4 py-1 text-white/80">LIVE-BOAT RACING TIKTOK · Giọng bình luận AI</span>
      </div>
    </div>
  );
}

const MAU_BANNER = { vang: '#ffd54a', hong: '#ff6fb5', xanh: '#7ef0d8', trang: '#f4f4f4', do: '#ff5a4f' } as const;

/**
 * Tọa độ Y của mũi ghe:
 * - Bậc thang theo thứ hạng (`(hang - 1) * 96px`) đảm bảo nhìn thoáng qua biết ngay Top 1, 2, 3, 4, 5, 6 cao thấp rõ ràng.
 * - Cộng thêm độ lùi theo số mét thực tế (`dauM - g.m`) và độ chồm theo nhịp thả tim tức thời (`chom`).
 * - Khi vượt hạng, CSS transition đưa ghe lướt vọt lên vị trí cao hơn cực mượt!
 */
function yMui(g: GheView, dauM: number) {
  const gap = Math.max(0, dauM - g.m);
  const bacHang = (g.hang - 1) * STEP_HANG;
  const luiMet = LUI_TOI_DA * (1 - Math.exp(-gap / 65));
  const chom = Math.max(-16, Math.min(16, (g.toc - g.tocTB) * 4));
  return Math.min(1075, Math.max(454, Math.round(Y_DAU + bacHang + luiMet - chom)));
}

function nhipCua(g: GheView, nuocRut: boolean) {
  const n = 1.15 - g.toc * 0.06 - (nuocRut ? 0.15 : 0);
  return Math.round(Math.max(g.tangToc ? 0.38 : 0.42, Math.min(g.tangToc ? 0.5 : 1.15, n)) * 10) / 10;
}

function GheChinh({ g, dauM, nuocRut, lite }: { g: GheView; dauM: number; nuocRut: boolean; lite?: boolean }) {
  const h = CAO_GHE[g.cap] ?? 220;
  const w = h * TI_LE_GHE;
  const x = LAN_X[g.lan];
  const y = yMui(g, dauM);
  const mau = mauTinh(g.tinh);
  const nhip = nhipCua(g, nuocRut);
  const manh = Math.min(1, 0.25 + g.toc / 10 + (g.tangToc ? 0.45 : 0) + (g.hang === 1 ? 0.15 : 0));

  const topPillStyle =
    g.hang === 1
      ? 'bg-amber-400 text-[#1a0b10] ring-2 ring-yellow-200 shadow-[0_0_16px_rgba(251,191,36,0.75)]'
      : g.hang === 2
        ? 'bg-slate-200 text-slate-950 ring-2 ring-white/80'
        : g.hang === 3
          ? 'bg-amber-700 text-amber-50 ring-2 ring-amber-400/80'
          : 'bg-[#0b2530eb] text-teal-100 ring-1 ring-white/25';

  const medal = g.hang === 1 ? '👑 1' : g.hang === 2 ? '🥈 2' : g.hang === 3 ? '🥉 3' : `#${g.hang}`;
  const metText = g.hang === 1 || Math.round(dauM - g.m) === 0 ? `${Math.round(g.m)}m` : `-${Math.round(dauM - g.m)}m`;

  return (
    <div
      className="absolute"
      style={{
        left: x - w / 2,
        top: y,
        width: w,
        zIndex: 18 - g.hang, // Ghe hạng cao hơn nằm lớp trên
        transition: 'top 0.55s cubic-bezier(0.22, 1, 0.36, 1), left 0.45s ease-out',
      }}
    >
      {/* Huy hiệu Hạng Top 1-2-3 + Khoảng cách mét ngay trên mũi ghe */}
      <div
        className={`absolute -top-[36px] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[18px] font-extrabold ${topPillStyle}`}
      >
        {medal} · {metText}
      </div>

      {g.sucRong && !lite && <div className="suc-rong absolute -inset-x-5 -inset-y-3 rounded-full" />}

      {/* Vệt nước chữ V trắng dài sau đuôi ghe */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: h - 14 }}>
        <VetNuoc w={w} manh={manh} />
      </div>

      {g.tangToc && !lite && (
        <>
          <img
            src="/assets/hieu-ung/tia-nuoc.webp"
            alt=""
            className="tia-nuoc-dong absolute left-1/2"
            style={{ width: w * 1.9, top: h - w * 0.9, marginLeft: -w * 0.95 }}
          />
          <img
            src="/assets/hieu-ung/tia-nuoc.webp"
            alt=""
            className="tia-nuoc-dong absolute left-1/2"
            style={{ width: w * 1.35, top: h * 0.04, marginLeft: -w * 0.675, animationDelay: '0.25s' }}
          />
        </>
      )}

      <div className="luon" style={{ animationDuration: `${(nhip * 3.6).toFixed(2)}s`, animationDelay: `${-g.lan * 0.7}s` }}>
        <div className="lao" style={{ animationDuration: `${nhip}s` }}>
          <GheAnh cap={g.cap} w={w} h={h} nhip={nhip} nhanh={g.tangToc || g.toc > g.tocTB + 3} lite={lite} />
        </div>
      </div>

      {g.caChep && (
        <div className="absolute left-1/2 top-[22%] z-20 -translate-x-1/2 text-center">
          <div className="ca-chep-vong mx-auto h-[125px] w-[125px] rounded-full border-[5px] border-dashed border-amber-300 shadow-[0_0_24px_rgba(255,210,80,0.8)]" />
          <img src="/assets/hieu-ung/ca-chep.webp" alt="" className="ca-chep-boi absolute left-1/2 top-[-14px] h-[150px]" />
          <div className="mt-1.5 whitespace-nowrap rounded-full bg-amber-400 px-3 text-[19px] font-extrabold text-[#2a0d18]">
            🐟 {g.caChep.co}/{g.caChep.can} ♥ · {g.caChep.con}s
          </div>
        </div>
      )}

      {/* Bảng tên Tỉnh + Quân số + Nhãn TĂNG TỐC dưới đuôi ghe */}
      <div className="absolute left-1/2 z-20 -translate-x-1/2 text-center" style={{ top: h + 4 }}>
        <div
          className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 bg-[#081f2af0] px-2.5 py-0.5 text-[18px] font-extrabold shadow-md ${
            g.hang === 1 ? 'scale-105 ring-2 ring-amber-300/80' : ''
          }`}
          style={{ borderColor: g.hang === 1 ? '#fbbf24' : mau.vien }}
        >
          <span className={g.hang === 1 ? 'text-amber-300' : 'text-white'}>{g.ten}</span>
          <span className="rounded bg-white/15 px-1.5 text-[14px] text-teal-200">{g.so}</span>
        </div>
        {g.tangToc ? (
          <div className="mx-auto mt-1 w-fit whitespace-nowrap rounded-full bg-amber-400 px-2.5 py-0.5 text-[14px] font-extrabold text-[#1a0b10] shadow">
            ⚡ TĂNG TỐC
          </div>
        ) : (
          g.sanNha && (
            <div className="mx-auto mt-1 w-fit whitespace-nowrap rounded bg-amber-300/95 px-2 text-[13px] font-extrabold text-[#2a0d18]">
              SÂN NHÀ
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SenNo() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 14 }, (_, i) => (
        <img
          key={i}
          src="/assets/hieu-ung/sen.png"
          alt=""
          className="sen-roi absolute"
          style={{ left: 60 + ((i * 151) % 960), width: 70 + (i % 3) * 22, animationDelay: `${(i % 7) * 0.6}s` }}
        />
      ))}
    </div>
  );
}

function QuaLon({ q }: { q: NonNullable<View['quaLon']> }) {
  return (
    <div key={q.id} className="qua-lon pointer-events-none absolute inset-x-0 top-[1060px] z-30 text-center">
      <img src="/assets/hieu-ung/bo-hoa.webp" alt="" className="mx-auto h-[320px]" />
      <div className="mt-2 text-[40px] font-extrabold" style={vien('#ffd54a', 3)}>
        {q.name} tặng {q.gift}
        {q.count > 1 ? ` ×${q.count}` : ''}
      </div>
    </div>
  );
}

function ManChuyen({ v }: { v: View }) {
  return (
    <div className="boc-vao absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#071a1fb8]">
      <div className="text-[34px] font-bold tracking-[0.3em] text-teal-200">VÒNG {v.vong} · CHẶNG ĐUA</div>
      <div className="mt-4 px-10 text-center text-[94px] font-extrabold leading-tight" style={vien('#fff', 6)}>
        {v.chang.ten.toUpperCase()}
      </div>
      <div className="mt-4 text-[54px] text-amber-300">{saoText(v.chang.sao)}</div>
      <div className="mt-4 rounded-full bg-amber-400 px-8 py-2 text-[32px] font-extrabold text-[#2a0d18]">
        Sân nhà {v.chang.nha} · chèo nhanh hơn 10%
      </div>
      <div className="mt-10 text-[64px] font-extrabold" style={vien('#ff6fb5', 4)}>
        {v.con > 0 ? v.con : 'CHÈO!'}
      </div>
    </div>
  );
}

function Khung({ children }: { children: React.ReactNode }) {
  return (
    <div className="boc-vao absolute left-[60px] top-[285px] z-30 w-[960px]" style={{ height: 960 * 1.351 }}>
      <img src="/assets/hieu-ung/bang-go.webp" alt="" className="absolute inset-0 h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
      <div className="absolute flex flex-col items-center justify-center text-center" style={{ left: '12%', right: '12%', top: '12%', bottom: '10%' }}>
        {children}
      </div>
    </div>
  );
}

function KetQua({ v }: { v: View }) {
  const k = v.ketQua!;
  const nhat = k.top[0];
  return (
    <Khung>
      <div className="text-[32px] font-extrabold tracking-wider text-emerald-300">KẾT QUẢ VÒNG {v.vong}</div>
      {nhat ? (
        <>
          <img src="/assets/hieu-ung/vuong-mien.png" alt="" className="vuong-mien mx-auto mt-1 h-[112px]" />
          <div className="text-[100px] font-extrabold leading-none" style={vien('#ffd54a', 6)}>
            {nhat.ten.toUpperCase()}
          </div>
          <div className="mt-2 text-[30px] font-bold text-amber-200">
            {k.lienTiep >= 2 ? `🔥 Vua sông nước · Thắng ${k.lienTiep} vòng liền` : `Về nhất chặng ${v.chang.ten}`}
          </div>
          <div className="mx-auto mt-5 w-[650px] space-y-2 text-left text-[36px] font-bold">
            {k.top.map((t, i) => (
              <div key={t.tinh} className="flex justify-between rounded-xl bg-white/10 px-6 py-1">
                <span>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {t.ten}
                </span>
                <span className="text-amber-200">{t.m} m</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-8 text-[42px] font-bold">Chưa có ghe nào hạ thủy. Gõ tên tỉnh để vào đua!</div>
      )}
      {k.bang.length > 0 && (
        <div className="mt-4 text-[25px] font-semibold text-amber-100">
          🏆 Hôm nay: {k.bang.map((b) => `${b.ten} (${b.n})`).join(' · ')}
        </div>
      )}
      {k.bangTuan.length > 0 && (
        <div className="mt-1.5 text-[23px] text-teal-200/90">
          👑 Bảng Vàng Tuần: {k.bangTuan.map((b) => `${b.ten} (${b.n})`).join(' · ')}
        </div>
      )}
    </Khung>
  );
}

function SacPhong({ v }: { v: View }) {
  const s = v.sacPhong!;
  return (
    <div className="boc-vao absolute left-[20px] top-[410px] z-30 w-[1040px]" style={{ height: 1040 * 0.691 }}>
      <img src="/assets/hieu-ung/sac-phong.webp" alt="" className="absolute inset-0 h-full w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
      <div className="absolute text-center text-[#3b1d0a]" style={{ left: '15%', right: '15%', top: '14%', bottom: '13%' }}>
        <div className="text-[62px] font-extrabold leading-tight text-[#b3261e]">SẮC PHONG</div>
        <div className="text-[26px] font-semibold">Tay chèo xuất sắc nhất vòng {v.vong}</div>
        <div className="mt-2 flex items-center justify-center gap-4">
          {s.avatar && <img src={s.avatar} className="h-22 w-22 rounded-full border-4 border-[#b3261e]" alt="" />}
          <div className="max-w-[560px] truncate text-[70px] font-extrabold text-[#7a1010]">{s.name}</div>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-3 text-[30px]">
          <span>
            Danh hiệu: <b>{s.danhHieu}</b>
          </span>
          <span className="rounded-full bg-[#b3261e] px-4 py-0.5 text-[24px] font-bold text-amber-100">{s.capTronDoi}</span>
        </div>
        <div className="mt-2 text-[28px] font-bold">
          Đội {s.tinh} · {s.nhip} nhịp chèo trong vòng
        </div>
        {s.top.length > 1 && (
          <div className="mt-3 text-[23px] opacity-85">
            {s.top
              .slice(1)
              .map((t, i) => `${i + 2}. ${t.name} (${t.tinh}) ${t.nhip}`)
              .join('   ·   ')}
          </div>
        )}
        <div className="absolute bottom-0 right-0 rotate-[-8deg] rounded border-4 border-[#b3261e] px-3 py-1 text-[24px] font-extrabold leading-tight text-[#b3261e]">
          ĐUA
          <br />
          GHE
        </div>
      </div>
    </div>
  );
}

function ChonSong({ v }: { v: View }) {
  const c = v.chonSong!;
  return (
    <Khung>
      <div className="text-[52px] font-extrabold leading-tight" style={vien('#ffd54a', 4)}>
        CHỌN SÔNG VÒNG SAU
      </div>
      <div className="mt-2 text-[27px] text-white/85">Gõ tên sông để bầu chọn · khóa sau {c.con} giây</div>
      <div className="mt-7 w-full space-y-4">
        {c.ds.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border-[3px] border-white/30 bg-[#12303c] px-7 py-3.5 text-left">
            <div className="min-w-0 pr-3">
              <div className="truncate text-[38px] font-extrabold">{d.ten}</div>
              <div className="truncate text-[21px] text-white/75">
                {d.mo} · gõ “{d.goi}”
              </div>
            </div>
            <div className="shrink-0 whitespace-nowrap text-[38px] font-extrabold text-amber-300">{d.phieu} PHIẾU</div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-[23px] text-white/65">
        {v.chang.ten} vừa đua · tạm nghỉ {GAME.changNghi} vòng
      </div>
    </Khung>
  );
}

function ManNghiLive({ v, channelName }: { v: View; channelName: string }) {
  const n = v.nghiLive!;
  return (
    <Khung>
      <div className="rounded-full bg-rose-600/90 px-6 py-1 text-[26px] font-extrabold tracking-wider text-white">
        🏮 LỄ THU QUÂN HẠ THỦY
      </div>
      <img src="/assets/hieu-ung/vuong-mien.png" alt="" className="vuong-mien mx-auto mt-2 h-[96px]" />
      <div className="mt-1 text-[66px] font-extrabold leading-tight" style={vien('#ffd54a', 5)}>
        HẸN GẶP LẠI!
      </div>
      <div className="mt-1 text-[27px] font-semibold text-teal-200">
        Cảm ơn {n.tongTayCheo} tay chèo đã đồng hành cùng {channelName} qua {n.vongDaDua} vòng đua!
      </div>

      {n.bang.length > 0 && (
        <div className="mt-5 w-full rounded-2xl bg-black/35 px-6 py-3 text-left">
          <div className="text-[24px] font-extrabold text-amber-300">🏆 BẢNG VÀNG TỈNH DẪN ĐẦU HÔM NAY</div>
          <div className="mt-1.5 space-y-1 text-[30px] font-bold">
            {n.bang.map((b, i) => (
              <div key={b.ten} className="flex justify-between">
                <span>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {b.ten}
                </span>
                <span className="text-amber-200">{b.n} vòng thắng</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {n.topTayCheo.length > 0 && (
        <div className="mt-3 text-[24px] text-pink-200">
          🚣 Tay chèo bền bỉ nhất ca: <b>{n.topTayCheo.map((t) => `${t.name} (${t.tinh})`).join(' · ')}</b>
        </div>
      )}

      <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-400 px-6 py-2.5 text-[28px] font-extrabold text-[#2a0d18]">
        ➕ BẤM FOLLOW KÊNH & BẬT CHUÔNG 🔔 ĐỂ ĐUA CA TIẾP THEO!
      </div>
    </Khung>
  );
}

function mmss(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function gioNay() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
