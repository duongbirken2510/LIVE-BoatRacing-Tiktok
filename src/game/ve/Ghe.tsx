/**
 * Ghe đua thon gọn + vệt sóng chữ V trắng dài phía sau đuôi (phong cách Boat Racing hiện đại).
 */
import { memo, useId } from 'react';

/** Vệt nước rẽ sóng chữ V kéo dài sau đuôi ghe: ghe càng nhanh / hạng càng cao vệt càng dài */
export function VetNuoc({ w, manh }: { w: number; manh: number }) {
  const uid = useId();
  const mw = w * 2.5;
  const dai = Math.round(145 + manh * 175);
  return (
    <svg
      className="vet-bot pointer-events-none block"
      width={mw}
      height={dai}
      viewBox="0 0 100 200"
      preserveAspectRatio="none"
      style={{ opacity: 0.42 + manh * 0.38 }}
    >
      <defs>
        <linearGradient id={`${uid}-core`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#e0f7ff" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="38,0 62,0 98,200 2,200" fill={`url(#${uid}-core)`} />
      <line x1="38" y1="0" x2="4" y2="195" stroke={`url(#${uid}-edge)`} strokeWidth="3.2" />
      <line x1="62" y1="0" x2="96" y2="195" stroke={`url(#${uid}-edge)`} strokeWidth="3.2" />
      <line x1="50" y1="4" x2="50" y2="165" stroke={`url(#${uid}-edge)`} strokeWidth="1.8" strokeDasharray="10 8" />
    </svg>
  );
}

const HANG_CHEO = [0.255, 0.305, 0.355, 0.406, 0.458, 0.545, 0.598, 0.649, 0.701, 0.759];
const VB_W = 184;
const VB_H = 640;
const MEP = 38;
const DAI = 58;

const LAP_LANH = [
  [0.42, 0.2], [0.6, 0.33], [0.38, 0.47], [0.62, 0.58], [0.45, 0.7], [0.58, 0.82], [0.5, 0.08], [0.35, 0.62],
];

export const GheAnh = memo(function GheAnh({
  cap,
  w,
  h,
  nhip,
  nhanh,
  lite,
}: {
  cap: number;
  w: number;
  h: number;
  nhip: number;
  nhanh: boolean;
  lite?: boolean;
}) {
  const c = Math.min(3, Math.max(0, cap));
  const cx = VB_W / 2;
  const nhipS = `${nhip}s`;
  const soSang = lite ? 0 : c === 0 ? 0 : c === 1 ? 2 : c === 2 ? 4 : 6;
  return (
    <div className="relative" style={{ width: w, height: h }}>
      {!lite && <div className="song-mui" style={{ width: w * 1.35, height: h * 0.16, left: -w * 0.175, top: h * 0.01, animationDuration: nhipS }} />}
      {nhanh && !lite && (
        <>
          <div className="bot-man" style={{ left: -4, top: h * 0.2, height: h * 0.58, width: 10 }} />
          <div className="bot-man" style={{ right: -4, top: h * 0.2, height: h * 0.58, width: 10 }} />
        </>
      )}
      <svg className="absolute inset-0 overflow-visible" width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
        {HANG_CHEO.map((t, i) => {
          const y = t * VB_H;
          return (
            <g key={i}>
              <g className="mc-t" style={{ transformOrigin: `${cx - MEP + 6}px ${y}px`, animationDuration: nhipS }}>
                <line x1={cx - MEP + 6} y1={y} x2={cx - MEP - DAI} y2={y + 16} stroke="#6b4423" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx={cx - MEP - DAI} cy={y + 16} rx="9.5" ry="4.2" fill="#8a5a2b" stroke="#4a2e12" strokeWidth="1.5" transform={`rotate(13 ${cx - MEP - DAI} ${y + 16})`} />
                {!lite && <circle className="te-nuoc" cx={cx - MEP - DAI - 3} cy={y + 18} r="10" style={{ animationDuration: nhipS }} />}
              </g>
              <g className="mc-p" style={{ transformOrigin: `${cx + MEP - 6}px ${y}px`, animationDuration: nhipS }}>
                <line x1={cx + MEP - 6} y1={y} x2={cx + MEP + DAI} y2={y + 16} stroke="#6b4423" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx={cx + MEP + DAI} cy={y + 16} rx="9.5" ry="4.2" fill="#8a5a2b" stroke="#4a2e12" strokeWidth="1.5" transform={`rotate(-13 ${cx + MEP + DAI} ${y + 16})`} />
                {!lite && <circle className="te-nuoc" cx={cx + MEP + DAI + 3} cy={y + 18} r="10" style={{ animationDuration: nhipS }} />}
              </g>
            </g>
          );
        })}
      </svg>
      <img
        src={`/assets/ghe/cap${c}.png`}
        alt=""
        className={`relative block ${!lite && c === 2 ? 'sang-hong' : !lite && c === 3 ? 'sang-vang' : ''}`}
        style={{ width: w, height: h, maxWidth: 'none' }}
      />
      {LAP_LANH.slice(0, soSang).map(([x, y], i) => (
        <span key={i} className="lap-lanh-sao" style={{ left: x * w, top: y * h, fontSize: 16, animationDelay: `${(i * 0.37) % 1.6}s` }}>
          ✦
        </span>
      ))}
    </div>
  );
});
