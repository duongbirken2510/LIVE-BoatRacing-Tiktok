/**
 * Nền sông từng chặng: dùng ảnh thật tách bờ (public/assets/song & bo) kết hợp bộ lọc màu vùng miền.
 * Chế độ `lite` (xem trước trên Dashboard) tắt hiệu ứng lọc nặng để tiết kiệm GPU khi đang stream.
 */
import { memo } from 'react';
import { CHANG, CHANG_BY_ID } from '../chang';

const W = 1080;
const T = 960;
const BO = 205;

function Cot({ src, rong, nhanh, locMau }: { src: string; rong: number; nhanh: boolean; locMau?: string }) {
  return (
    <div
      className="song-chay-anh absolute left-0 top-0"
      style={{ width: rong, height: T * 4, animationDuration: nhanh ? '6.4s' : '14s', filter: locMau }}
    >
      {[0, 1, 2, 3].map((i) => (
        <img
          key={i}
          src={src}
          alt=""
          style={{ display: 'block', width: rong, height: T, maxWidth: 'none', transform: i % 2 ? 'scaleY(-1)' : undefined }}
        />
      ))}
    </div>
  );
}

export const NenSong = memo(function NenSong({
  changId,
  nhanh,
  songHep,
  lite,
}: {
  changId: string;
  nhanh: boolean;
  songHep: boolean;
  lite?: boolean;
}) {
  const c = CHANG_BY_ID.get(changId) ?? CHANG[0];
  const loc = lite ? undefined : c.locMau;
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: c.nuoc[1] }}>
      <Cot src={`/assets/song/${c.anh}.jpg`} rong={W} nhanh={nhanh} locMau={loc} />
      <div
        className="bo-lan absolute bottom-0 left-0 top-0 overflow-hidden"
        style={{ width: songHep ? BO - 10 : 0, boxShadow: songHep && !lite ? '8px 0 18px rgba(0,0,0,0.35)' : undefined }}
      >
        <div className="absolute bottom-0 right-0 top-0" style={{ width: BO }}>
          <Cot src={`/assets/bo/${c.anh}-trai.jpg`} rong={BO} nhanh={nhanh} locMau={loc} />
        </div>
      </div>
      <div
        className="bo-lan absolute bottom-0 right-0 top-0 overflow-hidden"
        style={{ width: songHep ? BO - 10 : 0, boxShadow: songHep && !lite ? '-8px 0 18px rgba(0,0,0,0.35)' : undefined }}
      >
        <div className="absolute bottom-0 left-0 top-0" style={{ width: BO }}>
          <Cot src={`/assets/bo/${c.anh}-phai.jpg`} rong={BO} nhanh={nhanh} locMau={loc} />
        </div>
      </div>
    </div>
  );
});
