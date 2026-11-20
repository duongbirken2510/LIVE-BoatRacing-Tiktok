/**
 * 34 tỉnh, thành (sau sắp xếp 2025). Người xem gõ tên tỉnh, thành phố trực thuộc, tỉnh cũ trước sáp nhập
 * hoặc tên đảo (Phú Quốc, Côn Đảo, Cát Bà, Lý Sơn, Hoàng Sa, Trường Sa...) đều lên đúng ghe quê hương.
 *
 * Nâng cấp: xét dấu tiếng Việt TRƯỚC khi bỏ dấu ("chị Huệ" không bắt nhầm thành "Huế", "sơn là" không nhầm "Sơn La").
 */
export interface Tinh {
  id: string;
  ten: string;
  ngan: string; // chữ trên cờ đuôi ghe (34 mã duy nhất)
  chao: string;
  ten2?: string[];
  cu?: string[];
  dao?: string[]; // đảo biển / quần đảo thuộc tỉnh
  tat?: string[];
}

export const TINH: Tinh[] = [
  { id: 'ha-noi', ten: 'Hà Nội', ngan: 'HN', chao: 'Thủ đô ngàn năm văn hiến', ten2: ['hanoi', 'thu do', 'ho guom', 'thang long'], tat: ['hn', 'td'] },
  { id: 'hue', ten: 'Huế', ngan: 'HU', chao: 'Cố đô, sông Hương núi Ngự', ten2: ['thua thien hue', 'tp hue', 'co do hue'], tat: ['tth'] },
  { id: 'hai-phong', ten: 'Hải Phòng', ngan: 'HP', chao: 'Thành phố hoa phượng đỏ', ten2: ['haiphong', 'do son'], cu: ['Hải Dương'], dao: ['Cát Bà', 'Bạch Long Vĩ'], tat: ['hp', 'hd'] },
  { id: 'da-nang', ten: 'Đà Nẵng', ngan: 'ĐN', chao: 'Cầu Rồng, sông Hàn', ten2: ['danang', 'tam ky'], cu: ['Quảng Nam', 'Hội An'], dao: ['Hoàng Sa', 'Quần đảo Hoàng Sa', 'Cù Lao Chàm'], tat: ['dng', 'qnam'] },
  { id: 'hcm', ten: 'TP.HCM', ngan: 'SG', chao: 'Sài Gòn, hòn ngọc Viễn Đông', ten2: ['tp hcm', 'tphcm', 'ho chi minh', 'sai gon', 'saigon', 'thanh pho ho chi minh', 'thu duc'], cu: ['Bình Dương', 'Bà Rịa Vũng Tàu', 'Vũng Tàu', 'Bà Rịa'], dao: ['Côn Đảo', 'Côn Sơn'], tat: ['hcm', 'sg', 'brvt', 'bd'] },
  { id: 'can-tho', ten: 'Cần Thơ', ngan: 'CT', chao: 'Tây Đô, chợ nổi Cái Răng', ten2: ['cantho', 'tay do'], cu: ['Sóc Trăng', 'Hậu Giang', 'Ngã Bảy'], tat: ['ct', 'st', 'hg'] },
  { id: 'lai-chau', ten: 'Lai Châu', ngan: 'LC', chao: 'Cao nguyên Sìn Hồ mây trắng', ten2: ['laichau', 'sin ho'] },
  { id: 'dien-bien', ten: 'Điện Biên', ngan: 'ĐB', chao: 'Chiến thắng Điện Biên Phủ lừng lẫy', ten2: ['dienbien', 'dien bien phu'] },
  { id: 'son-la', ten: 'Sơn La', ngan: 'SL', chao: 'Cao nguyên Mộc Châu', ten2: ['sonla', 'moc chau'] },
  { id: 'lang-son', ten: 'Lạng Sơn', ngan: 'LS', chao: 'Xứ Lạng, phố Kỳ Lừa', ten2: ['langson', 'xu lang', 'mau son'] },
  { id: 'quang-ninh', ten: 'Quảng Ninh', ngan: 'QN', chao: 'Vịnh Hạ Long kỳ quan', ten2: ['quangninh', 'ha long', 'cam pha', 'mong cai', 'uong bi', 'van don'], dao: ['Cô Tô', 'Quan Lạn'], tat: ['qn'] },
  { id: 'thanh-hoa', ten: 'Thanh Hóa', ngan: 'TH', chao: 'Xứ Thanh, biển Sầm Sơn', ten2: ['thanhhoa', 'xu thanh', 'sam son'], tat: ['th'] },
  { id: 'nghe-an', ten: 'Nghệ An', ngan: 'NA', chao: 'Quê Bác, sông Lam xứ Nghệ', ten2: ['nghean', 'xu nghe', 'vinh nghe an', 'cua lo'], tat: ['na'] },
  { id: 'ha-tinh', ten: 'Hà Tĩnh', ngan: 'HT', chao: 'Núi Hồng sông La', ten2: ['hatinh', 'ky anh'], tat: ['ht'] },
  { id: 'cao-bang', ten: 'Cao Bằng', ngan: 'CB', chao: 'Thác Bản Giốc hùng vĩ', ten2: ['caobang', 'ban gioc'], tat: ['cb'] },
  { id: 'tuyen-quang', ten: 'Tuyên Quang', ngan: 'TQ', chao: 'Thủ đô kháng chiến, cao nguyên đá', ten2: ['tuyenquang', 'dong van', 'meo vac'], cu: ['Hà Giang'], tat: ['tq'] },
  { id: 'lao-cai', ten: 'Lào Cai', ngan: 'LCa', chao: 'Đỉnh Fansipan, Sa Pa mờ sương', ten2: ['laocai', 'sa pa', 'sapa', 'mu cang chai'], cu: ['Yên Bái'], tat: ['yb'] },
  { id: 'thai-nguyen', ten: 'Thái Nguyên', ngan: 'TNg', chao: 'Đệ nhất danh trà Tân Cương', ten2: ['thainguyen', 'ho ba be'], cu: ['Bắc Kạn', 'Bắc Cạn'] },
  { id: 'phu-tho', ten: 'Phú Thọ', ngan: 'PT', chao: 'Đất Tổ Hùng Vương, ngã ba Bạch Hạc', ten2: ['phutho', 'viet tri', 'tam dao'], cu: ['Vĩnh Phúc', 'Hòa Bình'], tat: ['pt', 'vp', 'hb'] },
  { id: 'bac-ninh', ten: 'Bắc Ninh', ngan: 'BN', chao: 'Quan họ Kinh Bắc, sông Cầu', ten2: ['bacninh', 'kinh bac'], cu: ['Bắc Giang'], tat: ['bn', 'bg'] },
  { id: 'hung-yen', ten: 'Hưng Yên', ngan: 'HY', chao: 'Nhãn lồng Phố Hiến, quê lúa', ten2: ['hungyen', 'pho hien'], cu: ['Thái Bình'], tat: ['hy', 'tb'] },
  { id: 'ninh-binh', ten: 'Ninh Bình', ngan: 'NB', chao: 'Tràng An non nước, cố đô Hoa Lư', ten2: ['ninhbinh', 'trang an', 'hoa lu', 'bai dinh'], cu: ['Hà Nam', 'Nam Định'], tat: ['nb', 'nd'] },
  { id: 'quang-tri', ten: 'Quảng Trị', ngan: 'QT', chao: 'Động Phong Nha, sông Nhật Lệ', ten2: ['quangtri', 'dong hoi', 'phong nha'], cu: ['Quảng Bình'], dao: ['Đảo Cồn Cỏ'], tat: ['qt', 'qb'] },
  { id: 'quang-ngai', ten: 'Quảng Ngãi', ngan: 'QNg', chao: 'Núi Ấn sông Trà, đảo Lý Sơn', ten2: ['quangngai', 'mang den'], cu: ['Kon Tum', 'Kontum'], dao: ['Lý Sơn'] },
  { id: 'gia-lai', ten: 'Gia Lai', ngan: 'GL', chao: 'Biển Hồ Pleiku, biển xanh Quy Nhơn', ten2: ['gialai', 'pleiku', 'eo gio', 'ky co'], cu: ['Bình Định', 'Quy Nhơn'], tat: ['gl'] },
  { id: 'khanh-hoa', ten: 'Khánh Hòa', ngan: 'KH', chao: 'Vịnh Nha Trang, biển đảo quê hương', ten2: ['khanhhoa', 'nha trang', 'cam ranh', 'phan rang'], cu: ['Ninh Thuận'], dao: ['Trường Sa', 'Quần đảo Trường Sa', 'Song Tử Tây', 'Đảo Sinh Tồn'], tat: ['kh', 'nt'] },
  { id: 'lam-dong', ten: 'Lâm Đồng', ngan: 'LĐ', chao: 'Đà Lạt ngàn hoa, biển Mũi Né', ten2: ['lamdong', 'da lat', 'dalat', 'mui ne', 'bao loc'], cu: ['Đắk Nông', 'Đắc Nông', 'Bình Thuận', 'Phan Thiết'], dao: ['Phú Quý', 'Đảo Phú Quý'], tat: ['ld'] },
  { id: 'dak-lak', ten: 'Đắk Lắk', ngan: 'ĐL', chao: 'Thủ phủ cà phê Buôn Ma Thuột, biển Tuy Hòa', ten2: ['daklak', 'dak lac', 'dac lac', 'buon ma thuot', 'buon me thuot', 'bmt', 'tuy hoa'], cu: ['Phú Yên'], tat: ['dl', 'py'] },
  { id: 'dong-nai', ten: 'Đồng Nai', ngan: 'ĐNa', chao: 'Sông Đồng Nai, rừng Nam Cát Tiên', ten2: ['dongnai', 'bien hoa', 'long khanh'], cu: ['Bình Phước'], tat: ['dna', 'bp'] },
  { id: 'tay-ninh', ten: 'Tây Ninh', ngan: 'TN', chao: 'Đỉnh núi Bà Đen, sông Vàm Cỏ', ten2: ['tayninh', 'nui ba den', 'tan an'], cu: ['Long An'], tat: ['tn', 'la'] },
  { id: 'vinh-long', ten: 'Vĩnh Long', ngan: 'VL', chao: 'Sông Cổ Chiên, xứ dừa Bến Tre', ten2: ['vinhlong'], cu: ['Bến Tre', 'Trà Vinh'], tat: ['vl', 'bt', 'tv'] },
  { id: 'dong-thap', ten: 'Đồng Tháp', ngan: 'ĐT', chao: 'Đồng sen Tháp Mười, sông Tiền', ten2: ['dongthap', 'cao lanh', 'sa dec'], cu: ['Tiền Giang', 'Mỹ Tho'], tat: ['dt', 'tg'] },
  { id: 'ca-mau', ten: 'Cà Mau', ngan: 'CM', chao: 'Đất Mũi cực Nam Tổ quốc', ten2: ['camau', 'dat mui', 'nam can'], cu: ['Bạc Liêu'], dao: ['Hòn Khoai', 'Hòn Chuối'], tat: ['cm', 'bl'] },
  { id: 'an-giang', ten: 'An Giang', ngan: 'AG', chao: 'Rừng tràm Trà Sư, đảo ngọc Phú Quốc', ten2: ['angiang', 'chau doc', 'long xuyen', 'ha tien'], cu: ['Kiên Giang', 'Rạch Giá'], dao: ['Phú Quốc', 'Nam Du', 'Thổ Chu'], tat: ['ag', 'kg', 'pq'] },
];

export const SO_TINH = TINH.length; // 34
export const TINH_BY_ID = new Map(TINH.map((t) => [t.id, t]));

/**
 * Xử lý trước khi bỏ dấu để không bắt nhầm tên người / từ thông thường:
 * - "chị Huệ", "em Huệ" không bị nhầm thành "Huế"
 * - "sơn là" không bị nhầm thành "Sơn La"
 */
const FALSE_ACCENTED = /(^|[^\p{L}])(huệ|hơn|còn|hôn)(?=$|[^\p{L}])/giu;
function prep(text: string) {
  return String(text)
    .normalize('NFC')
    .toLowerCase()
    .replace(FALSE_ACCENTED, '$1 ')
    .replace(/sơn là/g, 'sơn ')
    .replace(/cồn cỏ/g, 'đảo cồn cỏ');
}

/** Bỏ dấu, chữ thường, gom 1 khoảng trắng, bọc khoảng trắng 2 đầu */
export const plain = (text: string) =>
  ` ${prep(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

// Màu ghe: 34 màu xa nhau trên vòng màu vàng
export const mauTinh = (id: string) => {
  const i = TINH.findIndex((t) => t.id === id);
  const h = Math.round((i * 137.508) % 360);
  return { than: `hsl(${h} 62% 38%)`, vien: `hsl(${h} 80% 62%)`, nhat: `hsl(${h} 70% 82%)` };
};

// Bảng tra tên dài -> ngắn để khớp tên đầy đủ trước
const DAI: [string, string][] = [];
const TAT = new Map<string, string>();
for (const t of TINH) {
  for (const n of [t.ten, ...(t.ten2 ?? []), ...(t.cu ?? []), ...(t.dao ?? [])]) {
    const p = plain(n);
    DAI.push([p, t.id]);
    // Hỗ trợ viết dính cho tên >= 7 ký tự (vd: "cantho", "thanhhoa", "phuquoc", "hoangsa", "truongsa")
    const trimmed = p.trim();
    if (trimmed.includes(' ') && trimmed.length >= 7) {
      DAI.push([` ${trimmed.replace(/ /g, '')} `, t.id]);
    }
  }
  for (const n of t.tat ?? []) TAT.set(plain(n), t.id);
}
DAI.sort((a, b) => b[0].length - a[0].length);

/** Tìm mã tỉnh từ bình luận của người xem */
export function timTinh(comment: string): string | null {
  const p = plain(comment);
  if (p.trim().length === 0 || p.length > 90) return null;
  const tat = TAT.get(p);
  if (tat) return tat;
  for (const [ten, id] of DAI) if (p.includes(ten)) return id;
  return null;
}

/** Gõ tên tỉnh cũ trước sáp nhập -> trả tên cũ có dấu để giới thiệu trên ticker */
export function tenCu(comment: string, id: string): string | null {
  const t = TINH_BY_ID.get(id);
  const p = plain(comment);
  const cu = t?.cu?.find((c) => p.includes(plain(c)));
  return cu ?? null;
}

/** Gõ tên đảo / quần đảo (Hoàng Sa, Trường Sa, Phú Quốc, Côn Đảo...) -> trả tên đảo để vinh danh */
export function tenDao(comment: string, id: string): { dao: string; bienDong: boolean } | null {
  const t = TINH_BY_ID.get(id);
  const p = plain(comment);
  const dao = t?.dao?.find((d) => p.includes(plain(d)) || p.includes(` ${plain(d).trim().replace(/ /g, '')} `));
  if (!dao) return null;
  const bienDong = /hoang sa|truong sa|song tu|sinh ton/.test(plain(dao));
  return { dao, bienDong };
}
