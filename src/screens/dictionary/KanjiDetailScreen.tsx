import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { KanjiDetailContent } from "@/components/dictionary/KanjiDetailContent";
import { Screen } from "@/components/ui";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";

type KanjiDetailScreenProps = NativeStackScreenProps<RootStackParamList, "KanjiDetail">;

/** Màn chi tiết chữ Hán — khung màn hình + nội dung dùng chung (KanjiDetailContent). */
export function KanjiDetailScreen({ navigation, route }: KanjiDetailScreenProps) {
  const t = useT();
  const { literal } = route.params;

  return (
    <Screen
      title={t("dict.kanjiDetailTitle")}
      onBack={() => navigation.goBack()}
      scroll
      testID="kanji-detail"
    >
      <KanjiDetailContent
        literal={literal}
        onSearchWords={() =>
          navigation.navigate("Tabs", { screen: "Dictionary", params: { q: literal } })
        }
      />
    </Screen>
  );
}
