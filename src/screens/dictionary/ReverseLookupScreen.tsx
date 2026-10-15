import * as React from "react";
import { Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowUpRight, Languages, X } from "lucide-react-native";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/components/ui";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { useReverseLookup } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme";
import type { ReverseJaHitDto } from "@/types/dictionary";

type ReverseLookupScreenProps = NativeStackScreenProps<RootStackParamList, "ReverseLookup">;

/** Thiếu khoá i18n (đã ghi trong báo cáo) — dùng tạm tiếng Việt như DictionaryScreen. */
const REVERSE_TITLE_KEY = "dict.reverseTitle";
const REVERSE_INTRO_KEY = "dict.reverseIntro";
const REVERSE_EXAMPLE_LABEL = "Thử ví dụ";
/** Ví dụ tra nhanh — nghĩa tiếng Việt phổ biến, bấm là tra luôn. */
const REVERSE_EXAMPLES = ["mèo", "nước", "ăn"];

/** Màn tra ngược: nhập nghĩa tiếng Việt -> danh sách từ tiếng Nhật tương ứng. */
export function ReverseLookupScreen({ navigation }: ReverseLookupScreenProps) {
  const t = useT();
  const theme = useTheme();
  const [input, setInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const reverse = useReverseLookup(query, query.length > 0);

  const hits = reverse.data?.ja ?? [];
  const empty = reverse.isSuccess && hits.length === 0;

  const handleSubmit = () => setQuery(input.trim());

  const handleClear = () => {
    setInput("");
    setQuery("");
  };

  /** Chip ví dụ: đổ vào ô nhập rồi tra luôn. */
  const handleExample = (word: string) => {
    setInput(word);
    setQuery(word);
  };

  return (
    <Screen
      title={t(REVERSE_TITLE_KEY)}
      onBack={() => navigation.goBack()}
      scroll
      testID="reverse-screen"
    >
      <View className="gap-4">
        {/* Ô nhập nghĩa tiếng Việt + nút tra */}
        <Card>
          <View className="gap-3">
            <Input
              value={input}
              onChangeText={setInput}
              placeholder={t("dict.searchPlaceholderVi")}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
              rightSlot={
                input ? (
                  <IconButton
                    icon={<X size={18} color={theme.colors.textMuted} />}
                    onPress={handleClear}
                    accessibilityLabel={t("dict.searchClear")}
                    size="sm"
                  />
                ) : undefined
              }
              testID="reverse-input"
            />
            <Button
              label={t("dict.searchSubmit")}
              onPress={handleSubmit}
              disabled={!input.trim()}
              fullWidth
              testID="reverse-submit"
            />
          </View>
        </Card>

        {query.length === 0 ? (
          /* Chưa tra gì: giải thích mục đích màn + ví dụ bấm được */
          <Card testID="reverse-empty">
            <View className="items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
                <Languages size={26} color={theme.colors.primary} />
              </View>
              <AppText variant="subtitle" center>
                {t("dict.emptyTitle")}
              </AppText>
              <AppText variant="caption" center className="max-w-[320px]">
                {t(REVERSE_INTRO_KEY)}
              </AppText>
              <ExampleChips onPick={handleExample} />
            </View>
          </Card>
        ) : reverse.isPending ? (
          <Card testID="reverse-loading">
            <View className="gap-3">
              {[0, 1, 2].map(index => (
                <View key={index} className="gap-2 py-1">
                  <Skeleton height={18} width="40%" />
                  <Skeleton height={12} width="65%" />
                </View>
              ))}
            </View>
          </Card>
        ) : reverse.isError ? (
          <Card>
            <View className="items-center gap-3">
              <AppText variant="caption" center>
                {t("dict.loadError")}
              </AppText>
              <Button
                label={t("common.retry")}
                variant="outline"
                size="sm"
                onPress={() => void reverse.refetch()}
              />
            </View>
          </Card>
        ) : empty ? (
          <Card testID="reverse-no-results">
            <View className="items-center gap-3">
              <AppText variant="caption" center>
                {t("dict.reverseEmpty", { query })}
              </AppText>
              <ExampleChips onPick={handleExample} />
            </View>
          </Card>
        ) : (
          <View className="gap-2">
            <SectionHeader title={t("dict.reverseJa")} count={hits.length} />
            <View className="gap-3">
              {hits.map((hit, index) => (
                <ReverseJaRow
                  key={`${hit.text}-${index}`}
                  hit={hit}
                  index={index}
                  onPress={() =>
                    navigation.navigate("Tabs", { screen: "Dictionary", params: { q: hit.text } })
                  }
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

interface ExampleChipsProps {
  onPick: (word: string) => void;
}

/** Hàng chip ví dụ — bấm để tra ngay, giúp màn tự giải thích được cách dùng. */
function ExampleChips({ onPick }: ExampleChipsProps) {
  return (
    <View className="gap-2">
      <AppText variant="caption" center>
        {REVERSE_EXAMPLE_LABEL}
      </AppText>
      <View className="flex-row flex-wrap justify-center gap-2">
        {REVERSE_EXAMPLES.map(word => (
          <Pressable
            key={word}
            onPress={() => onPick(word)}
            accessibilityRole="button"
            accessibilityLabel={word}
            className="active:opacity-70"
            testID={`reverse-example-${word}`}
          >
            <Chip>
              <AppText size="sm" weight="medium" color="primary">
                {word}
              </AppText>
            </Chip>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface ReverseJaRowProps {
  hit: ReverseJaHitDto;
  index: number;
  onPress: () => void;
}

/** Một từ tiếng Nhật tra được — bấm để mở lại tab Từ điển với từ đó (kèm cách đọc ở đó). */
function ReverseJaRow({ hit, index, onPress }: ReverseJaRowProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${hit.text}, ${t("dict.detailTitle")}`}
      testID={`reverse-ja-${index}`}
    >
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <AppText size="lg" weight="semibold" numberOfLines={1} className="flex-1">
            {hit.text}
          </AppText>
          {hit.exact_sense ? (
            <View className="self-center">
              <Badge tone="success">{t("dict.reverseExact")}</Badge>
            </View>
          ) : null}
          <SpeakButton text={hit.text} lang="ja" size="sm" testID={`reverse-speak-${index}`} />
          <ArrowUpRight size={14} color={theme.colors.textMuted} />
        </View>
        {hit.via_lemma ? (
          <AppText variant="caption">{t("dict.reverseVia", { lemma: hit.via_lemma })}</AppText>
        ) : null}
        {hit.sense_hint ? (
          <AppText variant="caption" color="muted">
            {hit.sense_hint}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
