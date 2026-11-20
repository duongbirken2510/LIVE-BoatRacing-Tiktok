# LIVE-BOAT RACING TIKTOK (v2.0): Ghi chú kiến trúc & luật chơi

## Kiến trúc tổng thể

- **`server.ts`**: Backend Express + SSE (`/api/tiktok/events`), kết nối TikTok LIVE tự động nối lại, nhúng trực tiếp worker Python `tools/vieneu-worker.py` (VieNeu-TTS v3 Turbo ONNX INT8 — tự động tìm tại `./VieNeu-TTS`, `../LIVE-TRANGNGUYEN/VieNeu-TTS`, `../LIVE-CLASS/VieNeu-TTS`), fallback sang Edge TTS (`NamMinh` / `HoaiMy`, đã vá chống crash `UnhandledPromiseRejection`) và Google TTS. Tự động lùi cổng nếu cổng `3010` đang bận.
- **`src/game/dua.ts`**: Lõi máy trạng thái độc lập React (`chuyen` → `dua` → `ketQua` → `sacPhong` → `chonSong` + `nghiLive`). Kiểm thử tự động bằng `npx tsx src/game/dua.check.ts`.
- **`src/game/tinh.ts`**: 34 tỉnh thành sau sắp xếp 2025 + tỉnh cũ trước sáp nhập + đảo tiền tiêu (Hoàng Sa, Trường Sa, Phú Quốc, Côn Đảo, Lý Sơn, Cát Bà...). Xét dấu tiếng Việt trước khi bỏ dấu để không bắt nhầm `"chị Huệ"` thành `"Huế"`.
- **`src/game/chang.ts` & `src/game/ve/Song.tsx`**: 23 chặng sông khắp Bắc – Trung – Tây Nguyên – Nam Bộ sử dụng bộ ảnh mặt sông & bờ thật liền mạch kết hợp lọc màu vùng miền.
- **`src/game/GameStage.tsx`**: Sân khấu dọc `1080 × 1920` chuẩn Safe-Zone TikTok (cụm *Đoàn đang đuổi* đặt gọn tại `x: 508..952` tránh vùng Comment góc dưới trái và nút TikTok mép phải; hỗ trợ `lite=true` giảm tải GPU cho khung Preview Dashboard).
- **`src/live/bannedWords.ts` & `src/live/names.ts` & `src/live/voice.ts`**: Bộ lọc `isRudeName` chống tên tục lách ký tự (`l0n`, `đ.ị.t`, `djt123`) + khóa chặn tầng cuối trong `voice.say()`.
- **Dữ liệu bền vững (`data/`)**:
  - `settings.json`: tên kênh, tài khoản TikTok, giọng đọc đang chọn, thời lượng vòng, công tắc ẩn chữ quà `anQua`, 3 mức âm lượng.
  - `data/bang-vang.json`: Bảng vàng tỉnh thắng trong ngày & trong tuần.
  - `data/tay-cheo.json`: Tích lũy nhịp chèo & cấp bậc Thủy Thủ Trọn Đời của người xem.
