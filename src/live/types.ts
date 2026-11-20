// Dữ liệu server.ts gửi xuống qua SSE.

export interface LiveStatus {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  port?: number;
  error?: string;
}

export interface VieneuVoice {
  id: string;
  name: string;
  description: string;
  gender: string;
}

export interface VieneuStatus {
  state: 'loading' | 'ready' | 'unavailable';
  voice: string; // tên giọng VieNeu, hoặc 'edge:M' / 'edge:F' / ''
  voices: VieneuVoice[];
}

export interface CaiDat {
  tieuDe: string;
  tieuDePhu: string;
  duaSec: number;
  anQua: boolean;
  choDoiGhe: boolean;
  musicVol: number; // 0 - 100
  sfxVol: number;   // 0 - 100
  mcVol: number;    // 0 - 100
}

export interface ChatEvent {
  username: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
  createTime?: number;
}

export interface GiftEvent {
  username: string;
  nickname: string;
  giftName: string;
  giftId: number;
  diamondCount: number;
  repeatCount: number;
  avatar: string;
  timestamp: number;
}

export interface UserEvent {
  username: string;
  nickname: string;
  avatar: string;
  timestamp: number;
}

export interface LikeEvent {
  username: string;
  nickname: string;
  likeCount: number;
  totalLikes: number;
}

export interface ControlCommand {
  action: 'speak' | 'setRate' | 'reset' | 'setName' | 'setVoice' | 'custom';
  text?: string;
}

export interface LiveHandlers {
  onStatus?: (s: LiveStatus) => void;
  onChat?: (e: ChatEvent) => void;
  onGift?: (e: GiftEvent) => void;
  onMember?: (e: UserEvent) => void;
  onFollow?: (e: UserEvent) => void;
  onShare?: (e: UserEvent) => void;
  onLike?: (e: LikeEvent) => void;
  onViewers?: (count: number) => void;
  onControl?: (c: ControlCommand) => void;
  onGameState?: (s: any) => void;
  onCaiDat?: (c: CaiDat) => void;
  onVieneu?: (v: VieneuStatus) => void;
  onStages?: (count: number) => void;
}
