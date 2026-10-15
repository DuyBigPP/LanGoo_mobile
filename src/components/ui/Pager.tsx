import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { HIT_SLOP, useTheme } from "@/theme";
import { AppText } from "./Text";
import { Button } from "./Button";

export interface PagerProps {
  /** Trang hiện tại, tính từ 1. */
  page: number;
  pageCount?: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_PAGE_SIZES = [5, 10, 15, 20];

/** Thanh điều hướng trang: Trước/Sau + số trang + chọn số mục mỗi trang (dạng chip). */
export function Pager({
  page,
  pageCount,
  hasPrev,
  hasNext,
  loading = false,
  onPrev,
  onNext,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  testID,
  style,
}: PagerProps) {
  const t = useT();
  // useTheme chỉ để lấy màu icon lucide + spinner (giá trị JS truyền vào prop `color`)
  const theme = useTheme();

  const pageLabel = pageCount
    ? t("dict.pageOf", { page, total: pageCount })
    : t("dict.page", { page });

  return (
    <View className="gap-2" style={style} testID={testID}>
      <View className="flex-row items-center justify-between gap-2">
        <Button
          label={t("dict.pagePrev")}
          variant="outline"
          size="sm"
          icon={<ChevronLeft size={16} color={theme.colors.text} />}
          onPress={onPrev}
          disabled={!hasPrev || loading}
          testID={testID ? `${testID}-prev` : undefined}
        />
        <View className="flex-1 flex-row items-center justify-center gap-1">
          {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          <AppText variant="caption" color="muted">
            {pageLabel}
          </AppText>
        </View>
        <Button
          label={t("dict.pageNext")}
          variant="outline"
          size="sm"
          iconRight={<ChevronRight size={16} color={theme.colors.text} />}
          onPress={onNext}
          disabled={!hasNext || loading}
          testID={testID ? `${testID}-next` : undefined}
        />
      </View>

      {onPageSizeChange ? (
        <View className="flex-row flex-wrap items-center justify-center gap-2">
          <AppText variant="caption" color="muted">
            {t("common.itemsPerPage")}
          </AppText>
          <View className="flex-row items-center gap-1">
            {pageSizeOptions.map(size => {
              const selected = size === pageSize;
              return (
                <Pressable
                  key={size}
                  onPress={() => onPageSizeChange(size)}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={String(size)}
                  accessibilityState={{ selected }}
                  testID={testID ? `${testID}-size-${size}` : undefined}
                  className={cn(
                    "min-w-10 items-center justify-center rounded-full border px-2 py-[5px]",
                    selected ? "border-primary bg-primary" : "border-border",
                  )}
                >
                  <AppText
                    size="xs"
                    weight={selected ? "semibold" : "medium"}
                    color={selected ? "onPrimary" : "muted"}
                  >
                    {String(size)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
