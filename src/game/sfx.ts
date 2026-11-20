import type { View } from './dua';

/**
 * Âm thanh đua ghe lễ hội bằng Web Audio API (0% bản quyền).
 * Hỗ trợ chỉnh nóng âm lượng Nhạc trống nền (`musicVolume`) và Hiệu ứng (`volume`) từ Dashboard.
 */
export type SfxName = 'chieng' | 'len' | 'vut' | 'bung' | 'kenHieu' | 'phao';
const NAMES: SfxName[] = ['chieng', 'len', 'vut', 'bung', 'kenHieu', 'phao'];

type Mode = 'tat' | 'dua' | 'rut' | 'nghi';
const BPM: Record<Exclude<Mode, 'tat'>, number> = { dua: 112, rut: 150, nghi: 84 };

class Sfx {
  volume = 0.35;
  musicVolume = 0.22;
  private ctx: AudioContext | null = null;
  private files: Partial<Record<SfxName, HTMLAudioElement>> = {};
  private lastAt: Partial<Record<SfxName, number>> = {};
  private mode: Mode = 'tat';
  private beat = 0;
  private nextBeat = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private duck = 1;

  private get c() {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  resume() {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(musicVol0to100: number, sfxVol0to100: number) {
    this.musicVolume = Math.max(0, Math.min(1, musicVol0to100 / 100));
    this.volume = Math.max(0, Math.min(1, sfxVol0to100 / 100));
    if (this.musicVolume <= 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.mode = 'tat';
    }
  }

  loadFiles() {
    for (const n of NAMES) {
      const a = new Audio(`/assets/sfx/${n}.mp3`);
      a.preload = 'auto';
      a.addEventListener('canplaythrough', () => (this.files[n] = a), { once: true });
    }
  }

  play(name: SfxName, minGapMs = 80) {
    if (this.volume <= 0) return;
    const now = performance.now();
    if (now - (this.lastAt[name] ?? -Infinity) < minGapMs) return;
    this.lastAt[name] = now;
    const file = this.files[name];
    if (file) {
      const a = file.cloneNode() as HTMLAudioElement;
      a.volume = Math.min(1, this.volume * 2);
      void a.play().catch(() => {});
      return;
    }
    try {
      SYNTH[name](this.c, this.volume);
    } catch {
      // trình duyệt chưa cho phát
    }
  }

  watch(prev: View | null, v: View, dangNoi: boolean) {
    this.duck = dangNoi ? 0.45 : 1;
    if (v.phase === 'nghiLive') {
      if (prev && prev.phase !== 'nghiLive') {
        this.play('chieng');
        setTimeout(() => this.play('phao'), 450);
      }
      this.music('tat');
      return;
    }
    this.music(v.phase === 'dua' ? (v.nuocRut ? 'rut' : 'dua') : v.phase === 'chuyen' ? 'tat' : 'nghi');
    if (!prev) return;
    if (prev.phase !== 'dua' && v.phase === 'dua') this.play('chieng');
    if (prev.phase === 'dua' && v.phase === 'ketQua') {
      this.play('chieng');
      setTimeout(() => this.play('kenHieu'), 700);
    }
    if (prev.phase !== 'sacPhong' && v.phase === 'sacPhong') this.play('phao');
    if (v.banner && v.banner.id !== prev.banner?.id) this.play(v.banner.tieuDe.startsWith('VƯỢT VŨ') ? 'vut' : 'bung');
    if (v.toast && v.toast.id !== prev.toast?.id) this.play('len', 400);
    if (v.quaLon && v.quaLon.id !== prev.quaLon?.id) this.play('phao');
    const tangCu = new Set(prev.ghe.filter((g) => g.tangToc).map((g) => g.tinh));
    if (v.ghe.some((g) => g.tangToc && !tangCu.has(g.tinh))) this.play('vut', 300);
  }

  music(mode: Mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'tat' || this.musicVolume <= 0) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.timer) return;
    try {
      this.nextBeat = this.c.currentTime + 0.1;
    } catch {
      return;
    }
    this.timer = setInterval(() => this.lich(), 50);
  }

  private lich() {
    if (this.mode === 'tat' || !this.ctx || this.musicVolume <= 0) return;
    const c = this.ctx;
    const spb = 60 / BPM[this.mode] / 2;
    while (this.nextBeat < c.currentTime + 0.2) {
      const t = this.nextBeat;
      const b = this.beat % 8;
      const v = this.musicVolume * this.duck;
      if (b === 0 || b === 4) trong(c, t, v * 1.2, 70);
      if (this.mode !== 'nghi' && (b === 2 || b === 6)) trong(c, t, v * 0.7, 90);
      if (this.mode === 'rut' && b % 2 === 1) trong(c, t, v * 0.5, 110);
      if (b === 3 || b === 7) cac(c, t, v * 0.6);
      if (this.mode === 'nghi' && b === 6) cac(c, t, v * 0.4);
      this.nextBeat += spb;
      this.beat++;
    }
  }
}

function trong(c: AudioContext, t: number, v: number, f: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 1.8, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  g.gain.setValueAtTime(Math.max(0.001, v), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.4);
}

function cac(c: AudioContext, t: number, v: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(820, t);
  g.gain.setValueAtTime(Math.max(0.001, v * 0.35), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.08);
}

function tieng(c: AudioContext, t: number, f: number, dur: number, v: number, type: OscillatorType = 'sine', f2?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function nhieu(c: AudioContext, t: number, dur: number, v: number, f0: number, f1: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(Math.max(0.001, v), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp).connect(g).connect(c.destination);
  s.start(t);
}

const SYNTH: Record<SfxName, (c: AudioContext, v: number) => void> = {
  chieng: (c, v) => {
    const t = c.currentTime;
    [196, 293, 392, 523].forEach((f, i) => tieng(c, t, f, 2.4 - i * 0.3, v * (0.5 - i * 0.08), 'sine', f * 0.98));
  },
  len: (c, v) => {
    const t = c.currentTime;
    tieng(c, t, 1318, 0.25, v * 0.25);
    tieng(c, t + 0.08, 1760, 0.3, v * 0.2);
  },
  vut: (c, v) => nhieu(c, c.currentTime, 0.6, v * 0.9, 400, 3000),
  bung: (c, v) => {
    const t = c.currentTime;
    tieng(c, t, 300, 0.25, v * 0.4, 'triangle', 900);
    trong(c, t, v * 0.8, 60);
  },
  kenHieu: (c, v) => {
    const t = c.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => tieng(c, t + i * 0.14, f, i === 3 ? 0.9 : 0.2, v * 0.3, 'sawtooth'));
  },
  phao: (c, v) => {
    const t = c.currentTime;
    for (let i = 0; i < 5; i++) nhieu(c, t + i * 0.18, 0.4, v * 0.7, 2500, 300);
  },
};

export const sfx = new Sfx();
