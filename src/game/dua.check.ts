/** Kiểm tra tự động toàn bộ lõi luật chơi & nâng cấp: npx tsx src/game/dua.check.ts */
import { DuaGhe } from './dua';
import { GAME } from './config';
import { CHANG } from './chang';
import { timTinh, TINH, SO_TINH } from './tinh';
import { isRudeName } from '../live/bannedWords';
import { safeDisplayName, speakableName } from '../live/names';

let loi = 0;
const ok = (dk: boolean, mo: string) => {
  if (!dk) {
    loi++;
    console.log('✗', mo);
  } else console.log('✓', mo);
};

// ---------- 1. Nhận diện 34 tỉnh, đảo tiền tiêu & chống bắt nhầm dấu ----------
ok(SO_TINH === 34, 'Đủ 34 tỉnh thành sau sắp xếp');
ok(new Set(TINH.map((t) => t.ngan)).size === 34, '34 mã cờ đuôi ghe không trùng');
ok(CHANG.length >= 22, `Mở rộng ${CHANG.length} chặng sông khắp Bắc - Trung - Nam`);

const cases: [string, string | null][] = [
  ['cần thơ', 'can-tho'],
  ['CẦN THƠ ƠI', 'can-tho'],
  ['ct', 'can-tho'],
  ['ghe Bến Tre đâu', 'vinh-long'],
  ['sài gòn', 'hcm'],
  ['tp.hcm', 'hcm'],
  ['TPHCM', 'hcm'],
  ['hcm', 'hcm'],
  ['ha noi', 'ha-noi'],
  ['Huế', 'hue'],
  ['chào chị Huệ nha', null], // Xét dấu trước: "Huệ" KHÔNG bị bắt nhầm thành "Huế"
  ['sơn là đẹp lắm', null], // Không bắt nhầm thành "Sơn La"
  ['Hoàng Sa thân yêu', 'da-nang'], // Đảo tiền tiêu Tổ quốc
  ['Quần đảo Trường Sa', 'khanh-hoa'],
  ['Phú Quốc ơi', 'an-giang'],
  ['Côn Đảo cố lên', 'hcm'],
  ['Lý Sơn', 'quang-ngai'],
  ['Đồng Tháp', 'dong-thap'],
  ['dong nai', 'dong-nai'],
  ['đắk lắk', 'dak-lak'],
  ['Kiên Giang', 'an-giang'],
  ['bình dương', 'hcm'],
  ['quảng nam', 'da-nang'],
  ['ct ơi vô', null],
  ['live hay quá', null],
];
for (const [c, id] of cases) ok(timTinh(c) === id, `"${c}" -> ${id} (được ${timTinh(c)})`);

// ---------- 2. Bộ lọc chống tên tục lách luật TikTok ----------
ok(isRudeName('đ.ị.t_mẹ') && isRudeName('l0n_to') && isRudeName('djtme123'), 'Chặn triệt để tên tục lách chữ (l0n, đ.ị.t, djtme)');
ok(!isRudeName('Minh Tuấn') && !isRudeName('Bé Na 🌸') && !isRudeName('Hoàng Long'), 'Không chặn nhầm tên người xem bình thường');
ok(speakableName('djt.me.99') === 'bạn' && safeDisplayName('l0n_xinh', 'djt123') === 'Tay chèo', 'Đổi tên nhạy cảm về tên an toàn');

// ---------- 3. Một vòng đua, bảo lưu quà/tim & đổi quê sau 45s ----------
let now = 1_000_000;
const g = new DuaGhe(now);
ok(g.phase === 'chuyen' && g.vong === 1, 'Mở màn giới thiệu chặng, vòng 1');
now += GAME.chuyenSec * 1000 + 10;
g.tick(now);
ok(g.phase === 'dua', 'Hết giới thiệu thì vào đua');

g.chat({ id: 'a', name: 'An', comment: 'cần thơ' }, now);
g.chat({ id: 'b', name: 'Bình', comment: 'an giang' }, now);
g.chat({ id: 'c', name: 'Chi', comment: 'Cần Thơ' }, now);
g.chat({ id: 'a', name: 'An', comment: 'an giang' }, now); // chưa đủ 45s: không đổi ghe
ok(g.ghe.get('can-tho')!.nguoi === 2 && g.ghe.get('an-giang')!.nguoi === 1, 'Gõ tỉnh liên tiếp dưới 45s giữ nguyên ghe');

// Sau 46 giây: người xem muốn đổi lại quê thật thì đổi được
g.chat({ id: 'c', name: 'Chi', comment: 'hà nội' }, now + 46_000);
ok(g.ghe.get('can-tho')!.nguoi === 1 && g.ghe.get('ha-noi')!.nguoi === 1, 'Sau 45s cho phép chuyển sang ghe quê thật');

// Khách chưa lên ghe thả tim + tặng quà: chưa tạo ghe ngay, nhưng gõ quê sau được cộng bù đủ!
g.tim('khach_moi', 40, now);
g.qua({ id: 'khach_moi', name: 'Khách VIP', gift: 'Bó hoa', count: 1, coins: 30 }, now);
ok(!g.ghe.has('dong-thap'), 'Người chưa lên ghe thả tim/quà chưa tự sinh ghe ma');
g.chat({ id: 'khach_moi', name: 'Khách VIP', comment: 'Đồng Tháp' }, now + 1000);
ok(
  g.ghe.get('dong-thap')!.m >= 40 && g.ghe.get('dong-thap')!.tangTocDen > now + 1000,
  'Khách gõ tên tỉnh sau được cộng bù đủ 40 tim + giây tăng tốc quà bảo lưu',
);

// Thả tim + quà đẩy ghe
g.tim('a', 60, now + 1500);
g.tim('b', 10, now + 1500);
const truoc = g.ghe.get('an-giang')!.m;
g.qua({ id: 'b', name: 'Bình', gift: 'Rose', count: 1, coins: 5 }, now + 1500);
for (let i = 1; i <= 8; i++) g.tick(now + 1500 + i * 250);
ok(g.ghe.get('an-giang')!.m - truoc > GAME.tangTocMet * 1.5, 'Quà làm ghe bứt tốc mạnh');

// Lên cấp ghe
for (let i = 0; i < 6; i++) g.chat({ id: `x${i}`, name: `X${i}`, comment: 'cà mau' }, now + 3500);
ok(g.ghe.get('ca-mau')!.cap === 1, 'Đủ 5 người lên cấp Ghe Rồng');

// Chạy hết vòng -> Kết quả -> Sắc phong (kèm cấp trọn đời) -> Chọn sông -> Vòng 2
now += 4000;
const evs: string[] = [];
while (g.phase === 'dua') {
  now += 250;
  if (Math.random() < 0.3) g.tim(['a', 'b', 'x1'][Math.floor(Math.random() * 3)], 5, now);
  g.tick(now);
  evs.push(...g.lay().map((e) => e.t));
}
ok(evs.includes('nuocRut'), 'Có giai đoạn Nước rút');
ok(['caChep', 'sucRong', 'songHep', 'senNo'].some((t) => evs.includes(t)), 'Có sự kiện ngẫu nhiên giữa vòng');
ok(g.phase === 'ketQua' && evs.includes('ketQua') && evs.includes('thang') && evs.includes('luuTayCheo'), 'Hết giờ chốt kết quả, bảng vàng & lưu tay chèo');

now += GAME.ketQuaSec * 1000 + 10;
g.tick(now);
ok(g.phase === 'sacPhong' && !!g.view(now).sacPhong?.capTronDoi, 'Sắc phong hiển thị cả Cấp bậc Thủy Thủ Trọn Đời');

now += GAME.sacPhongSec * 1000 + 10;
g.tick(now);
ok(g.phase === 'chonSong', 'Mở bầu chọn sông vòng sau');
const ds = g.view(now).chonSong!.ds;
ok(ds.length === 3 && ds.every((d) => d.id !== g.chang.id), '3 sông ứng cử không trùng sông vừa đua');
g.chat({ id: 'a', name: 'An', comment: ds[2].goi }, now);
ok(g.view(now).chonSong!.ds[2].phieu === 1, 'Gõ tên sông tính phiếu bầu');

// ---------- 4. Chống "Ghe ma" khi tay chèo rời phòng quá 6 phút ----------
now += 7 * 60_000; // Tua 7 phút không ai ở đội Cà Mau tương tác
g.vongMoi(now);
ok(g.ghe.get('ca-mau')!.nguoi === 0 && g.ghe.get('ca-mau')!.cap === 0, 'Tay chèo treo máy > 6 phút tự động tạm nghỉ, xóa biên chế ghe ma');
g.tim('x0', 5, now + 5000); // x0 quay lại thả tim -> tự vào lại ghe Cà Mau không cần gõ lại tỉnh!
ok(g.ghe.get('ca-mau')!.nguoi === 1, 'Tay chèo cũ thả tim tự kích hoạt lại vào ghe quê');

// ---------- 5. Chế độ Lễ Thu Quân Hạ Thủy (Tắt Live chào tạm biệt) ----------
g.tatLive(now + 6000);
ok(g.phase === 'nghiLive' && !!g.view(now + 6000).nghiLive, 'Chế độ Lễ Thu Quân Hạ Thủy hoạt động chuẩn');

console.log(loi ? `\n${loi} lỗi` : '\n✅ Tất cả bài kiểm thử đều ĐẠT 100%!');
process.exit(loi ? 1 : 0);
