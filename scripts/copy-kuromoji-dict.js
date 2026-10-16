/**
 * Chép từ điển kuromoji (~17MB .gz) vào assets của Android để đọc offline cho furigana.
 * Chạy tự động ở `postinstall`; thư mục đích được gitignore (không commit file nhị phân vào repo).
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "@sglkc", "kuromoji", "dict");
const dest = path.join(__dirname, "..", "android", "app", "src", "main", "assets", "kuromoji-dict");

if (!fs.existsSync(src)) {
  console.warn("[kuromoji-dict] Không thấy", src, "— bỏ qua (chưa cài @sglkc/kuromoji?)");
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
let count = 0;
for (const file of fs.readdirSync(src)) {
  if (!file.endsWith(".dat.gz")) continue;
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
  count += 1;
}
console.log(`[kuromoji-dict] Đã chép ${count} file vào ${path.relative(process.cwd(), dest)}`);
