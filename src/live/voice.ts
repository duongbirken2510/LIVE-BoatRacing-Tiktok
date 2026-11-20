import { IS_STAGE, MUTE } from './page';
import { containsBanned } from './bannedWords';

/**
 * Hàng đợi giọng đọc 2 làn ưu tiên (Priority & Normal) + Prefetch tuần tự.
 * Có chốt chặn an toàn cuối cùng: tuyệt đối bỏ qua câu chứa từ vi phạm cộng đồng.
 */
interface Line {
  text: string;
  at: number;
  done?: () => void;
}

const MAX_WAIT_MS = 45_000;
const MAX_QUEUE = 30;

class Voice {
  private normal: Line[] = [];
  private priority: Line[] = [];
  private playing = false;
  private current: HTMLAudioElement | null = null;
  private lastSpokeAt = Date.now();
  rate = 1;
  volume = 1;
  enabled = IS_STAGE && !MUTE;
  speaker = true;

  setSpeaker(mine: boolean) {
    if (!mine && this.speaker) this.stop();
    this.speaker = mine;
    this.enabled = IS_STAGE && !MUTE && mine;
  }

  setVolume(vol0to1: number) {
    this.volume = Math.max(0, Math.min(1, vol0to1));
    if (this.current) this.current.volume = this.volume;
  }

  onBlocked?: () => void;

  say(text: string, priority = false, done?: () => void) {
    const clean = text.trim();
    if (!this.enabled || !clean || this.volume <= 0 || containsBanned(clean)) return done?.();
    const q = priority ? this.priority : this.normal;
    q.push({ text: clean, at: Date.now(), done });
    if (q.length > MAX_QUEUE) q.shift()?.done?.();
    void this.next();
  }

  private daTao = new Set<string>();
  private prefetchQueue: string[] = [];
  private prefetching = false;

  prefetch(text: string) {
    const t = text.trim();
    if (!this.enabled || !t || containsBanned(t) || this.daTao.has(t)) return;
    this.daTao.add(t);
    if (this.daTao.size > 300) this.daTao.clear();
    this.prefetchQueue.unshift(t);
    void this.runPrefetch();
  }

  private async runPrefetch() {
    if (this.prefetching) return;
    this.prefetching = true;
    try {
      while (this.prefetchQueue.length > 0) {
        const t = this.prefetchQueue.shift()!;
        try {
          const r = await fetch(`/api/tts?prefetch=1&rate=${this.rate}&text=${encodeURIComponent(t)}`);
          await r.arrayBuffer();
        } catch {
          this.daTao.delete(t);
        }
      }
    } finally {
      this.prefetching = false;
    }
  }

  clearPrefetch() {
    this.daTao.clear();
    this.prefetchQueue = [];
  }

  stop() {
    [...this.normal, ...this.priority].forEach((l) => l.done?.());
    this.normal = [];
    this.priority = [];
    this.current?.pause();
    this.current = null;
    this.playing = false;
  }

  get busy() {
    return this.playing || this.normal.length + this.priority.length > 0;
  }

  get waiting() {
    return this.normal.length;
  }

  get waitingPriority() {
    return this.priority.length;
  }

  quietForMs(now = Date.now()) {
    return this.busy ? 0 : now - this.lastSpokeAt;
  }

  private async next() {
    if (this.playing) return;
    const now = Date.now();
    let line: Line | undefined;
    while ((line = this.priority.shift() ?? this.normal.shift())) {
      if (now - line.at < MAX_WAIT_MS && !containsBanned(line.text)) break;
      line.done?.();
    }
    if (!line) return;
    this.playing = true;
    try {
      const audio = new Audio(`/api/tts?rate=${this.rate}&text=${encodeURIComponent(line.text)}`);
      audio.volume = this.volume;
      this.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch((e) => {
          if (e?.name === 'NotAllowedError') this.onBlocked?.();
          resolve();
        });
      });
    } finally {
      line.done?.();
      this.current = null;
      this.playing = false;
      this.lastSpokeAt = Date.now();
      void this.next();
    }
  }
}

export const voice = new Voice();

export { speakableName, safeDisplayName } from './names';
