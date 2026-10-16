import { SegmentedControl } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n/messages/types";

const OPTIONS = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

/** Công tắc VI/EN nhỏ (như LanguageToggle bên web) — dùng ở màn auth và Hồ sơ. */
export function LanguageToggle({ testID = "language-toggle" }: { testID?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <SegmentedControl
      options={OPTIONS}
      value={locale}
      onChange={value => setLocale(value as Locale)}
      style={{ width: 112 }}
      testID={testID}
    />
  );
}
