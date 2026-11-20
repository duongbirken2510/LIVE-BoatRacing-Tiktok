import { useEffect, useRef, useState } from 'react';
import { useLiveEvents } from '../live/useLiveEvents';
import type { CaiDat, LiveStatus, VieneuStatus } from '../live/types';
import { voice, speakableName, safeDisplayName } from '../live/voice';
import { NameBatcher } from '../live/scoreboard';
import { GiftThanker, makePicker, OncePerPerson } from '../live/chatter';
import { IS_STAGE, MUTE } from '../live/page';
import { sfx } from './sfx';
import { GAME } from './config';
import { DuaGhe, type Ev, type View } from './dua';
import { SO_TINH } from './tinh';

const pick = makePicker();
const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => undefined);

const DEFAULT_CAI_DAT: CaiDat = {
  tieuDe: '',
  tieuDePhu: '',
  duaSec: GAME.duaSec,
  anQua: false,
  choDoiGhe: true,
  musicVol: 22,
  sfxVol: 35,
  mcVol: 100,
};

/**
 * Trang stage chạy lõi DuaGhe, điều phối giọng đọc AI & gửi ảnh chụp trạng thái lên server.
 * Trang điều khiển nhận trạng thái xem trước im lặng và điều khiển trực tiếp.
 */
export function useGame() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [vieneu, setVieneu] = useState<VieneuStatus | null>(null);
  const [stageCount, setStageCount] = useState(0);
  const stageCountRef = useRef(0);
  stageCountRef.current = stageCount;
  const [view, setView] = useState<View | null>(null);
  const [channelName, setChannelName] = useState(GAME.defaultChannelName);
  const channelRef = useRef(GAME.defaultChannelName);
  channelRef.current = channelName;

  const [caiDatGoc, setCaiDatGoc] = useState<CaiDat>(DEFAULT_CAI_DAT);
  const caiDat: CaiDat = {
    ...caiDatGoc,
    tieuDe: caiDatGoc.tieuDe || GAME.tieuDeMacDinh,
    tieuDePhu: caiDatGoc.tieuDePhu || GAME.tieuDePhu,
  };

  const [room] = useState(() => new DuaGhe());
  if (import.meta.env.DEV) Object.assign(window as any, { __room: room, __sfx: sfx });

  const [talk] = useState(() => ({
    greeter: new NameBatcher(
      GAME.greetEveryMs,
      GAME.namesPerGreeting,
      (names) => voice.say(GAME.greeting(joinNames(names), channelRef.current)),
      () => voice.waiting >= 1,
    ),
    gifts: new GiftThanker(GAME.giftThanksCooldownMs, GAME.bigGiftCoins),
    follows: new OncePerPerson(),
    lenLuc: 0,
    binhLuc: 0,
  }));

  const applyCaiDat = (c: CaiDat) => {
    setCaiDatGoc(c);
    room.setDuaSec(c.duaSec);
    room.choDoiGhe = c.choDoiGhe;
    if (IS_STAGE && !MUTE) {
      sfx.setVolumes(c.musicVol, c.sfxVol);
      voice.setVolume(c.mcVol / 100);
    }
  };

  const speak = (ev: Ev) => {
    const L = GAME.loi;
    const now = Date.now();
    switch (ev.t) {
      case 'chuyen': {
        voice.say(pick(L.chuyen)?.(ev.chang) ?? '', true);
        if (room.ghe.has(room.chang.nha)) voice.say(pick(L.sanNha)?.(ev.nha) ?? '', true);
        return;
      }
      case 'len': {
        if (ev.daoBienDong) {
          return voice.say(pick(L.bienDong)?.(ev.daoBienDong, ev.tinh) ?? '', true);
        }
        if (ev.tinhMoi) return voice.say(pick(L.tinhMoi)?.(ev.tinh) ?? '');
        if (now - talk.lenLuc > 6000 && voice.waiting < 2) {
          talk.lenLuc = now;
          const ten = speakableName(ev.name);
          voice.say(ev.doiGhe ? (pick(L.doiGhe)?.(ten, ev.tinh) ?? '') : (pick(L.len)?.(ten, ev.tinh) ?? ''));
        }
        return;
      }
      case 'lenCap':
        return voice.say(pick(L.lenCap)?.(ev.tinh, ev.cap) ?? '', true);
      case 'caChep':
        return voice.say(pick(L.caChep)?.(ev.tinh) ?? '', true);
      case 'vuMon':
        return voice.say(pick(L.vuMon)?.(ev.tinh) ?? '', true);
      case 'caChepTruot':
        return voice.say(pick(L.caChepTruot)?.(ev.tinh) ?? '');
      case 'sucRong':
        return voice.say(pick(L.sucRong)?.(ev.tinh) ?? '', true);
      case 'songHep':
        return voice.say(pick(L.songHep) ?? '', true);
      case 'senNo':
        return voice.say(pick(L.senNo) ?? '', true);
      case 'vuot':
        return voice.say(pick(L.vuot)?.(ev.tinh) ?? '', true);
      case 'daiChien':
        return voice.say(pick(L.daiChien)?.(ev.a, ev.b) ?? '');
      case 'nuocRut':
        return voice.say(pick(L.nuocRut)?.(ev.dau, String(ev.cach)) ?? '', true);
      case 'tiepSuc':
        return voice.say(pick(L.tiepSuc)?.(speakableName(ev.name), ev.tinh) ?? '');
      case 'ketQua': {
        voice.stop();
        const nhat = ev.top[0];
        if (!nhat) return voice.say(L.khongAi, true);
        voice.say(pick(L.ketQua)?.(nhat.tinh, String(nhat.m)) ?? '', true);
        if (ev.lienTiep >= 2) voice.say(L.lienTiep(nhat.tinh, ev.lienTiep), true);
        return;
      }
      case 'thang':
        if (voice.speaker) {
          void post('/api/bang-vang', { tinh: ev.tinh })
            .then((r) => r?.json())
            .then((b) => {
              if (b?.thang) room.bang = b.thang;
              if (b?.thangTuan) room.bangTuan = b.thangTuan;
            });
        }
        return;
      case 'luuTayCheo':
        if (voice.speaker) {
          void post('/api/tay-cheo', { list: ev.list, mvpId: ev.mvpId });
        }
        return;
      case 'sacPhong':
        return voice.say(L.sacPhong(speakableName(ev.name), ev.tinh, ev.nhip, ev.danhHieu), true);
      case 'chonSong':
        return voice.say(L.chonSong(ev.ten[0] ?? '', ev.ten[1] ?? '', ev.ten[2] ?? ''), true);
      case 'chotSong':
        return voice.say(L.chotSong(ev.chang), true);
      case 'qua': {
        if (!talk.gifts.shouldThank(ev.name, ev.coins, voice.waitingPriority)) return;
        const ten = speakableName(ev.name);
        return voice.say(ev.tinh ? pick(L.camQua)!(ten, ev.tinh, String(ev.giay)) : L.camQuaChuaGhe(ten, String(ev.giay || 2)), true);
      }
      case 'congBu':
        return voice.say(L.congBu(speakableName(ev.name), ev.tinh, String(ev.giay)), true);
      case 'nghiLive':
        voice.stop();
        return voice.say(L.nghiLive(channelRef.current, ev.topTinh), true);
    }
  };

  const binh = (now: number) => {
    if (room.phase !== 'dua' || voice.busy || voice.quietForMs(now) < 6000 || now - talk.binhLuc < 12_000) return;
    talk.binhLuc = now;
    const v = room.view(now);
    const B = GAME.loi.binh;
    const [a, b] = v.ghe;
    const r = Math.random();
    let line: string | undefined;
    if (a && b && a.m - b.m < 15 && a.m > 20) line = pick(B.sat)?.(a.ten, b.ten);
    else if (a && r < 0.35) line = pick(B.dan)?.(a.ten, String(Math.round(a.m - (b?.m ?? 0))));
    else if (v.ghe.length >= 3 && r < 0.55) line = pick(B.cuoi)?.(v.ghe[v.ghe.length - 1].ten);
    else line = pick(B.moi)?.(String(SO_TINH - v.soDangDua));
    if (line) voice.say(line);
  };

  useLiveEvents({
    onStatus: setStatus,
    onVieneu: setVieneu,
    onStages: setStageCount,
    onGameState: (s) => !IS_STAGE && setView(s),
    onCaiDat: applyCaiDat,

    onChat: (e) => {
      if (!IS_STAGE && stageCountRef.current > 0) return;
      room.chat({ id: e.username, name: safeDisplayName(e.nickname, e.username), avatar: e.avatar, comment: e.comment }, Date.now());
    },

    onGift: (e) => {
      if (!IS_STAGE && stageCountRef.current > 0) return;
      const name = safeDisplayName(e.nickname, e.username);
      room.qua({ id: e.username, name, gift: e.giftName, count: e.repeatCount, coins: e.diamondCount * e.repeatCount }, Date.now());
    },

    onMember: (e) => {
      if (!IS_STAGE || room.phase === 'nghiLive') return;
      const spoken = speakableName(safeDisplayName(e.nickname, e.username));
      if (spoken !== 'bạn') talk.greeter.add(e.username, spoken);
    },

    onLike: (e) => {
      if (IS_STAGE || stageCountRef.current === 0) room.tim(e.username, e.likeCount, Date.now());
    },

    onFollow: (e) => {
      if (!IS_STAGE || room.phase === 'nghiLive') return;
      if (talk.follows.first(e.username)) {
        voice.say(GAME.thankFollow(speakableName(safeDisplayName(e.nickname, e.username)), channelRef.current));
      }
    },

    onControl: (c) => {
      if (c.action === 'setName' && c.text) setChannelName(c.text);
      if (c.action === 'setVoice') voice.clearPrefetch();
      if (!IS_STAGE && stageCountRef.current > 0) return;
      const now = Date.now();
      if (IS_STAGE && c.action === 'speak' && c.text) voice.say(c.text, true);
      if (IS_STAGE && c.action === 'setRate' && c.text) {
        voice.rate = Number(c.text) || 1;
        voice.clearPrefetch();
      }
      if (c.action === 'reset') {
        if (IS_STAGE) voice.stop();
        room.xoaHet(now);
      }
      if (c.action === 'custom' && c.text) {
        if (c.text === 'vongmoi') {
          if (IS_STAGE) voice.stop();
          room.vongMoi(now);
        } else if (c.text === 'nuocrut') {
          room.toiNuocRut(now);
        } else if (c.text === 'tatlive') {
          room.tatLive(now);
        } else if (c.text.startsWith('chang:')) {
          if (IS_STAGE) voice.stop();
          room.chonChangNgay(c.text.slice(6), now);
        } else if (c.text.startsWith('sukien:')) {
          const sk = c.text.slice(7) as 'caChep' | 'sucRong' | 'songHep' | 'senNo';
          room.kichHoatSuKien(sk, now);
        }
      }
    },
  });

  // Khi chưa mở link Stage trong OBS (stageCount === 0), trang Dashboard tự chạy bản xem thử để không bao giờ bị kẹt "Đang mở trường đua..."
  useEffect(() => {
    if (IS_STAGE || stageCount > 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      room.tick(now);
      room.lay();
      setView(room.view(now));
    }, 250);
    return () => clearInterval(id);
  }, [stageCount, room]);

  useEffect(() => {
    if (!IS_STAGE) return;
    let lastPost = 0;
    let prev: View | null = null;
    fetch('/api/bang-vang')
      .then((r) => r.json())
      .then((b) => {
        if (b?.thang) room.bang = b.thang;
        if (b?.thangTuan) room.bangTuan = b.thangTuan;
      })
      .catch(() => {});
    fetch('/api/tay-cheo')
      .then((r) => r.json())
      .then((m) => m && typeof m === 'object' && (room.hoSo = m))
      .catch(() => {});

    [...GAME.loi.songHep, ...GAME.loi.senNo].forEach((t) => voice.prefetch(t));
    if (MUTE) sfx.setVolumes(0, 0);
    sfx.loadFiles();

    const id = setInterval(() => {
      const now = Date.now();
      room.tick(now);
      room.lay().forEach(speak);
      binh(now);
      const v = room.view(now);
      setView(v);
      if (voice.speaker) sfx.watch(prev, v, voice.busy);
      else sfx.music('tat');
      prev = v;
      if (voice.speaker && now - lastPost >= 500) {
        lastPost = now;
        void post('/api/game/state', v);
      }
    }, 250);

    const share = setInterval(() => {
      if (room.phase === 'nghiLive') return;
      const line = pick(GAME.shareLines);
      if (line) voice.say(line);
    }, GAME.shareReminderEveryMs);

    return () => {
      clearInterval(id);
      clearInterval(share);
    };
  }, []);

  return { status, vieneu, stageCount, channelName, view, caiDat };
}

export type GameState = ReturnType<typeof useGame>;

function joinNames(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}` : names[0] ?? '';
}
