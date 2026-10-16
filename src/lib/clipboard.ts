import Clipboard from "@react-native-clipboard/clipboard";

/** Sau một lần copy chủ động trong app, bỏ qua thông báo thay đổi clipboard trong khoảng này (ms). */
const SUPPRESS_MS = 1500;
let suppressUntil = 0;

/**
 * Sao chép chủ động từ nút trong app (copy kanji, copy bản dịch…): đánh dấu để bộ nghe clipboard
 * KHÔNG mở phiếu tra nhanh. Chỉ khi người dùng bôi đen rồi bấm "Copy" của hệ thống mới tra nhanh.
 */
export function copyText(text: string): void {
  suppressUntil = Date.now() + SUPPRESS_MS;
  Clipboard.setString(text);
}

/**
 * Nghe người dùng bôi đen → Copy (clipboard đổi) khi app đang mở, trả về văn bản đã copy.
 * RN không bắt được vùng bôi đen như `window.getSelection()` trên web nên dùng clipboard làm cầu nối.
 */
export function subscribeUserCopy(onText: (text: string) => void): () => void {
  const subscription = Clipboard.addListener(() => {
    if (Date.now() < suppressUntil) return;
    void Clipboard.getString().then(text => {
      if (text) onText(text);
    });
  });
  return () => subscription.remove();
}
