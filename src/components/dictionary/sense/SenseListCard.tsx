import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react-native";
import { AppText, Card, Divider } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import type { SenseCardDto } from "@/types/dictionary";

/** Số nghĩa hiện trước khi thu gọn (như bản web). */
const PREVIEW_COUNT = 6;
/** Quá ngưỡng này mà chưa gộp nhóm -> thu gọn danh sách nghĩa (tránh từ 40-60 nghĩa đổ hết một lượt). */
const COLLAPSE_THRESHOLD = 10;

export interface SenseListCardProps {
  surface: string;
  senses: SenseCardDto[];
  activeSenseId: string | null;
  onSelect: (senseId: string) => void;
}

/**
 * Các nghĩa của từ — bấm để đổi nghĩa đang xem; quá 10 nghĩa thì thu gọn.
 * Gắn `key={lexemeId}` ở nơi dùng để tự đặt lại trạng thái thu gọn khi đổi từ.
 */
export function SenseListCard({ surface, senses, activeSenseId, onSelect }: SenseListCardProps) {
  const t = useT();
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = React.useState(false);

  const collapsible = senses.length > COLLAPSE_THRESHOLD;
  const visible = collapsible && !showAll ? senses.slice(0, PREVIEW_COUNT) : senses;

  return (
    <Card padded={false} testID="sense-list">
      <View style={styles.listHeader}>
        <AppText variant="label" color="muted">
          {t("dict.sensesOf", { surface })}
        </AppText>
      </View>
      {visible.map((sense, index) => (
        <SenseGroupItem
          key={sense.sense_id}
          sense={sense}
          activeSenseId={activeSenseId}
          expanded={Boolean(expandedGroups[sense.sense_id])}
          withDivider={index > 0}
          onToggle={() =>
            setExpandedGroups(previous => ({
              ...previous,
              [sense.sense_id]: !previous[sense.sense_id],
            }))
          }
          onSelect={onSelect}
        />
      ))}
      {collapsible ? (
        <Pressable
          onPress={() => setShowAll(value => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          testID="sense-show-more"
          className="active:opacity-85"
          style={styles.showMore}
        >
          {showAll ? (
            <ChevronUp size={14} color={theme.colors.primary} />
          ) : (
            <ChevronDown size={14} color={theme.colors.primary} />
          )}
          <AppText variant="caption" color="primary" weight="medium">
            {showAll
              ? t("dict.showFewerSenses")
              : t("dict.showMoreSenses", { count: senses.length - PREVIEW_COUNT })}
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** Một dòng nghĩa (dùng cho cả nghĩa cha lẫn nghĩa con). */
function SenseRow({
  sense,
  active,
  indent = false,
  onSelect,
}: {
  sense: SenseCardDto;
  active: boolean;
  indent?: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const title = sense.gloss_vi ?? sense.gloss_en ?? sense.lemma;
  const sub = sense.gloss_vi ? sense.gloss_en : null;

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      testID={`sense-row-${sense.sense_id}`}
      className="active:opacity-85"
      style={[
        styles.senseRow,
        indent ? styles.senseRowIndent : null,
        active ? { backgroundColor: theme.colors.primarySoft } : null,
      ]}
    >
      <AppText variant="caption" color={active ? "primary" : "muted"}>
        {sense.sense_no}
      </AppText>
      <View style={styles.flex}>
        <AppText
          variant={indent ? "caption" : "body"}
          weight={indent ? "regular" : "medium"}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {sub ? (
          <AppText variant="caption" numberOfLines={1}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

interface SenseGroupItemProps {
  sense: SenseCardDto;
  activeSenseId: string | null;
  expanded: boolean;
  withDivider: boolean;
  onToggle: () => void;
  onSelect: (senseId: string) => void;
}

/**
 * Nghĩa cha có thể kèm nhóm nghĩa con: hiện group_heading + nút "N nghĩa khác"
 * thu gọn; mở ra render từng nghĩa con (chọn được như nghĩa cha).
 */
function SenseGroupItem({
  sense,
  activeSenseId,
  expanded,
  withDivider,
  onToggle,
  onSelect,
}: SenseGroupItemProps) {
  const t = useT();
  const theme = useTheme();
  const children = sense.sub_senses ?? [];

  return (
    <View testID={`sense-item-${sense.sense_id}`}>
      {withDivider ? <Divider /> : null}
      <SenseRow
        sense={sense}
        active={activeSenseId === sense.sense_id}
        onSelect={() => onSelect(sense.sense_id)}
      />
      {children.length > 0 ? (
        <>
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            testID={`sense-group-toggle-${sense.sense_id}`}
            className="active:opacity-85"
            style={styles.groupToggle}
          >
            {expanded ? (
              <ChevronDown size={14} color={theme.colors.textMuted} />
            ) : (
              <ChevronRight size={14} color={theme.colors.textMuted} />
            )}
            <AppText variant="caption" numberOfLines={1} style={styles.flex}>
              {sense.group_heading ?? t("dict.senseGroup")}
            </AppText>
            <AppText variant="caption">{t("dict.subSenses", { count: children.length })}</AppText>
          </Pressable>
          {expanded ? (
            <View testID={`sense-group-list-${sense.sense_id}`}>
              {children.map(child => (
                <SenseRow
                  key={child.sense_id}
                  sense={child}
                  indent
                  active={activeSenseId === child.sense_id}
                  onSelect={() => onSelect(child.sense_id)}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  senseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  senseRowIndent: { paddingLeft: spacing.xxl },
  groupToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  showMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
