import * as React from "react";
import { ActivityIndicator, Clipboard, Pressable, Share, View } from "react-native";
import {
  ArrowRightLeft,
  Check,
  ChevronDown,
  Copy,
  Languages,
  Share2,
  X,
} from "lucide-react-native";
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  IconButton,
  Input,
  ListRow,
  Screen,
  useToast,
} from "@/components/ui";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { useT } from "@/i18n";
import { stopSpeaking } from "@/lib/tts";
import {
  translateText,
  type TranslateLang,
  type TranslateResult,
  type TranslateSource,
} from "@/lib/translate";
import { useTheme } from "@/theme";

/** Chờ người dùng ngừng gõ rồi mới dịch (giống web: pages/translate/index.tsx). */
const DEBOUNCE_MS = 600;

/** Nguồn: tự nhận diện + 3 ngôn ngữ (nhãn ngắn của namespace dict cho vừa một hàng). */
const SOURCE_ORDER: TranslateSource[] = ["auto", "vi", "en", "ja"];
/** Đích: mặc định vi (thứ tự vi → en → ja). */
const TARGET_ORDER: TranslateLang[] = ["vi", "en", "ja"];

const SOURCE_LABEL_KEYS: Record<TranslateSource, string> = {
  auto: "dict.langAuto",
  vi: "dict.langVi",
  en: "dict.langEn",
  ja: "dict.langJa",
};

/** Thiếu khoá i18n cho nút chia sẻ (đã ghi trong báo cáo) — dùng tạm tiếng Việt. */
const SHARE_LABEL = "Chia sẻ";

/** Nhãn đầy đủ của một ngôn ngữ dịch (namespace translatePage). */
function langLabel(lang: TranslateLang, t: (key: string) => string): string {
  if (lang === "vi") return t("translatePage.langVi");
  if (lang === "ja") return t("translatePage.langJa");
  return t("translatePage.langEn");
}

interface LangPickerOption {
  value: string;
  label: string;
}

interface LangPickerProps {
  /** Nhãn "Nguồn"/"Đích" hiện trên nút. */
  label: string;
  value: string;
  options: LangPickerOption[];
  onSelect: (value: string) => void;
  testID: string;
}

/**
 * Chọn ngôn ngữ gọn kiểu native: nút một dòng hiện giá trị đang chọn, bấm mở bottom sheet.
 * Hai SegmentedControl đầy đủ không đủ chỗ trên màn hẹp nên gom về một hàng như bản web.
 */
function LangPicker({ label, value, options, onSelect, testID }: LangPickerProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const current = options.find(option => option.value === value) ?? options[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current.label}`}
        className="min-h-[48px] flex-1 flex-row items-center justify-between gap-1 rounded-xl border border-border bg-card px-3 py-1.5 active:bg-secondary"
      >
        <View className="shrink">
          <AppText size="xs" color="muted">
            {label}
          </AppText>
          <AppText size="sm" weight="semibold" numberOfLines={1}>
            {current.label}
          </AppText>
        </View>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        testID={`${testID}-sheet`}
      >
        <View className="gap-1">
          {options.map(option => (
            <ListRow
              key={option.value}
              title={option.label}
              onPress={() => {
                onSelect(option.value);
                setOpen(false);
              }}
              right={
                option.value === value ? (
                  <Check size={18} color={theme.colors.primary} />
                ) : undefined
              }
              testID={`${testID}-${option.value}`}
            />
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

/** Tab Dịch — engine chạy 100% phía client (Google gtx → clients5 → MyMemory). */
export function TranslateScreen() {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();

  const [source, setSource] = React.useState("");
  const [from, setFrom] = React.useState<TranslateSource>("auto");
  const [to, setTo] = React.useState<TranslateLang>("vi");
  const [result, setResult] = React.useState<TranslateResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const requestRef = React.useRef(0);

  const sameLanguage = from !== "auto" && from === to;

  const runTranslate = React.useCallback(
    async (text: string, sourceLang: TranslateSource, targetLang: TranslateLang) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setFailed(false);
      try {
        const translated = await translateText(text, sourceLang, targetLang);
        if (requestRef.current !== requestId) return;
        setResult(translated);
      } catch {
        if (requestRef.current !== requestId) return;
        setResult(null);
        setFailed(true);
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    },
    [],
  );

  // Tự dịch sau khi ngừng gõ / đổi ngôn ngữ (giống web)
  React.useEffect(() => {
    const trimmed = source.trim();
    if (!trimmed || sameLanguage) {
      requestRef.current += 1;
      setResult(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => void runTranslate(trimmed, from, to), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source, from, to, sameLanguage, runTranslate]);

  // Đổi chiều dịch -> kết quả cũ không còn đúng hướng, bỏ ngay để trạng thái rõ ràng
  React.useEffect(() => {
    requestRef.current += 1;
    setResult(null);
    setFailed(false);
    setLoading(false);
  }, [from, to]);

  // Dừng đọc khi rời màn (giống web)
  React.useEffect(() => () => stopSpeaking(), []);

  const handleSwap = () => {
    // Kiểu Google Translate: đưa bản dịch sang ô nguồn rồi đảo chiều
    const previousFrom: TranslateLang = from === "auto" ? (result?.detected ?? "en") : from;
    setFrom(to);
    setTo(previousFrom);
    if (result?.text) setSource(result.text);
  };

  const handleClear = () => {
    // Huỷ luôn lượt dịch đang chạy (nếu có) để kết quả cũ không hiện lại
    requestRef.current += 1;
    setSource("");
    setResult(null);
    setFailed(false);
    setLoading(false);
  };

  const handleCopy = () => {
    if (!result?.text) return;
    Clipboard.setString(result.text);
    show(t("common.copied"), { type: "success" });
  };

  const handleShare = async () => {
    if (!result?.text) return;
    try {
      await Share.share({ message: result.text });
    } catch {
      show(t("errors.generic"), { type: "error" });
    }
  };

  const sourceOptions: LangPickerOption[] = SOURCE_ORDER.map(value => ({
    value,
    label: t(SOURCE_LABEL_KEYS[value]),
  }));
  const targetOptions: LangPickerOption[] = TARGET_ORDER.map(value => ({
    value,
    label: langLabel(value, t),
  }));

  return (
    <Screen title={t("translatePage.title")} scroll testID="translate-screen">
      <View className="gap-4">
        {/* Khung nhập: chọn chiều dịch gọn một hàng + văn bản nguồn */}
        <Card>
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <LangPicker
                label={t("translatePage.source")}
                value={from}
                options={sourceOptions}
                onSelect={value => setFrom(value as TranslateSource)}
                testID="translate-source"
              />
              <View>
                <IconButton
                  icon={<ArrowRightLeft size={18} color={theme.colors.primary} />}
                  onPress={handleSwap}
                  accessibilityLabel={t("translatePage.swap")}
                  variant="outline"
                  testID="translate-swap"
                />
              </View>
              <LangPicker
                label={t("translatePage.target")}
                value={to}
                options={targetOptions}
                onSelect={value => setTo(value as TranslateLang)}
                testID="translate-target"
              />
            </View>

            <Input
              value={source}
              onChangeText={setSource}
              placeholder={t("translatePage.sourcePlaceholder")}
              multiline
              numberOfLines={5}
              rightSlot={
                source.length > 0 ? (
                  <IconButton
                    icon={<X size={16} color={theme.colors.textMuted} />}
                    onPress={handleClear}
                    accessibilityLabel={t("translatePage.clear")}
                    size="sm"
                    testID="translate-clear"
                  />
                ) : null
              }
              testID="translate-input"
            />

            <View className="flex-row items-center justify-between gap-3">
              <AppText variant="caption">
                {t("translatePage.characters", { count: source.length })}
              </AppText>
              <Button
                label={t("translatePage.action")}
                onPress={() => void runTranslate(source.trim(), from, to)}
                disabled={!source.trim() || sameLanguage || loading}
                loading={loading}
                testID="translate-submit"
              />
            </View>
          </View>
        </Card>

        {/* Kết quả dịch ngay dưới ô nhập: đọc to + sao chép + chia sẻ, lỗi có nút thử lại */}
        <Card testID="translate-result">
          <View className="gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <AppText variant="label">{t("translatePage.outputAria")}</AppText>
              {result?.text && !loading ? (
                <View className="flex-row items-center gap-0.5">
                  <SpeakButton
                    text={result.text}
                    lang={to}
                    size="sm"
                    testID="translate-speak"
                  />
                  <IconButton
                    icon={<Copy size={18} color={theme.colors.primary} />}
                    onPress={handleCopy}
                    accessibilityLabel={t("translatePage.copy")}
                    size="sm"
                    testID="translate-copy"
                  />
                  <IconButton
                    icon={<Share2 size={18} color={theme.colors.primary} />}
                    onPress={() => void handleShare()}
                    accessibilityLabel={SHARE_LABEL}
                    size="sm"
                    testID="translate-share"
                  />
                </View>
              ) : null}
            </View>

            {loading ? (
              <View className="flex-row items-center gap-2 py-1">
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText variant="caption">{t("translatePage.translating")}</AppText>
              </View>
            ) : failed ? (
              <View className="items-start gap-2">
                <AppText variant="caption" color="danger">
                  {t("translatePage.error")}
                </AppText>
                <Button
                  label={t("common.retry")}
                  variant="outline"
                  size="sm"
                  onPress={() => void runTranslate(source.trim(), from, to)}
                  testID="translate-retry"
                />
              </View>
            ) : result?.text ? (
              <View className="gap-2">
                <AppText variant="body" selectable>
                  {result.text}
                </AppText>
                {from === "auto" && result.detected ? (
                  <AppText variant="caption">
                    {t("translatePage.detected", { lang: langLabel(result.detected, t) })}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Languages size={16} color={theme.colors.primary} />
                <AppText variant="caption" className="flex-1">
                  {sameLanguage
                    ? t("translatePage.sameLanguage")
                    : t("translatePage.outputPlaceholder")}
                </AppText>
              </View>
            )}
          </View>
        </Card>
      </View>
    </Screen>
  );
}
