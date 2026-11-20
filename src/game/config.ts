/**
 * Cấu hình số liệu, cấp bậc Thủy Thủ Trọn Đời và kho lời bình luận sôi động của Ghe Ngo 34 Tỉnh (LIVE-DUAGHE).
 */
type F1 = (a: string) => string;
type F2 = (a: string, b: string) => string;
type F3 = (a: string, b: string, c: string) => string;

export const GAME = {
  tieuDeMacDinh: 'ĐUA GHE',
  tieuDePhu: 'VIỆT NAM',
  defaultChannelName: 'Đua Ghe Việt Nam',

  // ---------- Nhịp một vòng (giây) ----------
  chuyenSec: 4,
  duaSec: 150, // mặc định 2p30s (chỉnh nóng được trên Dashboard từ 60s -> 360s)
  nuocRutSec: 30,
  ketQuaSec: 9,
  sacPhongSec: 6,
  chonSongSec: 10,
  changNghi: 4,

  // ---------- Chèo, Hò reo & Quản lý đội ghe ----------
  metMoiTim: 1, // 1 tim = 1 mét
  metMoiHo: 3, // đã lên ghe mà gõ cổ vũ thêm: +3m (mỗi người tối đa 1 lần / 8 giây)
  hoCooldownMs: 8_000,
  troiGiay: 0.6,
  sanNha: 1.1, // ghe sân nhà +10%
  capThuong: [0, 0.05, 0.1, 0.15],
  capNguoi: [0, 5, 15, 30],
  tenCap: ['Thuyền Đua', 'Ghe Rồng', 'Ghe Rồng Hào Quang', 'Rồng Vàng'],
  nghiDuaSauMs: 5 * 60_000, // cả ghe ngưng tương tác quá 5 phút thì tạm cập bến
  nghiNguoiSauMs: 6 * 60_000, // tay chèo im lặng > 6 phút (~2 vòng) sẽ tạm nghỉ đầu vòng mới để chống "ghe ma"
  doiGheSauMs: 45_000, // gõ tỉnh khác sau 45 giây được phép chuyển ghe quê
  treoTimMax: 150, // giữ tối đa 150 tim cho người chưa kịp gõ tên tỉnh
  treoHetHanMs: 10 * 60_000,
  soLan: 6,
  soDuoi: 8,

  // ---------- Quà: ghe tăng tốc ----------
  tangTocGiay: [
    [1, 2],
    [5, 3],
    [10, 4],
    [30, 6],
    [99, 9],
    [299, 15],
    [999, 25],
    [4999, 40],
  ] as [number, number][],
  tangTocMaxSec: 60,
  tangTocMet: 8,
  quaLonXu: 99,

  // ---------- Sự kiện ngẫu nhiên giữa vòng ----------
  suKienSau: [9, 14] as [number, number],
  caChepGiay: 10,
  caChepTim: (soNguoi: number) => Math.min(80, 12 + soNguoi * 3),
  vuMonToiDa: 140,
  sucRongGiay: 20,
  sucRongHeSo: 1.2,
  songHepGiay: 12,
  songHepHeSo: 0.8,
  senNoGiay: 10,
  senNoHeSo: 2,
  daiChienCach: 25,

  // ---------- Danh hiệu trong vòng & Cấp bậc Thủy Thủ Trọn Đời ----------
  danhHieu: [
    [0, 'Tay chèo mới'],
    [50, 'Tay chèo cứng'],
    [150, 'Tay chèo thép'],
    [400, 'Tay chèo huyền thoại'],
  ] as [number, string][],

  capTronDoi: [
    [0, '⚓ Cấp 1 · Tân Binh'],
    [200, '🚣 Cấp 2 · Thủy Thủ Cứng'],
    [800, '🔱 Cấp 3 · Kiện Tướng'],
    [2500, '🐉 Cấp 4 · Đô Đốc Ghe Rồng'],
    [7000, '👑 Cấp 5 · Thủy Thần'],
  ] as [number, string][],

  // ---------- Khẩu hiệu đầu trang ----------
  khauHieu: [
    () => 'Gõ tên tỉnh để hạ thủy ghe quê bạn',
    () => 'Gõ Hoàng Sa, Trường Sa, Phú Quốc đều lên đúng ghe!',
    (dau: string) => (dau ? `${dau} đang dẫn đầu · Quê bạn hạng mấy?` : 'Ghe quê bạn đâu rồi?'),
    (_dau: string, so: number) => `${so} tỉnh đang đua · còn ${34 - so} tỉnh chưa hạ thủy!`,
  ],
  hoChe: ['Hò dô!', 'Tới luôn!', 'Chèo mạnh!', 'Lẹ tay nghen!', 'Cố lên quê ơi!', 'Bứt tốc!', 'Vượt mặt luôn!', 'Hò dô ta!'],

  // ---------- Lời chào & cảm ơn ----------
  greetEveryMs: 20_000,
  namesPerGreeting: 3,
  greeting: (names: string, channel = 'Đua Ghe Việt Nam') =>
    `Chào mừng ${names} đến với ${channel}! Gõ tên tỉnh quê mình để xuống ghe chèo nha!`,
  giftThanksCooldownMs: 18_000,
  bigGiftCoins: 99,
  shareReminderEveryMs: 5 * 60_000,
  thankFollow: (name: string, channel = 'Đua Ghe Việt Nam') =>
    `Cảm ơn ${name} đã theo dõi ${channel}! Gõ tên tỉnh rồi thả tim chèo phụ bà con nha!`,
  shareLines: [
    'Chia sẻ phiên live cho hội đồng hương vô chèo phụ, ghe đông là hóa Rồng Vàng liền bà con ơi!',
    'Bấm theo dõi kênh và rủ thêm anh em cùng quê vô cứu ghe tỉnh mình nha!',
  ],

  loi: {
    chuyen: [
      (chang: string) => `Vòng đua mới tại ${chang}! Các đội ghe vào vạch xuất phát!`,
      (chang: string) => `Tiếng trống đã điểm trên ${chang}! Bà con ba mươi bốn tỉnh chuẩn bị mái dầm!`,
      (chang: string) => `Hạ thủy chặng ${chang}! Ba, hai, một, nổi trống chèo!`,
    ] as F1[],
    sanNha: [
      (tinh: string) => `Đây là khúc sông sân nhà của ${tinh}, đội ${tinh} được cộng mười phần trăm tốc độ!`,
      (tinh: string) => `Sân nhà của ${tinh}! Bà con ${tinh} đừng để đội khách qua mặt trên sông quê mình nha!`,
    ] as F1[],
    len: [
      (ten: string, tinh: string) => `${ten} đã xuống ghe ${tinh}!`,
      (ten: string, tinh: string) => `Đội ${tinh} đón thêm tay chèo ${ten}!`,
      (ten: string, tinh: string) => `${ten} gia nhập ghe ${tinh}, bấm thả tim liên tục để chèo nha!`,
    ] as F2[],
    doiGhe: [
      (ten: string, tinh: string) => `${ten} vừa chuyển sang đầu quân cho ghe ${tinh}!`,
    ] as F2[],
    bienDong: [
      (dao: string, tinh: string) => `Tự hào ${dao} thân yêu của Tổ quốc! Thêm một tay chèo tiếp lửa cho ghe ${tinh}!`,
    ] as F2[],
    tinhMoi: [
      (tinh: string) => `Ghe ${tinh} chính thức hạ thủy! Hội đồng hương ${tinh} đâu hết rồi, vô thả tim kéo ghe lên!`,
      (tinh: string) => `${tinh} đã nhập cuộc! Thêm một chiến thuyền lao vào đường đua!`,
    ] as F1[],
    lenCap: [
      (tinh: string, cap: string) => `Quá dữ! Ghe ${tinh} đông quân quá, tiến hóa thành ${cap}!`,
      (tinh: string, cap: string) => `Đội ${tinh} chính thức thăng cấp ${cap}, mái chèo mạnh hơn hẳn!`,
    ] as F2[],
    caChep: [
      (tinh: string) => `Cá chép vàng vừa trồi lên cạnh ghe ${tinh}! Thả tim dồn dập mười giây để hóa rồng vượt vũ môn!`,
      (tinh: string) => `Cơ hội vàng cho ${tinh}! Cá chép tới rồi, bà con ${tinh} bấm tim lẹ tay lên!`,
    ] as F1[],
    vuMon: [
      (tinh: string) => `Cá chép hóa rồng! Ghe ${tinh} vượt vũ môn phóng thẳng lên trước!`,
      (tinh: string) => `Vượt vũ môn thành công! Chiến thuyền ${tinh} bay lên như vũ bão!`,
    ] as F1[],
    caChepTruot: [(tinh: string) => `Tiếc đứt ruột! Thiếu vài nhịp tim nữa thôi, cá chép cạnh ghe ${tinh} lặn mất rồi!`] as F1[],
    sucRong: [(tinh: string) => `Sức rồng nhập thể! Ghe ${tinh} tăng hai mươi phần trăm tốc độ suốt hai mươi giây!`] as F1[],
    songHep: [
      'Khúc sông hẹp! Hai bên bờ lấn sát vào rồi, ghe dẫn đầu coi chừng vướng nước xoáy!',
      'Vào eo sông hẹp! Ghe đầu bị ghìm tốc độ, thời cơ vàng cho đoàn sau bứt lên!',
    ],
    senNo: [
      'Mùa sen nở rộ! Các ghe ngoài tốp ba được nhân đôi sức chèo, thả tim lật kèo ngay bà con ơi!',
      'Hương sen tiếp sức! Mọi nhịp tim của đoàn bám đuổi lúc này đều tính gấp đôi mét!',
    ],
    vuot: [
      (tinh: string) => `Đổi ngôi đầu! Chiến thuyền ${tinh} vừa vượt mặt vươn lên hạng nhất!`,
      (tinh: string) => `Quá kịch tính! ${tinh} chèo cực sung, cướp luôn ngôi đầu bảng rồi!`,
    ] as F1[],
    daiChien: [
      (a: string, b: string) => `Đại chiến rực lửa giữa ${a} và ${b}! Hai mũi ghe đang kè nhau từng mét nước!`,
      (a: string, b: string) => `${a} với ${b} đang so kè sát nút, bên nào mỏi tay trước là mất ngôi đầu!`,
    ] as F2[],
    nuocRut: [
      (dau: string, cach: string) => `Trống dồn nước rút! Ba mươi giây cuối cùng! ${dau} đang hơn ${cach} mét, dốc toàn lực thả tim nào!`,
      (dau: string, cach: string) => `Vào khúc nước rút quyết định! ${dau} dẫn trước ${cach} mét, các tỉnh phía sau còn lật kèo kịp!`,
    ] as F2[],
    tiepSuc: [(ten: string, tinh: string) => `Tay chèo ${ten} đang quạt mái dầm điên cuồng tiếp sức cho ${tinh}!`] as F2[],
    ketQua: [
      (tinh: string, met: string) => `Cán đích hạng nhất! Chúc mừng đội ghe ${tinh} chiến thắng oanh liệt với ${met} mét!`,
      (tinh: string, met: string) => `Quán quân vòng này gọi tên ${tinh} với thành tích ${met} mét! Quá xuất sắc!`,
    ] as F2[],
    lienTiep: (tinh: string, n: number) => `${tinh} đã vô địch ${n} vòng liên tiếp, độc chiếm ngôi vương sông nước! Tỉnh nào đủ sức lật đổ đây?`,
    khongAi: 'Vòng vừa rồi mặt sông còn vắng, bà con gõ tên tỉnh quê mình để hạ thủy đua vòng mới nha!',
    sacPhong: (ten: string, tinh: string, nhip: number, danhHieu: string) =>
      `Chiếu sắc phong tay chèo xuất sắc nhất vòng gọi tên ${ten} của đội ${tinh}, đóng góp ${nhip} nhịp chèo, đạt danh hiệu ${danhHieu}!`,
    chonSong: (a: string, b: string, c: string) => `Bình chọn khúc sông vòng tiếp theo! Bà con gõ ${a}, ${b}, hoặc ${c} vào khung bình luận nha!`,
    chotSong: (chang: string) => `Đã chốt! Vòng tiếp theo đại chiến trên ${chang}!`,
    binh: {
      dan: [
        (dau: string, cach: string) => `Đội ${dau} vẫn đang giữ nhịp đầu đoàn, bỏ cách phía sau ${cach} mét!`,
        (dau: string, cach: string) => `Mũi ghe ${dau} đang rẽ sóng dẫn trước ${cach} mét!`,
      ] as F2[],
      sat: [(a: string, b: string) => `${b} đang phả hơi nóng ngay sau lưng ${a}, khoảng cách chỉ còn tính bằng gang tấc!`] as F2[],
      moi: [
        (con: string) => `Trên bến vẫn còn ${con} tỉnh chưa hạ thủy. Quê bạn ở đâu? Gõ tên tỉnh một lần là có ghe đua ngay!`,
        () => 'Gõ tên tỉnh quê mình một lần để lên ghe, rồi bấm thả tim màn hình là ghe lao vút đi!',
        () => 'Gõ tên tỉnh cũ hay tên đảo như Phú Quốc, Côn Đảo, Hoàng Sa, Trường Sa đều vào đúng đội quê nhà nha!',
      ] as F1[],
      cuoi: [(tinh: string) => `Ghe ${tinh} đang tụt lại cuối đoàn rồi, đồng hương ${tinh} ơi thả tim giải cứu ghe quê mình lẹ lên!`] as F1[],
    },
    camQua: [
      (ten: string, tinh: string, giay: string) => `Cảm ơn ${ten} tiếp lửa! Ghe ${tinh} bật chế độ tên lửa bứt tốc suốt ${giay} giây!`,
      (ten: string, tinh: string, giay: string) => `Quá tuyệt vời ${ten} ơi! Chiến thuyền ${tinh} rẽ sóng lao vút thêm ${giay} giây!`,
    ] as F3[],
    camQuaChuaGhe: (ten: string, giay: string) =>
      `Cảm ơn ${ten} rất nhiều! Đã giữ sẵn ${giay} giây tăng tốc cho bạn, gõ ngay tên tỉnh quê mình để đẩy ghe nha!`,
    congBu: (ten: string, tinh: string, giay: string) =>
      `Kích hoạt tiếp sức bảo lưu của ${ten}! Ghe ${tinh} bứt tốc ngay ${giay} giây!`,
    nghiLive: (channel = 'Đua Ghe Việt Nam', topTinh: string) =>
      `Phiên live ${channel} xin phép thu quân tạm nghỉ tại đây! Cảm ơn bà con ba mươi bốn tỉnh thành đã chèo hết mình${topTinh ? `, đặc biệt chúc mừng đội dẫn đầu bảng vàng ${topTinh}` : ''}! Nhớ bấm Theo Dõi kênh và bật chuông thông báo để ca live sau vào giữ ngôi vương cho quê mình nha! Chúc bà con ngủ ngon và hẹn gặp lại!`,
  },
};

export const capCua = (soNguoi: number) => {
  let cap = 0;
  GAME.capNguoi.forEach((n, i) => soNguoi >= n && (cap = i));
  return cap;
};

export const giayTangToc = (xu: number) => {
  let s = 0;
  for (const [x, g] of GAME.tangTocGiay) if (xu >= x) s = g;
  return s;
};

export const danhHieu = (nhip: number) => {
  let d = GAME.danhHieu[0][1];
  for (const [n, t] of GAME.danhHieu) if (nhip >= n) d = t;
  return d;
};

export const capBacTronDoi = (tongNhip: number) => {
  let d = GAME.capTronDoi[0][1];
  for (const [n, t] of GAME.capTronDoi) if (tongNhip >= n) d = t;
  return d;
};
