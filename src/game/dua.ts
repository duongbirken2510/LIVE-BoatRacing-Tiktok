/**
 * Lõi luật chơi Ghe Ngo 34 Tỉnh (LIVE-DUAGHE — Phiên bản nâng cấp Duong Birken).
 * Không phụ thuộc React hay Web Audio. Kiểm thử tự động: `npx tsx src/game/dua.check.ts`.
 *
 * Điểm nâng cấp cốt lõi:
 * - Đổi ghe quê hương thông minh (sau 45s cooldown, chống khóa chết khi gõ nhầm)
 * - Bảo lưu Tim & Quà tặng cho khách mới chưa kịp gõ tên tỉnh (gõ tỉnh sau được cộng bù ngay)
 * - Cơ chế Quân số Thực chiến (tự cho nghỉ tay chèo treo máy > 6 phút để chống "ghe ma" Cấp 3 ảo)
 * - Gõ bình luận cổ vũ trên ghe (+3m mỗi 8s) tăng tương tác comment phòng LIVE
 * - Vinh danh Hoàng Sa / Trường Sa & Đảo tiền tiêu Tổ quốc
 * - Bảng vàng Tỉnh Hôm Nay + Bảng vàng Tuần + Cấp bậc Thủy Thủ Trọn Đời
 * - Chế độ Lễ Thu Quân Hạ Thủy (`nghiLive`) chào tạm biệt & chốt Follow cuối buổi
 */
import { GAME, capBacTronDoi, capCua, danhHieu, giayTangToc } from './config';
import { TINH_BY_ID, plain, tenCu, tenDao, timTinh } from './tinh';
import { CHANG, CHANG_BY_ID, type Chang } from './chang';

export type Phase = 'chuyen' | 'dua' | 'ketQua' | 'sacPhong' | 'chonSong' | 'nghiLive';

interface Nguoi {
  id: string;
  name: string;
  avatar: string;
  tinh: string;
  nhip: number; // tim trong vòng hiện tại
  tongNhipBuoi: number; // tổng tim cả buổi live
  lenLuc: number; // thời điểm vào ghe hiện tại (để tính cooldown đổi ghe)
  hoatDong: number; // lần tương tác gần nhất (để lọc ghe ma)
  hoLuc: number; // lần gõ cổ vũ gần nhất
  active: boolean; // đang có mặt trên ghe
}

interface Ghe {
  tinh: string;
  m: number;
  nguoi: number;
  cap: number;
  tangTocDen: number;
  sucRongDen: number;
  hoatDong: number;
  nhipVong: number;
  toc: number;
  mTruoc: number;
}

type SuKien =
  | { loai: 'caChep'; tinh: string; can: number; co: number; den: number }
  | { loai: 'sucRong'; tinh: string; den: number }
  | { loai: 'songHep'; den: number }
  | { loai: 'senNo'; den: number };

export type Ev =
  | { t: 'chuyen'; chang: string; nha: string }
  | { t: 'len'; name: string; tinh: string; tinhMoi: boolean; doiGhe?: boolean; daoBienDong?: string }
  | { t: 'lenCap'; tinh: string; cap: string }
  | { t: 'caChep'; tinh: string }
  | { t: 'vuMon'; tinh: string }
  | { t: 'caChepTruot'; tinh: string; thieu: number }
  | { t: 'sucRong'; tinh: string }
  | { t: 'songHep' }
  | { t: 'senNo' }
  | { t: 'vuot'; tinh: string }
  | { t: 'daiChien'; a: string; b: string }
  | { t: 'nuocRut'; dau: string; cach: number }
  | { t: 'tiepSuc'; name: string; tinh: string }
  | { t: 'ketQua'; top: { tinh: string; m: number }[]; lienTiep: number }
  | { t: 'sacPhong'; name: string; tinh: string; nhip: number; danhHieu: string }
  | { t: 'chonSong'; ten: string[] }
  | { t: 'chotSong'; chang: string }
  | { t: 'qua'; name: string; tinh: string | null; giay: number; coins: number }
  | { t: 'congBu'; name: string; tinh: string; giay: number; tim: number }
  | { t: 'thang'; tinh: string }
  | { t: 'luuTayCheo'; list: { id: string; name: string; tinh: string; nhip: number }[]; mvpId: string }
  | { t: 'nghiLive'; topTinh: string };

export type MauBanner = 'vang' | 'hong' | 'xanh' | 'trang' | 'do';
interface Banner {
  id: number;
  tieuDe: string;
  phu: string;
  mau: MauBanner;
}

export interface GheView {
  tinh: string;
  ten: string;
  ngan: string;
  m: number;
  hang: number;
  cap: number;
  so: number;
  lan: number;
  toc: number;
  tocTB: number;
  tangToc: boolean;
  sucRong: boolean;
  sanNha: boolean;
  caChep: { can: number; co: number; con: number } | null;
}

export interface View {
  phase: Phase;
  vong: number;
  con: number;
  nuocRut: boolean;
  chang: { id: string; ten: string; sao: number; nha: string };
  ghe: GheView[];
  soDangDua: number;
  dauCach: number;
  conLenSong: number;
  banner: Banner | null;
  pills: string[];
  toast: { id: number; text: string; tinh: string; phu?: string } | null;
  ticker: { id: number; text: string } | null;
  benCho: string[];
  hoChe: { id: number; tinh: string; text: string }[];
  timNguoi: { id: number; tinh: string; name: string }[];
  daiChien: { a: string; b: string; ma: number; mb: number } | null;
  dauBox: { tinh: string; cach: number; duoi: string } | null;
  ketQua: {
    top: { tinh: string; ten: string; m: number }[];
    lienTiep: number;
    bang: { ten: string; n: number }[];
    bangTuan: { ten: string; n: number }[];
  } | null;
  sacPhong: {
    name: string;
    avatar: string;
    tinh: string;
    nhip: number;
    danhHieu: string;
    capTronDoi: string;
    top: { name: string; tinh: string; nhip: number }[];
  } | null;
  chonSong: { ds: { id: string; ten: string; mo: string; goi: string; phieu: number }[]; con: number } | null;
  nghiLive: {
    vongDaDua: number;
    tongTayCheo: number;
    bang: { ten: string; n: number }[];
    bangTuan: { ten: string; n: number }[];
    topTayCheo: { name: string; tinh: string; nhip: number }[];
  } | null;
  quaLon: { id: number; name: string; gift: string; count: number } | null;
  songHep: boolean;
  senNo: boolean;
}

const tenTinh = (id: string) => TINH_BY_ID.get(id)?.ten ?? id;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const LAN_UU_TIEN = [2, 3, 1, 4, 0, 5];

export class DuaGhe {
  phase: Phase = 'chuyen';
  vong = 0;
  endsAt = 0;
  duaSec = GAME.duaSec;
  choDoiGhe = true;
  private startAt = 0;
  private lastTick = 0;
  chang: Chang = CHANG[0];
  private changDaDua = new Map<string, number>();

  nguoi = new Map<string, Nguoi>();
  ghe = new Map<string, Ghe>();
  private treo = new Map<string, { tim: number; giay: number; at: number }>();
  private lan = new Map<string, number>();
  private xep: Ghe[] = [];

  private suKien: SuKien[] = [];
  private suKienSau = 0;
  private suKienCuoi = '';
  private dauCu = '';
  private vuotLuc = 0;
  private daiChienLuc = 0;
  private daNuocRut = false;
  private tiepSucLuc = 0;
  private tiepSucNoiLuc = 0;
  private timGanDay: { at: number; id: string; n: number }[] = [];

  private banners: Banner[] = [];
  private banner: (Banner & { den: number }) | null = null;
  private toasts: { text: string; tinh: string; phu?: string }[] = [];
  private toast: { id: number; text: string; tinh: string; phu?: string; den: number } | null = null;
  private tickers: string[] = [];
  private ticker: { id: number; text: string; den: number } | null = null;
  private benCho: string[] = [];
  private hoChe: { id: number; tinh: string; text: string; den: number }[] = [];
  private hoCheLuc = new Map<string, number>();
  private timNguoi: { id: number; tinh: string; name: string; den: number }[] = [];
  private quaLon: { id: number; name: string; gift: string; count: number; den: number } | null = null;
  private seq = 1;

  private thangCuoi = '';
  private lienTiep = 0;
  bang: Record<string, number> = {};
  bangTuan: Record<string, number> = {};
  hoSo: Record<string, { tongNhip: number; sacPhong: number }> = {};

  private ketQua: View['ketQua'] = null;
  private sacPhong: View['sacPhong'] = null;
  private chon: { ds: { id: string; mo: string; phieu: number }[]; daBau: Set<string> } | null = null;
  private changSau: Chang | null = null;
  private nghiLiveData: View['nghiLive'] = null;

  private evs: Ev[] = [];

  constructor(now = Date.now()) {
    this.chang = CHANG[Math.floor(Math.random() * CHANG.length)];
    this.chuyen(now);
  }

  lay(): Ev[] {
    const e = this.evs;
    this.evs = [];
    return e;
  }

  setDuaSec(sec: number, now = Date.now()) {
    const next = Math.min(360, Math.max(60, Math.round(sec) || GAME.duaSec));
    if (next === this.duaSec) return;
    this.duaSec = next;
    if (this.phase === 'dua') {
      const elapsed = Math.max(0, now - this.startAt);
      this.endsAt = Math.max(now + 5000, this.startAt + this.duaSec * 1000 - (elapsed > this.duaSec * 1000 ? elapsed : 0));
    }
  }

  // ---------- Tương tác người xem ----------

  chat(p: { id: string; name: string; avatar?: string; comment: string }, now = Date.now()) {
    if (this.phase === 'nghiLive') return;

    let daBauSong = false;
    if (this.phase === 'chonSong' && this.chon && !this.chon.daBau.has(p.id)) {
      const c = plain(p.comment);
      const x = this.chon.ds.find((d) => CHANG_BY_ID.get(d.id)!.goi.some((g) => c.includes(plain(g))));
      if (x) {
        x.phieu++;
        this.chon.daBau.add(p.id);
        daBauSong = true;
      }
    }

    const old = this.nguoi.get(p.id);
    const tinhGoi = timTinh(p.comment);

    if (old) {
      old.name = p.name;
      if (p.avatar) old.avatar = p.avatar;
      this.kichHoatNguoi(old, now);
      if (daBauSong) return;

      // Cho phép đổi sang ghe tỉnh khác nếu đã qua thời gian chờ 45s (chống khóa chết khi gõ nhầm)
      if (tinhGoi && tinhGoi !== old.tinh && this.choDoiGhe && now - old.lenLuc >= GAME.doiGheSauMs) {
        const tinhCu = old.tinh;
        old.tinh = tinhGoi;
        old.lenLuc = now;
        this.capNhatQuanSo(tinhCu);
        this.duaVaoGhe(old, p.comment, now, true);
        return;
      }

      // Đã ở trên ghe mà bình luận cổ vũ trong lúc đua -> cộng 3m khích lệ mỗi 8 giây
      if (this.phase === 'dua' && now - old.hoLuc >= GAME.hoCooldownMs) {
        const g = this.ghe.get(old.tinh);
        if (g) {
          old.hoLuc = now;
          g.hoatDong = now;
          const met = GAME.metMoiHo * this.heSo(g, now);
          g.m += met;
          g.nhipVong += 2;
          old.nhip += 2;
          old.tongNhipBuoi += 2;
          if (now - (this.hoCheLuc.get(g.tinh) ?? 0) > 1800) {
            this.hoCheLuc.set(g.tinh, now);
            this.hoChe.push({
              id: this.seq++,
              tinh: g.tinh,
              text: GAME.hoChe[Math.floor(Math.random() * GAME.hoChe.length)],
              den: now + 1800,
            });
          }
        }
      }
      return;
    }

    if (!tinhGoi) return;
    const moi: Nguoi = {
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? '',
      tinh: tinhGoi,
      nhip: 0,
      tongNhipBuoi: 0,
      lenLuc: now,
      hoatDong: now,
      hoLuc: 0,
      active: true,
    };
    this.nguoi.set(p.id, moi);
    this.duaVaoGhe(moi, p.comment, now, false);
  }

  private kichHoatNguoi(n: Nguoi, now: number) {
    n.hoatDong = now;
    if (!n.active) {
      n.active = true;
      this.capNhatQuanSo(n.tinh);
    }
  }

  private capNhatQuanSo(tinhId: string) {
    const g = this.ghe.get(tinhId);
    if (!g) return;
    let count = 0;
    for (const n of this.nguoi.values()) {
      if (n.tinh === tinhId && n.active) count++;
    }
    g.nguoi = count;
    g.cap = capCua(count);
  }

  private duaVaoGhe(n: Nguoi, comment: string, now: number, doiGhe: boolean) {
    let g = this.ghe.get(n.tinh);
    const tinhMoi = !g || g.nguoi === 0 || now - g.hoatDong > GAME.nghiDuaSauMs;
    if (!g) {
      const dangDua = this.dangDua(now);
      const cuoi = dangDua.length ? Math.min(...dangDua.map((x) => x.m)) : 0;
      const m0 = this.phase === 'dua' ? cuoi : 0;
      g = { tinh: n.tinh, m: m0, nguoi: 0, cap: 0, tangTocDen: 0, sucRongDen: 0, hoatDong: now, nhipVong: 0, toc: 0, mTruoc: m0 };
      this.ghe.set(n.tinh, g);
    }
    const capCu = g.cap;
    this.capNhatQuanSo(n.tinh);
    g.hoatDong = now;

    const ten = tenTinh(n.tinh);
    const daoInfo = tenDao(comment, n.tinh);
    const cu = tenCu(comment, n.tinh);
    const t = TINH_BY_ID.get(n.tinh)!;
    const hs = this.hoSo[n.id];
    const huyHieu = hs && hs.tongNhip >= 200 ? ` (${capBacTronDoi(hs.tongNhip).split('·')[1]?.trim() ?? ''})` : '';

    this.toasts.push({
      text: `${rutGon(n.name, 15).toUpperCase()} ${doiGhe ? 'CHUYỂN SANG' : 'ĐÃ LÊN'} GHE ${ten.toUpperCase()}`,
      tinh: n.tinh,
      phu: daoInfo?.bienDong ? `🇻🇳 Tự hào ${daoInfo.dao} thân yêu · Thả tim ♥ để chèo!` : undefined,
    });

    const moTaQue = daoInfo ? `${daoInfo.dao} thuộc ${ten}` : cu ? `${cu} nay về chung ${ten}` : t.chao;
    this.tickers.push(`${rutGon(n.name, 14)}${huyHieu} vào ghe ${ten} · ${moTaQue}`);
    this.ganBenCho(n.name);

    this.evs.push({
      t: 'len',
      name: n.name,
      tinh: ten,
      tinhMoi: tinhMoi && !doiGhe,
      doiGhe,
      daoBienDong: daoInfo?.bienDong ? daoInfo.dao : undefined,
    });

    // Áp dụng ngay Tim & Quà bảo lưu (nếu khách lỡ thả tim / tặng quà trước khi gõ tên tỉnh)
    const pending = this.treo.get(n.id);
    if (pending && now - pending.at < GAME.treoHetHanMs) {
      this.treo.delete(n.id);
      if (pending.tim > 0 && this.phase === 'dua') {
        const met = pending.tim * GAME.metMoiTim * this.heSo(g, now);
        g.m += met;
        g.nhipVong += pending.tim;
        n.nhip += pending.tim;
        n.tongNhipBuoi += pending.tim;
      }
      if (pending.giay > 0) {
        g.tangTocDen = Math.max(g.tangTocDen, now) + pending.giay * 1000;
        this.tickers.unshift(`⚡ Cộng bù tiếp sức của ${rutGon(n.name, 14)} · Ghe ${ten} TĂNG TỐC ${pending.giay}s!`);
        this.evs.push({ t: 'congBu', name: n.name, tinh: ten, giay: pending.giay, tim: pending.tim });
      }
    }

    if (g.cap > capCu) {
      const tenCap = GAME.tenCap[g.cap];
      this.phat({ tieuDe: 'LÊN CẤP!', phu: `${ten} · ${tenCap}`, mau: 'vang' });
      this.tickers.push(`${ten} LÊN CẤP · ${tenCap.toUpperCase()}`);
      this.evs.push({ t: 'lenCap', tinh: ten, cap: tenCap });
    }
  }

  /** Thả tim: người đã lên ghe thì chèo thêm mét; chưa lên ghe thì giữ tạm vào kho chờ */
  tim(id: string, so: number, now = Date.now()) {
    if (so <= 0 || this.phase === 'nghiLive') return;
    const n = this.nguoi.get(id);
    if (!n) {
      const cur = this.treo.get(id) ?? { tim: 0, giay: 0, at: now };
      cur.tim = Math.min(GAME.treoTimMax, cur.tim + so);
      cur.at = now;
      this.treo.set(id, cur);
      if (this.treo.size > 500) this.treo.delete(this.treo.keys().next().value!);
      return;
    }
    this.kichHoatNguoi(n, now);
    const g = this.ghe.get(n.tinh);
    if (!g) return;
    g.hoatDong = now;
    if (this.phase !== 'dua') return;
    const met = so * GAME.metMoiTim * this.heSo(g, now);
    g.m += met;
    g.nhipVong += so;
    n.nhip += so;
    n.tongNhipBuoi += so;
    this.timGanDay.push({ at: now, id, n: so });
    for (const sk of this.suKien) if (sk.loai === 'caChep' && sk.tinh === g.tinh) sk.co += so;
    if (now - (this.hoCheLuc.get(g.tinh) ?? 0) > 2500 && Math.random() < 0.35) {
      this.hoCheLuc.set(g.tinh, now);
      this.hoChe.push({ id: this.seq++, tinh: g.tinh, text: GAME.hoChe[Math.floor(Math.random() * GAME.hoChe.length)], den: now + 1800 });
    }
    if (Math.random() < 0.25 && this.timNguoi.length < 8) {
      this.timNguoi.push({ id: this.seq++, tinh: g.tinh, name: rutGon(n.name, 12), den: now + 1600 });
    }
    this.ganBenCho(n.name);
  }

  /** Tặng quà: ghe người tặng bứt tốc ngay; nếu chưa gõ tỉnh thì bảo lưu số giây tăng tốc */
  qua(p: { id: string; name: string; gift: string; count: number; coins: number }, now = Date.now()) {
    if (this.phase === 'nghiLive') return;
    const n = this.nguoi.get(p.id);
    if (n) this.kichHoatNguoi(n, now);
    const g = n && this.ghe.get(n.tinh);
    const giay = Math.min(GAME.tangTocMaxSec, giayTangToc(p.coins));
    const ten = g ? tenTinh(g.tinh) : null;
    const so = p.count > 1 ? ` ×${p.count}` : '';
    if (g) {
      g.tangTocDen = Math.max(g.tangTocDen, now) + giay * 1000;
      g.hoatDong = now;
      this.tickers.unshift(`${rutGon(p.name, 14)} tặng ${p.gift}${so} · Ghe ${ten} TĂNG TỐC ${giay} giây`);
    } else if (giay > 0) {
      const cur = this.treo.get(p.id) ?? { tim: 0, giay: 0, at: now };
      cur.giay = Math.min(GAME.tangTocMaxSec, cur.giay + giay);
      cur.at = now;
      this.treo.set(p.id, cur);
      this.tickers.unshift(`🎁 Đã giữ +${cur.giay}s tăng tốc cho ${rutGon(p.name, 14)} · Gõ tên tỉnh quê bạn ngay!`);
    }
    if (p.coins >= GAME.quaLonXu) this.quaLon = { id: this.seq++, name: p.name, gift: p.gift, count: p.count, den: now + 3500 };
    this.evs.push({ t: 'qua', name: p.name, tinh: ten, giay, coins: p.coins });
  }

  // ---------- Vòng chạy ----------

  tick(now = Date.now()) {
    const dt = this.lastTick ? Math.min(1, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    if (this.phase === 'nghiLive') return;

    this.lamMoiHang(now);

    if (this.phase === 'dua') this.chayDua(dt, now);
    if (dt > 0) {
      for (const g of this.ghe.values()) {
        const tuc = this.phase === 'dua' ? Math.max(0, g.m - g.mTruoc) / dt : 0;
        g.toc += (tuc - g.toc) * Math.min(1, dt / 2.5);
        g.mTruoc = g.m;
      }
    }
    if (now >= this.endsAt) this.sang(now);

    if (this.banner && now >= this.banner.den) this.banner = null;
    if (!this.banner && this.banners.length) this.banner = { ...this.banners.shift()!, den: now + 2600 };
    if (this.toast && now >= this.toast.den) this.toast = null;
    if (!this.toast && this.toasts.length) {
      if (this.toasts.length > 4) {
        const n = this.toasts.length;
        this.toasts = [{ text: `+${n} TAY CHÈO VỪA LÊN GHE`, tinh: this.toasts[n - 1].tinh }];
      }
      const t = this.toasts.shift()!;
      this.toast = { id: this.seq++, ...t, den: now + 1800 };
    }
    if (this.ticker && now >= this.ticker.den) this.ticker = null;
    if (!this.ticker && this.tickers.length) {
      this.tickers = this.tickers.slice(0, 6);
      this.ticker = { id: this.seq++, text: this.tickers.shift()!, den: now + 3200 };
    }
    this.hoChe = this.hoChe.filter((h) => h.den > now);
    this.timNguoi = this.timNguoi.filter((h) => h.den > now);
    if (this.quaLon && now >= this.quaLon.den) this.quaLon = null;
    this.timGanDay = this.timGanDay.filter((x) => now - x.at < 5000);
  }

  private chayDua(dt: number, now: number) {
    for (const g of this.dangDua(now)) {
      const f = this.heSo(g, now);
      g.m += GAME.troiGiay * dt * f;
      if (g.tangTocDen > now) g.m += GAME.tangTocMet * dt * f;
    }
    this.lamMoiHang(now);
    const xep = this.xep;
    const con = (this.endsAt - now) / 1000;

    const dau = xep[0];
    if (dau && this.dauCu && dau.tinh !== this.dauCu && now - this.startAt > 6000 && now - this.vuotLuc > 6000 && dau.m > 5) {
      this.vuotLuc = now;
      this.phat({ tieuDe: 'VƯỢT!', phu: `${tenTinh(dau.tinh)} lên dẫn đầu`, mau: 'hong' });
      this.evs.push({ t: 'vuot', tinh: tenTinh(dau.tinh) });
    }
    if (dau) this.dauCu = dau.tinh;

    if (xep.length >= 2 && xep[1].m > 30 && xep[0].m - xep[1].m < GAME.daiChienCach && now - this.daiChienLuc > 40_000) {
      this.daiChienLuc = now;
      this.evs.push({ t: 'daiChien', a: tenTinh(xep[0].tinh), b: tenTinh(xep[1].tinh) });
    }

    for (const sk of this.suKien) {
      if (sk.loai === 'caChep' && sk.co >= sk.can) {
        const g = this.ghe.get(sk.tinh);
        if (g) {
          const i = xep.indexOf(g);
          const truoc = i > 0 ? xep[i - 1] : null;
          const nhay = Math.min(GAME.vuMonToiDa, Math.max(30, truoc ? truoc.m - g.m + 12 : 30));
          g.m += nhay;
          g.mTruoc += nhay * 0.7;
          this.phat({ tieuDe: 'VƯỢT VŨ MÔN!', phu: `ghe ${tenTinh(g.tinh)} lao lên`, mau: 'vang' });
          this.evs.push({ t: 'vuMon', tinh: tenTinh(g.tinh) });
        }
        sk.den = 0;
      } else if (sk.loai === 'caChep' && now >= sk.den) {
        const ten = tenTinh(sk.tinh);
        this.phat({ tieuDe: 'CÁ CHÉP LẶN MẤT', phu: `ghe ${ten} còn thiếu ${sk.can - sk.co} tim`, mau: 'trang' });
        this.evs.push({ t: 'caChepTruot', tinh: ten, thieu: sk.can - sk.co });
      }
    }
    this.suKien = this.suKien.filter((sk) => sk.den > now);

    if (now >= this.suKienSau && con > GAME.nuocRutSec + 4) {
      this.moSuKien(now);
      this.suKienSau = now + rand(GAME.suKienSau[0], GAME.suKienSau[1]) * 1000;
    }

    if (!this.daNuocRut && con <= GAME.nuocRutSec) {
      this.daNuocRut = true;
      this.phat({ tieuDe: 'NƯỚC RÚT!', phu: '30 giây cuối · thả tim thật mạnh', mau: 'hong' });
      if (dau) this.evs.push({ t: 'nuocRut', dau: tenTinh(dau.tinh), cach: Math.round(dau.m - (xep[1]?.m ?? 0)) });
    }
    if (this.daNuocRut && now - this.tiepSucLuc > 4500) {
      const dem = new Map<string, number>();
      for (const x of this.timGanDay) if (now - x.at < 4000) dem.set(x.id, (dem.get(x.id) ?? 0) + x.n);
      const best = [...dem.entries()].sort((a, b) => b[1] - a[1])[0];
      const n = best && best[1] >= 3 ? this.nguoi.get(best[0]) : null;
      if (n) {
        this.tiepSucLuc = now;
        this.phat({ tieuDe: rutGon(n.name, 14).toUpperCase(), phu: `tiếp sức nước rút cho ghe ${tenTinh(n.tinh)}`, mau: 'vang' });
        if (now - this.tiepSucNoiLuc > 9000) {
          this.tiepSucNoiLuc = now;
          this.evs.push({ t: 'tiepSuc', name: n.name, tinh: tenTinh(n.tinh) });
        }
      }
    }
  }

  /** Cho phép chủ kênh bấm kích hoạt thử sự kiện ngay trên Dashboard */
  kichHoatSuKien(loai: 'caChep' | 'sucRong' | 'songHep' | 'senNo', now = Date.now()) {
    if (this.phase !== 'dua') return;
    this.lamMoiHang(now);
    const xep = this.xep;
    if (loai === 'caChep' && xep.length >= 1) {
      const g = xep[Math.min(1, xep.length - 1)];
      const can = GAME.caChepTim(g.nguoi);
      this.suKien = this.suKien.filter((s) => s.loai !== 'caChep');
      this.suKien.push({ loai: 'caChep', tinh: g.tinh, can, co: 0, den: now + GAME.caChepGiay * 1000 });
      this.phat({ tieuDe: 'CÁ CHÉP VÀNG!', phu: `ghe ${tenTinh(g.tinh)} · thả tim để VƯỢT VŨ MÔN`, mau: 'vang' });
      this.evs.push({ t: 'caChep', tinh: tenTinh(g.tinh) });
    } else if (loai === 'sucRong' && xep.length >= 1) {
      const g = xep[Math.floor(Math.random() * xep.length)];
      g.sucRongDen = now + GAME.sucRongGiay * 1000;
      this.suKien.push({ loai: 'sucRong', tinh: g.tinh, den: g.sucRongDen });
      this.phat({ tieuDe: 'SỨC RỒNG!', phu: `${tenTinh(g.tinh)} nhanh hơn 20% · ${GAME.sucRongGiay} giây`, mau: 'vang' });
      this.evs.push({ t: 'sucRong', tinh: tenTinh(g.tinh) });
    } else if (loai === 'songHep') {
      this.suKien = this.suKien.filter((s) => s.loai !== 'songHep');
      this.suKien.push({ loai: 'songHep', den: now + GAME.songHepGiay * 1000 });
      this.phat({ tieuDe: 'KHÚC SÔNG HẸP!', phu: 'bờ lấn vào · giữ vị trí, lách qua nào', mau: 'xanh' });
      this.evs.push({ t: 'songHep' });
    } else if (loai === 'senNo') {
      this.suKien = this.suKien.filter((s) => s.loai !== 'senNo');
      this.suKien.push({ loai: 'senNo', den: now + GAME.senNoGiay * 1000 });
      this.phat({ tieuDe: 'MÙA SEN NỞ!', phu: 'sen nở đón đoàn sau · ghe ngoài top 3 chèo được gấp đôi mét', mau: 'vang' });
      this.evs.push({ t: 'senNo' });
    }
  }

  private moSuKien(now: number) {
    const xep = this.xep;
    if (xep.length < 2) return;
    const coGlobal = this.suKien.some((s) => s.loai === 'songHep' || s.loai === 'senNo');
    const coCaChep = this.suKien.some((s) => s.loai === 'caChep');
    const ds: [string, number][] = [];
    if (!coCaChep) ds.push(['caChep', 3]);
    ds.push(['sucRong', 2]);
    if (!coGlobal) ds.push(['songHep', 2]);
    if (!coGlobal && xep.length >= 4) ds.push(['senNo', 2]);
    const loc = ds.filter(([l]) => l !== this.suKienCuoi);
    const chon = boc(loc.length ? loc : ds) as 'caChep' | 'sucRong' | 'songHep' | 'senNo' | undefined;
    if (!chon) return;
    this.suKienCuoi = chon;
    if (chon === 'caChep') {
      const g = xep[1 + Math.floor(Math.random() * Math.min(5, xep.length - 1))];
      const can = GAME.caChepTim(g.nguoi);
      this.suKien.push({ loai: 'caChep', tinh: g.tinh, can, co: 0, den: now + GAME.caChepGiay * 1000 });
      this.phat({ tieuDe: 'CÁ CHÉP VÀNG!', phu: `ghe ${tenTinh(g.tinh)} · thả tim để VƯỢT VŨ MÔN`, mau: 'vang' });
      this.evs.push({ t: 'caChep', tinh: tenTinh(g.tinh) });
    } else if (chon === 'sucRong') {
      const g = xep[1 + Math.floor(Math.random() * (xep.length - 1))];
      g.sucRongDen = now + GAME.sucRongGiay * 1000;
      this.suKien.push({ loai: 'sucRong', tinh: g.tinh, den: g.sucRongDen });
      this.phat({ tieuDe: 'SỨC RỒNG!', phu: `${tenTinh(g.tinh)} nhanh hơn 20% · ${GAME.sucRongGiay} giây`, mau: 'vang' });
      this.evs.push({ t: 'sucRong', tinh: tenTinh(g.tinh) });
    } else if (chon === 'songHep') {
      this.suKien.push({ loai: 'songHep', den: now + GAME.songHepGiay * 1000 });
      this.phat({ tieuDe: 'KHÚC SÔNG HẸP!', phu: 'bờ lấn vào · giữ vị trí, lách qua nào', mau: 'xanh' });
      this.evs.push({ t: 'songHep' });
    } else {
      this.suKien.push({ loai: 'senNo', den: now + GAME.senNoGiay * 1000 });
      this.phat({ tieuDe: 'MÙA SEN NỞ!', phu: 'sen nở đón đoàn sau · ghe ngoài top 3 chèo được gấp đôi mét', mau: 'vang' });
      this.evs.push({ t: 'senNo' });
    }
  }

  private heSo(g: Ghe, now: number) {
    let f = 1 + (GAME.capThuong[g.cap] ?? 0);
    if (g.tinh === this.chang.nha) f *= GAME.sanNha;
    if (g.sucRongDen > now) f *= GAME.sucRongHeSo;
    const hang = this.xep.indexOf(g) + 1;
    if (this.suKien.some((s) => s.loai === 'senNo') && hang > 3) f *= GAME.senNoHeSo;
    if (this.suKien.some((s) => s.loai === 'songHep') && hang === 1) f *= GAME.songHepHeSo;
    return f;
  }

  private sang(now: number) {
    if (this.phase === 'chuyen') return this.batDauDua(now);
    if (this.phase === 'dua') return this.ketThucDua(now);
    if (this.phase === 'ketQua') {
      this.phase = 'sacPhong';
      this.endsAt = now + GAME.sacPhongSec * 1000;
      if (this.sacPhong) {
        const s = this.sacPhong;
        this.evs.push({ t: 'sacPhong', name: s.name, tinh: s.tinh, nhip: s.nhip, danhHieu: s.danhHieu });
      } else {
        this.sang(now);
      }
      return;
    }
    if (this.phase === 'sacPhong') return this.moChonSong(now);
    if (this.phase === 'chonSong') {
      const ds = this.chon?.ds ?? [];
      const max = Math.max(0, ...ds.map((d) => d.phieu));
      const top = ds.filter((d) => d.phieu === max);
      const id = top.length ? top[Math.floor(Math.random() * top.length)].id : CHANG[0].id;
      this.changSau = CHANG_BY_ID.get(id)!;
      this.evs.push({ t: 'chotSong', chang: this.changSau.ten });
      this.chon = null;
      return this.chuyen(now);
    }
  }

  private chuyen(now: number) {
    if (this.changSau) this.chang = this.changSau;
    this.changSau = null;
    this.nghiLiveData = null;
    this.phase = 'chuyen';
    this.vong++;
    this.endsAt = now + GAME.chuyenSec * 1000;
    this.ketQua = null;
    this.sacPhong = null;

    // Lọc tay chèo đã rời phòng (> 6 phút không tương tác) để chống "ghe ma" Cấp 3 ảo
    const tinhCanTinhLai = new Set<string>();
    for (const n of this.nguoi.values()) {
      n.nhip = 0;
      if (n.active && now - n.hoatDong > GAME.nghiNguoiSauMs) {
        n.active = false;
        tinhCanTinhLai.add(n.tinh);
      }
    }
    for (const tid of tinhCanTinhLai) this.capNhatQuanSo(tid);

    for (const g of this.ghe.values()) {
      g.m = 0;
      g.mTruoc = 0;
      g.toc = 0;
      g.nhipVong = 0;
      g.tangTocDen = 0;
      g.sucRongDen = 0;
    }
    this.suKien = [];
    this.banners = [];
    this.banner = null;
    this.dauCu = '';
    this.daNuocRut = false;
    this.changDaDua.set(this.chang.id, this.vong);
    this.evs.push({ t: 'chuyen', chang: this.chang.ten, nha: tenTinh(this.chang.nha) });
  }

  private batDauDua(now: number) {
    this.phase = 'dua';
    this.startAt = now;
    this.endsAt = now + this.duaSec * 1000;
    this.suKienSau = now + 8000;
  }

  private ketThucDua(now: number) {
    this.lamMoiHang(now);
    const top = this.xep.filter((g) => g.m > 0).slice(0, 3);
    if (top[0]) {
      const w = top[0].tinh;
      this.lienTiep = w === this.thangCuoi ? this.lienTiep + 1 : 1;
      this.thangCuoi = w;
      this.bang[w] = (this.bang[w] ?? 0) + 1;
      this.bangTuan[w] = (this.bangTuan[w] ?? 0) + 1;
      this.evs.push({ t: 'thang', tinh: w });
    }
    this.ketQua = {
      top: top.map((g) => ({ tinh: g.tinh, ten: tenTinh(g.tinh), m: Math.round(g.m) })),
      lienTiep: top[0] ? this.lienTiep : 0,
      bang: this.topBang(this.bang),
      bangTuan: this.topBang(this.bangTuan),
    };
    this.evs.push({
      t: 'ketQua',
      top: top.map((g) => ({ tinh: tenTinh(g.tinh), m: Math.round(g.m) })),
      lienTiep: this.ketQua.lienTiep,
    });

    const rowers = [...this.nguoi.values()].filter((n) => n.nhip > 0).sort((a, b) => b.nhip - a.nhip);
    const best = rowers[0];
    if (rowers.length > 0) {
      for (const r of rowers) {
        const cur = this.hoSo[r.id] ?? { tongNhip: 0, sacPhong: 0 };
        this.hoSo[r.id] = {
          tongNhip: cur.tongNhip + r.nhip,
          sacPhong: cur.sacPhong + (best && r.id === best.id ? 1 : 0),
        };
      }
      this.evs.push({
        t: 'luuTayCheo',
        list: rowers.map((r) => ({ id: r.id, name: r.name, tinh: r.tinh, nhip: r.nhip })),
        mvpId: best?.id ?? '',
      });
    }

    this.sacPhong = best
      ? {
          name: best.name,
          avatar: best.avatar,
          tinh: tenTinh(best.tinh),
          nhip: best.nhip,
          danhHieu: danhHieu(best.nhip),
          capTronDoi: capBacTronDoi(this.hoSo[best.id]?.tongNhip ?? best.nhip),
          top: rowers.slice(0, 3).map((n) => ({ name: n.name, tinh: tenTinh(n.tinh), nhip: n.nhip })),
        }
      : null;

    this.phase = 'ketQua';
    this.endsAt = now + GAME.ketQuaSec * 1000;
    this.suKien = [];
  }

  private moChonSong(now: number) {
    this.phase = 'chonSong';
    this.endsAt = now + GAME.chonSongSec * 1000;
    const nghi = (c: Chang) => c.id === this.chang.id || this.vong - (this.changDaDua.get(c.id) ?? -99) < GAME.changNghi;
    const conLai = CHANG.filter((c) => !nghi(c));
    const pool = conLai.length >= 3 ? conLai : CHANG.filter((c) => c.id !== this.chang.id);
    const ds: { id: string; mo: string; phieu: number }[] = [];
    const dong = [...this.ghe.values()].filter((g) => g.nguoi > 0 && now - g.hoatDong < GAME.nghiDuaSauMs).sort((a, b) => b.nguoi - a.nguoi);
    const nhan = ['đông tay chèo nhất', 'đông tay chèo nhì'];
    for (const g of dong) {
      if (ds.length >= 2) break;
      const c = pool.find((x) => x.nha === g.tinh && !ds.some((d) => d.id === x.id));
      if (c) ds.push({ id: c.id, mo: `sân nhà ${tenTinh(c.nha)} · ${nhan[ds.length]}`, phieu: 0 });
    }
    for (const c of tron(pool)) {
      if (ds.length >= 3) break;
      if (!ds.some((d) => d.id === c.id)) ds.push({ id: c.id, mo: `sân nhà ${tenTinh(c.nha)} · chặng mới`, phieu: 0 });
    }
    this.chon = { ds, daBau: new Set() };
    this.evs.push({ t: 'chonSong', ten: ds.map((d) => CHANG_BY_ID.get(d.id)!.goi[0]) });
  }

  // ---------- Lệnh của chủ kênh ----------

  vongMoi(now = Date.now()) {
    this.chuyen(now);
  }

  chonChangNgay(changId: string, now = Date.now()) {
    const c = CHANG_BY_ID.get(changId);
    if (!c) return;
    this.changSau = c;
    this.chuyen(now);
  }

  toiNuocRut(now = Date.now()) {
    if (this.phase === 'dua') this.endsAt = now + (GAME.nuocRutSec + 1) * 1000;
  }

  tatLive(now = Date.now()) {
    // Nếu đang đua dở có ghe đã chạy thì chốt kết quả vòng hiện tại vào bảng vàng trước khi thu quân
    this.lamMoiHang(now);
    if (this.phase === 'dua' && this.xep[0] && this.xep[0].m > 15) {
      const w = this.xep[0].tinh;
      this.bang[w] = (this.bang[w] ?? 0) + 1;
      this.bangTuan[w] = (this.bangTuan[w] ?? 0) + 1;
      this.evs.push({ t: 'thang', tinh: w });
    }
    const bangHomNay = this.topBang(this.bang);
    const bangTuan = this.topBang(this.bangTuan);
    const topTayCheo = [...this.nguoi.values()]
      .filter((n) => n.tongNhipBuoi > 0)
      .sort((a, b) => b.tongNhipBuoi - a.tongNhipBuoi)
      .slice(0, 3)
      .map((n) => ({ name: n.name, tinh: tenTinh(n.tinh), nhip: n.tongNhipBuoi }));

    this.phase = 'nghiLive';
    this.endsAt = Infinity;
    this.suKien = [];
    this.banner = null;
    this.banners = [];
    this.nghiLiveData = {
      vongDaDua: this.vong,
      tongTayCheo: this.nguoi.size,
      bang: bangHomNay,
      bangTuan,
      topTayCheo,
    };
    this.evs.push({ t: 'nghiLive', topTinh: bangHomNay[0]?.ten ?? bangTuan[0]?.ten ?? '' });
  }

  xoaHet(now = Date.now()) {
    this.nguoi.clear();
    this.ghe.clear();
    this.treo.clear();
    this.lan.clear();
    this.benCho = [];
    this.lienTiep = 0;
    this.thangCuoi = '';
    this.chuyen(now);
  }

  // ---------- Tiện ích ----------

  private phat(b: Omit<Banner, 'id'>) {
    this.banners.push({ id: this.seq++, ...b });
    if (this.banners.length > 4) this.banners.shift();
  }

  private ganBenCho(name: string) {
    const n = rutGon(name, 12);
    this.benCho = [n, ...this.benCho.filter((x) => x !== n)].slice(0, 5);
  }

  private dangDua(now: number) {
    return [...this.ghe.values()].filter((g) => g.nguoi > 0 && now - g.hoatDong < GAME.nghiDuaSauMs);
  }

  private lamMoiHang(now: number) {
    this.xep = this.dangDua(now).sort((a, b) => b.m - a.m || b.nguoi - a.nguoi);
    const top = new Set(this.xep.slice(0, GAME.soLan).map((g) => g.tinh));
    for (const t of [...this.lan.keys()]) if (!top.has(t)) this.lan.delete(t);
    const dung = new Set(this.lan.values());
    for (const t of top) {
      if (this.lan.has(t)) continue;
      const l = LAN_UU_TIEN.find((x) => !dung.has(x))!;
      this.lan.set(t, l);
      dung.add(l);
    }
  }

  private topBang(src: Record<string, number>) {
    return Object.entries(src)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, n]) => ({ ten: tenTinh(t), n }));
  }

  view(now = Date.now()): View {
    const xep = this.xep;
    const dau = xep[0];
    const con = this.phase === 'nghiLive' ? 0 : Math.max(0, Math.ceil((this.endsAt - now) / 1000));
    const nghi =
      this.phase === 'ketQua' ? con + GAME.sacPhongSec + GAME.chonSongSec
      : this.phase === 'sacPhong' ? con + GAME.chonSongSec
      : con;
    const nuocRut = this.phase === 'dua' && con <= GAME.nuocRutSec;
    const tocTB = xep.length ? Math.round((xep.reduce((t, g) => t + g.toc, 0) / xep.length) * 10) / 10 : 0;
    const ghe: GheView[] = xep.map((g, i) => {
      const ck = this.suKien.find((s) => s.loai === 'caChep' && s.tinh === g.tinh) as Extract<SuKien, { loai: 'caChep' }> | undefined;
      return {
        tinh: g.tinh,
        ten: tenTinh(g.tinh),
        ngan: TINH_BY_ID.get(g.tinh)?.ngan ?? '',
        m: Math.round(g.m * 10) / 10,
        hang: i + 1,
        cap: g.cap,
        so: g.nguoi,
        lan: this.lan.get(g.tinh) ?? -1,
        toc: Math.round(g.toc * 10) / 10,
        tocTB,
        tangToc: g.tangTocDen > now,
        sucRong: g.sucRongDen > now,
        sanNha: g.tinh === this.chang.nha,
        caChep: ck ? { can: ck.can, co: Math.min(ck.can, ck.co), con: Math.max(0, Math.ceil((ck.den - now) / 1000)) } : null,
      };
    });
    const pills: string[] = [];
    for (const s of this.suKien) {
      const c = Math.max(0, Math.ceil((s.den - now) / 1000));
      if (s.loai === 'senNo') pills.push(`MÙA SEN NỞ · ngoài top 3 ×2 · còn ${c}s`);
      if (s.loai === 'songHep') pills.push(`KHÚC SÔNG HẸP · ghe đầu chậm lại · còn ${c}s`);
      if (s.loai === 'sucRong') pills.push(`SỨC RỒNG · ${tenTinh(s.tinh)} +20% · còn ${c}s`);
    }
    const thu7 = xep[GAME.soLan];
    const thu6 = xep[GAME.soLan - 1];
    const daiChien =
      this.phase === 'dua' && xep.length >= 2 && xep[1].m > 30 && xep[0].m - xep[1].m < GAME.daiChienCach * 1.6
        ? { a: tenTinh(xep[0].tinh), b: tenTinh(xep[1].tinh), ma: Math.round(xep[0].m), mb: Math.round(xep[1].m) }
        : null;
    const songTen = (d: { id: string }) => CHANG_BY_ID.get(d.id)!;
    return {
      phase: this.phase,
      vong: this.vong,
      con: this.phase === 'dua' || this.phase === 'chuyen' ? con : nghi,
      nuocRut,
      chang: { id: this.chang.id, ten: this.chang.ten, sao: this.chang.sao, nha: tenTinh(this.chang.nha) },
      ghe,
      soDangDua: xep.length,
      dauCach: dau ? Math.round(dau.m - (xep[1]?.m ?? 0)) : 0,
      conLenSong: thu7 && thu6 ? Math.max(1, Math.round(thu6.m - thu7.m)) : 0,
      banner: this.banner ? { id: this.banner.id, tieuDe: this.banner.tieuDe, phu: this.banner.phu, mau: this.banner.mau } : null,
      pills,
      toast: this.toast ? { id: this.toast.id, text: this.toast.text, tinh: this.toast.tinh, phu: this.toast.phu } : null,
      ticker: this.ticker ? { id: this.ticker.id, text: this.ticker.text } : null,
      benCho: this.benCho,
      hoChe: this.hoChe.map(({ id, tinh, text }) => ({ id, tinh, text })),
      timNguoi: this.timNguoi.map(({ id, tinh, name }) => ({ id, tinh, name })),
      daiChien,
      dauBox: nuocRut && dau && xep[1] ? { tinh: tenTinh(dau.tinh), cach: Math.round(dau.m - xep[1].m), duoi: tenTinh(xep[1].tinh) } : null,
      ketQua: this.phase === 'ketQua' ? this.ketQua : null,
      sacPhong: this.phase === 'sacPhong' ? this.sacPhong : null,
      chonSong:
        this.phase === 'chonSong' && this.chon
          ? { ds: this.chon.ds.map((d) => ({ ...d, ten: songTen(d).ten, goi: songTen(d).goi[0] })), con }
          : null,
      nghiLive: this.phase === 'nghiLive' ? this.nghiLiveData : null,
      quaLon: this.quaLon ? { id: this.quaLon.id, name: this.quaLon.name, gift: this.quaLon.gift, count: this.quaLon.count } : null,
      songHep: this.suKien.some((s) => s.loai === 'songHep'),
      senNo: this.suKien.some((s) => s.loai === 'senNo'),
    };
  }
}

export function rutGon(s: string, n: number) {
  const a = [...s.trim()];
  return a.length > n ? `${a.slice(0, n - 1).join('')}…` : a.join('');
}

function boc(ds: [string, number][]) {
  const tong = ds.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * tong;
  for (const [l, w] of ds) if ((r -= w) < 0) return l;
  return ds[0]?.[0];
}

function tron<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
