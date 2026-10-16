# Chuyển sang NativeWind — quy ước bắt buộc

> Áp dụng từ 14/10/2026. Toàn bộ app dùng **NativeWind v4 (Tailwind)** cho style;
> component lấy từ **React Native Reusables** (copy vào `src/components/ui/`).
> Màu sắc **lấy từ CSS vars trong `global.css`** (sinh từ `src/theme/palette.ts`) nên
> giao diện **không đổi màu** so với trước.

## 1. Token → class (bảng chuyển)

### Màu (`theme.colors.*` → class)
| Token cũ | class |
| --- | --- |
| `background` | `bg-background` |
| `card` / `cardElevated` | `bg-card` / `bg-card-elevated` |
| `border` | `border-border` |
| `primary` | `bg-primary` / `text-primary` / `border-primary` |
| `primarySoft` | `bg-secondary` (hoặc `bg-primary-soft`) |
| `onPrimary` | `text-primary-foreground` |
| `brand` | `text-brand` / `bg-brand` |
| `text` | `text-foreground` |
| `textMuted` | `text-muted-foreground` |
| `textFaint` | `text-text-faint` |
| `danger` / `dangerSoft` | `bg-destructive` / `bg-danger-soft` |
| `success` | `text-success` / `bg-success` |
| `warning` | `text-warning` / `bg-warning` |
| `highlight` | `bg-highlight` |
| `overlay` | `bg-overlay/45` |

### Spacing / radius / chữ
| Token cũ | class |
| --- | --- |
| `spacing.xs/sm/md/lg/xl/xxl` (4/8/12/16/20/28) | `1 / 2 / 3 / 4 / 5 / 7` (vd `p-3`, `gap-2`, `mt-4`) |
| `radius.sm/md/lg/xl/pill` (8/10/12/16/999) | `rounded-sm / rounded-md / rounded-lg / rounded-xl / rounded-full` |
| `StyleSheet.hairlineWidth` | `border-hairline` / `border-t-hairline` / `border-b-hairline` / `border-l-hairline` |
| `fontSize.xs/sm/md/lg/xl/xxl/hero` (11/13/15/17/20/28/40) | `text-xs / text-sm / text-base / text-lg / text-xl / text-2xl / text-hero` |
| `fontWeight.regular/medium/semibold/bold` | `font-normal / font-medium / font-semibold / font-bold` |

## 2. Quy tắc viết

- **Ưu tiên `className`**; chỉ dùng `style={{...}}` cho giá trị **động lúc chạy**
  (toạ độ đo được, màu tính từ dữ liệu, `Animated`, transform…) — giống hệt quy ước web.
- **Không hardcode màu hex** trong class — luôn dùng token ở trên (`text-brand`, không `text-[#fc3603]`).
- **Dark mode**: dùng `dark:` (NativeWind đã được đồng bộ với chế độ sáng/tối của app qua
  `colorScheme.set()` trong `src/App.tsx`). Ví dụ: `bg-card dark:bg-card` là thừa — token đã tự đổi theo dark.
- **`useTheme()` vẫn giữ** cho nhu cầu phía JS: màu icon `lucide`, `StatusBar`, theme điều hướng,
  giá trị tính toán. Nhưng **mọi style tĩnh phải là class**.
- **Giữ nguyên props/API** của component dùng chung khi chuyển (để 56 màn không phải sửa cùng lúc).
- **testID giữ nguyên 100%** (e2e/kiểm tra trên máy dựa vào chúng).
- Component Reusables nằm ở `src/components/ui/` (Button/Card/Dialog/Select/Tabs/Switch/Tooltip/
  Progress/Skeleton/Avatar/Badge/Input/Label/Checkbox/Separator/Text…) — dùng trực tiếp, không tự viết lại.

## 2b. Trạng thái (16/10/2026)

- Đã chuyển toàn bộ `StyleSheet.create` sang `className` (≈60 file). Còn giữ style object có chủ đích:
  `ChatMarkdown` (thư viện markdown nhận style object), mặt thẻ lật `FlashcardScreen` + chấm `ThinkingDots`
  (`Animated`), kích thước đo lúc chạy (`InkCanvas`, `SessionsSheet` maxHeight, `OfflineBanner` inset), `textAlignVertical`.
- Component dùng chung (`Card`, `Button`, `Chip`, `IconButton`, `Skeleton`, `Input`, `WordCell`, `SegmentedControl`…) nhận `className`
  (ghép bằng `cn`); `Screen` nhận `contentClassName` (đè `p-4` mặc định, vd `p-0`).

## 3. Reusables — thành phần đã copy về

| Component | Ghi chú |
| --- | --- |
| `text` | Thay `AppText` dần (giữ `AppText` làm wrapper mỏng nếu cần biến thể) |
| `button`, `card`, `badge`, `input`, `label`, `checkbox`, `switch`, `separator`, `progress`, `skeleton`, `avatar` | Thay các component tự viết cùng tên |
| `dialog`, `alert-dialog` | Thay `Dialog` tự viết |
| `sheet` | Dùng cho bottom sheet (thay `BottomSheet` tự viết) |
| `select`, `tabs`, `tooltip`, `collapsible`, `dropdown-menu`, `popover` | Component mới (trước đây tự chế) |

## 4. Lệnh kiểm tra

```bash
npm run tsc      # 0 lỗi
npm run lint     # 0 errors
```

Đổi cấu hình `tailwind.config.js`/`global.css` thì **khởi động lại Metro kèm `--reset-cache`**.
