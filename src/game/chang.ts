/**
 * 22 Chặng đua sông nước khắp Bắc - Trung - Tây Nguyên - Nam Bộ.
 * Mỗi chặng gắn với 1 tỉnh "sân nhà" (+10% tốc độ) và dùng bộ ảnh mặt sông + bờ thật liền mạch (`anh`).
 */
export type AnhSong =
  | 'cai-rang'
  | 'thap-muoi'
  | 'tra-su'
  | 'co-chien'
  | 'dat-mui'
  | 'trang-an'
  | 'song-huong'
  | 'song-han'
  | 'ha-long'
  | 'song-sai-gon';

export interface Chang {
  id: string;
  ten: string;
  anh: AnhSong; // tên file ảnh nền sông & bờ trong public/assets/song & bo
  locMau?: string; // bộ lọc ánh sáng mặt nước riêng từng vùng miền
  goi: string[]; // từ khóa để khán giả gõ bầu chọn sông
  sao: 1 | 2 | 3;
  nha: string; // id tỉnh sân nhà
  nuoc: [string, string];
  bo: [string, string];
}

export const CHANG: Chang[] = [
  // ---------- Miền Tây & Đông Nam Bộ ----------
  { id: 'cai-rang', ten: 'Chợ nổi Cái Răng', anh: 'cai-rang', goi: ['Cái Răng', 'chợ nổi'], sao: 3, nha: 'can-tho', nuoc: ['#b98a52', '#8f6436'], bo: ['#7a5a35', '#5f7d3a'] },
  { id: 'thap-muoi', ten: 'Đồng sen Tháp Mười', anh: 'thap-muoi', goi: ['Tháp Mười', 'đồng sen'], sao: 2, nha: 'dong-thap', nuoc: ['#3f9c94', '#2c7a74'], bo: ['#6f5a3a', '#6fae45'] },
  { id: 'tra-su', ten: 'Rừng tràm Trà Sư', anh: 'tra-su', goi: ['Trà Sư', 'rừng tràm'], sao: 2, nha: 'an-giang', nuoc: ['#4f8c5a', '#38704a'], bo: ['#5b4a30', '#3f7a35'] },
  { id: 'co-chien', ten: 'Sông Cổ Chiên', anh: 'co-chien', goi: ['Cổ Chiên'], sao: 2, nha: 'vinh-long', nuoc: ['#8f8a55', '#6e6a3e'], bo: ['#76603b', '#5f8f3a'] },
  { id: 'dat-mui', ten: 'Rừng đước Đất Mũi', anh: 'dat-mui', goi: ['Đất Mũi', 'rừng đước'], sao: 3, nha: 'ca-mau', nuoc: ['#9a7a4e', '#755a35'], bo: ['#4d3d28', '#35552c'] },
  { id: 'song-sai-gon', ten: 'Sông Sài Gòn', anh: 'song-sai-gon', goi: ['Sông Sài Gòn', 'Bến Bạch Đằng'], sao: 2, nha: 'hcm', nuoc: ['#4a7f95', '#355f75'], bo: ['#7d7d7d', '#5a8a48'] },
  { id: 'song-dong-nai', ten: 'Sông Đồng Nai', anh: 'song-han', locMau: 'hue-rotate(-12deg) saturate(1.08)', goi: ['Sông Đồng Nai', 'Cù lao Phố'], sao: 1, nha: 'dong-nai', nuoc: ['#397c9e', '#265c78'], bo: ['#6e7b68', '#4f8a48'] },
  { id: 'vam-co', ten: 'Sông Vàm Cỏ Đông', anh: 'co-chien', locMau: 'hue-rotate(14deg) saturate(1.08)', goi: ['Vàm Cỏ'], sao: 1, nha: 'tay-ninh', nuoc: ['#6d8a55', '#4e6a3e'], bo: ['#68603b', '#528538'] },

  // ---------- Miền Bắc ----------
  { id: 'song-hong', ten: 'Sông Hồng Thăng Long', anh: 'song-sai-gon', locMau: 'sepia(0.18) saturate(1.15)', goi: ['Sông Hồng', 'Thăng Long'], sao: 3, nha: 'ha-noi', nuoc: ['#a46f52', '#7d5038'], bo: ['#7a5c46', '#587f42'] },
  { id: 'ha-long', ten: 'Vịnh Hạ Long', anh: 'ha-long', goi: ['Hạ Long'], sao: 3, nha: 'quang-ninh', nuoc: ['#2f9a9a', '#1f7a80'], bo: ['#5a6a5a', '#4a7a4a'] },
  { id: 'bach-dang', ten: 'Sông Bạch Đằng', anh: 'ha-long', locMau: 'hue-rotate(-14deg) brightness(0.97)', goi: ['Bạch Đằng', 'Sông Cấm'], sao: 3, nha: 'hai-phong', nuoc: ['#2a889e', '#1c6578'], bo: ['#5a6868', '#46754e'] },
  { id: 'trang-an', ten: 'Non nước Tràng An', anh: 'trang-an', goi: ['Tràng An', 'Hoa Lư'], sao: 2, nha: 'ninh-binh', nuoc: ['#3e9a86', '#2a7666'], bo: ['#556b4a', '#4f8a45'] },
  { id: 'song-cau', ten: 'Sông Cầu Quan Họ', anh: 'song-huong', locMau: 'hue-rotate(12deg) saturate(1.08)', goi: ['Sông Cầu', 'Quan Họ'], sao: 1, nha: 'bac-ninh', nuoc: ['#3f8fa0', '#2c6f82'], bo: ['#746a4a', '#5f8f45'] },
  { id: 'bach-hac', ten: 'Ngã ba Bạch Hạc', anh: 'trang-an', locMau: 'hue-rotate(-16deg)', goi: ['Bạch Hạc', 'Sông Lô'], sao: 2, nha: 'phu-tho', nuoc: ['#3d8c96', '#296870'], bo: ['#5d684a', '#4c8244'] },

  // ---------- Miền Trung & Tây Nguyên ----------
  { id: 'song-ma', ten: 'Sông Mã Hàm Rồng', anh: 'trang-an', locMau: 'sepia(0.14) saturate(1.1)', goi: ['Sông Mã', 'Hàm Rồng'], sao: 2, nha: 'thanh-hoa', nuoc: ['#5e8a72', '#426854'], bo: ['#686348', '#528040'] },
  { id: 'song-lam', ten: 'Sông Lam Xứ Nghệ', anh: 'song-huong', locMau: 'hue-rotate(-18deg) saturate(1.12)', goi: ['Sông Lam'], sao: 2, nha: 'nghe-an', nuoc: ['#2f8688', '#206466'], bo: ['#6c6648', '#528844'] },
  { id: 'nhat-le', ten: 'Sông Nhật Lệ', anh: 'song-han', locMau: 'hue-rotate(-8deg) brightness(1.03)', goi: ['Nhật Lệ', 'Phong Nha'], sao: 2, nha: 'quang-tri', nuoc: ['#2f8cb0', '#206a88'], bo: ['#767a6e', '#52884a'] },
  { id: 'song-huong', ten: 'Sông Hương Cố Đô', anh: 'song-huong', goi: ['Sông Hương'], sao: 2, nha: 'hue', nuoc: ['#3f86a0', '#2c6a82'], bo: ['#7a6a4a', '#5f8f45'] },
  { id: 'song-han', ten: 'Sông Hàn Cầu Rồng', anh: 'song-han', goi: ['Sông Hàn', 'Cầu Rồng'], sao: 2, nha: 'da-nang', nuoc: ['#2f7fb0', '#22628c'], bo: ['#8a8a8a', '#5a8f4a'] },
  { id: 'thi-nai', ten: 'Đầm Thị Nại Quy Nhơn', anh: 'ha-long', locMau: 'hue-rotate(10deg) saturate(1.1)', goi: ['Thị Nại', 'Quy Nhơn'], sao: 2, nha: 'gia-lai', nuoc: ['#2a96a8', '#1d7080'], bo: ['#5e6c5a', '#4c7c4a'] },
  { id: 'nha-trang', ten: 'Vịnh Nha Trang', anh: 'ha-long', locMau: 'hue-rotate(18deg) saturate(1.18)', goi: ['Nha Trang', 'Vịnh Nha Trang'], sao: 3, nha: 'khanh-hoa', nuoc: ['#1ea0b8', '#14788c'], bo: ['#5a6e64', '#488050'] },
  { id: 'xuan-huong', ten: 'Hồ Xuân Hương Đà Lạt', anh: 'thap-muoi', locMau: 'hue-rotate(22deg) saturate(0.95)', goi: ['Xuân Hương', 'Hồ Xuân Hương'], sao: 2, nha: 'lam-dong', nuoc: ['#3b869c', '#286478'], bo: ['#5c6448', '#4c8452'] },
  { id: 'ho-lak', ten: 'Hồ Lắk Đại Ngàn', anh: 'tra-su', locMau: 'hue-rotate(-14deg) saturate(1.08)', goi: ['Hồ Lắk', 'Sêrêpốk'], sao: 2, nha: 'dak-lak', nuoc: ['#468468', '#30644e'], bo: ['#5c4c34', '#40783c'] },
];

export const CHANG_BY_ID = new Map(CHANG.map((c) => [c.id, c]));
export const saoText = (n: number) => '★'.repeat(n);
