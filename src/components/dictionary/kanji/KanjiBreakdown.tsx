import React from "react";
import { View } from "react-native";
import { AppText, Chip, SectionHeader } from "@/components/ui";
import { translate, useT } from "@/i18n";
import type { KanjiComponentDto, KanjiPartDto } from "@/types/dictionary";
import { KanjiGraph } from "./KanjiGraph";

/** Vị trí thành phần trong chữ — khớp mã backend với khoá dict.pos*. */
const POSITION_KEYS: Record<string, string> = {
  top: "dict.posTop",
  bottom: "dict.posBottom",
  left: "dict.posLeft",
  right: "dict.posRight",
  inside: "dict.posInside",
  outside: "dict.posOutside",
  center: "dict.posCenter",
  kamae: "dict.posEnclose",
};

function positionLabel(position: string | null): string | null {
  if (!position) return null;
  const key = POSITION_KEYS[position];
  return key ? translate(key) : position;
}

export interface KanjiBreakdownProps {
  literal: string;
  /** Cây thành phần KanjiVG (gốc = chữ đang xem). */
  tree: KanjiComponentDto | null;
  /** Fallback KRADFILE khi chưa có cây thành phần. */
  parts: KanjiPartDto[];
  radical: string | null;
  onOpenKanji: (char: string) => void;
}

/** Mục "Phân tích": đồ thị thành phần (như web Kanji graph) + danh sách chi tiết từng thành phần. */
export function KanjiBreakdown({ literal, tree, parts, radical, onOpenKanji }: KanjiBreakdownProps) {
  const t = useT();
  const components = tree?.children ?? [];
  const hasTree = components.length > 0;

  return (
    <View className="gap-2">
      <SectionHeader title={t("dict.breakdownTitle")} />
      {hasTree || radical ? (
        <>
          <AppText variant="caption">{t("dict.graphDesc")}</AppText>
          <KanjiGraph
            literal={literal}
            components={components}
            radical={radical}
            onOpenKanji={onOpenKanji}
          />
        </>
      ) : null}
      {hasTree ? (
        <View className="gap-3" testID="kanji-breakdown">
          {components.map((component, index) => (
            <BreakdownNode
              key={`${component.char}-${component.position ?? index}`}
              component={component}
            />
          ))}
        </View>
      ) : parts.length > 0 ? (
        <View className="gap-3" testID="kanji-breakdown">
          {parts.map((part, index) => (
            <PartNode key={`${part.char}-${index}`} part={part} />
          ))}
        </View>
      ) : (
        <AppText variant="caption">{t("dict.breakdownEmpty")}</AppText>
      )}
    </View>
  );
}

/** Ô chữ nhỏ có viền dùng chung cho node thành phần. */
function CharBox({ char }: { char: string }) {
  return (
    <View
      className="h-[40px] w-[40px] items-center justify-center rounded-sm border border-border bg-background"
    >
      <AppText size="lg" weight="semibold">
        {char}
      </AppText>
    </View>
  );
}

/** Một node trong cây thành phần chữ Hán (đệ quy theo `children`). */
function BreakdownNode({ component }: { component: KanjiComponentDto }) {
  const t = useT();
  const details = [
    positionLabel(component.position),
    component.original ? t("dict.breakdownOriginal", { char: component.original }) : null,
    component.stroke_count > 0 ? t("dict.strokes", { count: component.stroke_count }) : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <View testID={`kanji-component-${component.char}`} className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        <CharBox char={component.char} />
        <View className="flex-1">
          {component.name_vi || component.meaning_vi ? (
            <AppText variant="body" weight="medium" numberOfLines={1}>
              {component.name_vi ?? component.meaning_vi}
              {component.name_vi && component.meaning_vi ? ` · ${component.meaning_vi}` : ""}
            </AppText>
          ) : null}
          {details.length > 0 ? (
            <AppText variant="caption" numberOfLines={1}>
              {details.join(" · ")}
            </AppText>
          ) : null}
        </View>
        {component.is_radical ? <Chip>{t("dict.compRadical")}</Chip> : null}
        {component.is_phonetic ? <Chip>{t("dict.compPhonetic")}</Chip> : null}
      </View>
      {component.children.length > 0 ? (
        <View className="ml-4 gap-2 border-l-hairline border-border pl-3">
          {component.children.map((child, index) => (
            <BreakdownNode key={`${child.char}-${child.position ?? index}`} component={child} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Node fallback từ `parts` (KRADFILE) khi chưa có cây thành phần. */
function PartNode({ part }: { part: KanjiPartDto }) {
  const t = useT();
  return (
    <View className="flex-row flex-wrap items-center gap-2" testID={`kanji-part-${part.char}`}>
      <CharBox char={part.char} />
      <View className="flex-1">
        {part.name_vi || part.meaning_vi ? (
          <AppText variant="body" weight="medium" numberOfLines={1}>
            {part.name_vi ?? part.meaning_vi}
            {part.name_vi && part.meaning_vi ? ` · ${part.meaning_vi}` : ""}
          </AppText>
        ) : null}
        {part.radical_number != null ? (
          <AppText variant="caption">{`#${part.radical_number}`}</AppText>
        ) : null}
      </View>
      {part.is_radical ? <Chip>{t("dict.compRadical")}</Chip> : null}
    </View>
  );
}
